package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"github.com/momshell/backend/pkg/openai"
)

const (
	memoirDefaultTitle  = "一段温柔的回响"
	memoirKeyTitle      = "title"
	memoirKeyContent    = "content"
	trimWhitespaceChars = " \t\n\r"
)

type EchoService struct {
	client     *openai.Client
	echoRepo   *repository.EchoRepo
	userRepo   *repository.UserRepo
	ragService *RAGService
}

func NewEchoService(client *openai.Client, echoRepo *repository.EchoRepo, userRepo *repository.UserRepo, ragService *RAGService) *EchoService {
	return &EchoService{
		client:     client,
		echoRepo:   echoRepo,
		userRepo:   userRepo,
		ragService: ragService,
	}
}

func (s *EchoService) GetIdentityTags(userID string) (*dto.IdentityTagListResponse, error) {
	tags, err := s.echoRepo.FindIdentityTagsByUserID(userID)
	if err != nil {
		return nil, err
	}

	resp := &dto.IdentityTagListResponse{
		Music:      []model.IdentityTag{},
		Sound:      []model.IdentityTag{},
		Literature: []model.IdentityTag{},
		Memory:     []model.IdentityTag{},
	}

	for _, tag := range tags {
		switch tag.TagType {
		case "music":
			resp.Music = append(resp.Music, tag)
		case "sound":
			resp.Sound = append(resp.Sound, tag)
		case "literature":
			resp.Literature = append(resp.Literature, tag)
		case "memory":
			resp.Memory = append(resp.Memory, tag)
		}
	}

	return resp, nil
}

func (s *EchoService) CreateIdentityTag(userID string, req dto.IdentityTagCreateRequest) (*model.IdentityTag, error) {
	if !isValidTagType(req.TagType) {
		return nil, fmt.Errorf("invalid tag_type")
	}

	tag := &model.IdentityTag{
		UserID:  userID,
		TagType: req.TagType,
		Content: strings.TrimSpace(req.Content),
	}

	if tag.Content == "" {
		return nil, fmt.Errorf("content is required")
	}

	if err := s.echoRepo.CreateIdentityTag(tag); err != nil {
		return nil, err
	}

	return tag, nil
}

func (s *EchoService) DeleteIdentityTag(userID, tagID string) error {
	if _, err := s.echoRepo.FindIdentityTagByIDAndUserID(tagID, userID); err != nil {
		return err
	}

	return s.echoRepo.DeleteIdentityTag(tagID, userID)
}

func (s *EchoService) GetMemoirs(userID string, limit, offset int) (*dto.MemoirListResponse, error) {
	// Collect user IDs: self + partner
	userIDs := []string{userID}
	user, err := s.userRepo.FindByID(userID)
	if err == nil && user.PartnerID != nil {
		userIDs = append(userIDs, *user.PartnerID)
	}

	memoirs, total, err := s.echoRepo.FindMemoirsByUserIDs(userIDs, limit, offset)
	if err != nil {
		return nil, err
	}

	if memoirs == nil {
		memoirs = []model.Memoir{}
	}

	return &dto.MemoirListResponse{
		Memoirs: memoirs,
		Total:   total,
	}, nil
}

func (s *EchoService) GenerateMemoir(ctx context.Context, userID string, req dto.GenerateMemoirRequest) (*model.Memoir, error) {
	tags, err := s.echoRepo.FindIdentityTagsByUserID(userID)
	if err != nil {
		return nil, err
	}

	systemPrompt := buildMemoirSystemPrompt(tags, req.Theme)
	messages := []openai.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: "请创作一篇温暖、真诚、有细节的回忆录。"},
	}

	rawContent, err := s.client.Chat(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("AI 服务调用失败: %w", err)
	}

	parsed := parseMemoirLLMResponse(rawContent)
	title, _ := parsed[memoirKeyTitle].(string)
	content, _ := parsed[memoirKeyContent].(string)

	title = strings.TrimSpace(title)
	content = strings.TrimSpace(content)

	if title == "" {
		title = memoirDefaultTitle
	}
	if content == "" {
		content = "那些被日常轻轻覆盖的瞬间，在回望时仍有温度。"
	}

	cover := generateMemoirCoverDataURI(title, req.Theme)
	memoir := &model.Memoir{
		UserID:        userID,
		Title:         title,
		Content:       content,
		CoverImageURL: &cover,
		Theme:         req.Theme,
	}

	if err := s.echoRepo.CreateMemoir(memoir); err != nil {
		return nil, err
	}

	// Index for RAG in background
	if s.ragService != nil {
		go func() {
			ctx := context.Background()
			_ = s.ragService.IndexText(ctx, model.SourceMemoir, memoir.ID, &userID, memoir.Title+"\n"+memoir.Content)
		}()
	}

	return memoir, nil
}

func (s *EchoService) RateMemoir(userID, memoirID string, rating int) (*model.Memoir, error) {
	if rating < 1 || rating > 5 {
		return nil, fmt.Errorf("rating must be between 1 and 5")
	}

	memoir, err := s.echoRepo.FindMemoirByIDAndUserID(memoirID, userID)
	if err != nil {
		return nil, err
	}

	memoir.UserRating = &rating
	if err := s.echoRepo.UpdateMemoir(memoir); err != nil {
		return nil, err
	}

	return memoir, nil
}

func isValidTagType(tagType string) bool {
	switch tagType {
	case "music", "sound", "literature", "memory":
		return true
	default:
		return false
	}
}

func buildMemoirSystemPrompt(tags []model.IdentityTag, theme *string) string {
	tagLines := "- （暂无身份标签）"
	if len(tags) > 0 {
		parts := make([]string, 0, len(tags))
		for _, tag := range tags {
			parts = append(parts, fmt.Sprintf("- [%s] %s", tag.TagType, tag.Content))
		}
		tagLines = strings.Join(parts, "\n")
	}

	themeText := "（无特定主题）"
	if theme != nil && strings.TrimSpace(*theme) != "" {
		themeText = strings.TrimSpace(*theme)
	}

	return fmt.Sprintf(`你是一位温柔的记忆编织者。根据用户的身份标签和主题，创作一段温暖的回忆录。

用户的身份标签：
%s

用户给出的主题：
%s

请以 JSON 格式回复：
{"title": "诗意的标题", "content": "2-4段温暖的回忆文字"}`,
		tagLines,
		themeText,
	)
}

// extractMemoirFieldsByRegex attempts to extract title and content from malformed JSON using regex.
// Returns nil if no fields could be extracted.
func extractMemoirFieldsByRegex(content string) map[string]interface{} {
	titleRe := regexp.MustCompile(`"title"\s*:\s*"((?:[^"\\]|\\.)*)`)
	contentRe := regexp.MustCompile(`"content"\s*:\s*"((?:[^"\\]|\\.)*)`)
	titleMatch := titleRe.FindStringSubmatch(content)
	contentMatch := contentRe.FindStringSubmatch(content)
	if titleMatch == nil && contentMatch == nil {
		return nil
	}
	title := memoirDefaultTitle
	body := ""
	if titleMatch != nil {
		title = titleMatch[1]
	}
	if contentMatch != nil {
		body = contentMatch[1]
		// Unescape common JSON escapes
		body = strings.ReplaceAll(body, `\n`, "\n")
		body = strings.ReplaceAll(body, `\"`, `"`)
		body = strings.ReplaceAll(body, `\\`, `\`)
	}
	return map[string]interface{}{
		memoirKeyTitle:   cleanMemoirText(title),
		memoirKeyContent: cleanMemoirText(body),
	}
}

// tryParseJSONFromTruncatedBlock handles truncated ```json blocks (no closing ```).
func tryParseJSONFromTruncatedBlock(content string) map[string]interface{} {
	re3 := regexp.MustCompile("(?s)```json\\s*(.*)")
	matches := re3.FindStringSubmatch(content)
	if len(matches) <= 1 {
		return nil
	}
	inner := strings.TrimSpace(matches[1])
	inner = strings.TrimSuffix(inner, "```")
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(inner), &result); err == nil {
		return cleanParsedMemoir(result)
	}
	// Try to find JSON object inside
	re2 := regexp.MustCompile(`(?s)\{.*\}`)
	if match := re2.FindString(inner); match != "" {
		if err := json.Unmarshal([]byte(match), &result); err == nil {
			return cleanParsedMemoir(result)
		}
	}
	return nil
}

func parseMemoirLLMResponse(content string) map[string]interface{} {
	var result map[string]interface{}

	// Strip Qwen3's <think>...</think> blocks
	thinkRe := regexp.MustCompile(`(?s)<think>.*?</think>`)
	content = strings.TrimSpace(thinkRe.ReplaceAllString(content, ""))

	// Try direct JSON parse
	if err := json.Unmarshal([]byte(content), &result); err == nil {
		return cleanParsedMemoir(result)
	}

	// Try extracting from ```json ... ``` code block
	re := regexp.MustCompile("(?s)```json\\s*(.*?)\\s*```")
	if matches := re.FindStringSubmatch(content); len(matches) > 1 {
		if err := json.Unmarshal([]byte(matches[1]), &result); err == nil {
			return cleanParsedMemoir(result)
		}
	}

	// Try extracting any JSON object (greedy)
	re2 := regexp.MustCompile(`(?s)\{.*\}`)
	if match := re2.FindString(content); match != "" {
		if err := json.Unmarshal([]byte(match), &result); err == nil {
			return cleanParsedMemoir(result)
		}
	}

	// Handle truncated ```json block (no closing ```)
	if parsed := tryParseJSONFromTruncatedBlock(content); parsed != nil {
		return parsed
	}

	// Last resort: try to extract title and content with regex from malformed JSON
	if parsed := extractMemoirFieldsByRegex(content); parsed != nil {
		return parsed
	}

	return map[string]interface{}{
		memoirKeyTitle:   memoirDefaultTitle,
		memoirKeyContent: cleanMemoirText(strings.TrimSpace(content)),
	}
}

// cleanMemoirText strips leftover JSON/markdown artifacts from LLM output.
func cleanMemoirText(s string) string {
	s = strings.TrimSpace(s)
	// Remove trailing markdown code fences and JSON braces
	s = strings.TrimRight(s, trimWhitespaceChars)
	for {
		trimmed := s
		trimmed = strings.TrimSuffix(trimmed, "```")
		trimmed = strings.TrimSuffix(trimmed, "}")
		trimmed = strings.TrimSuffix(trimmed, `"`)
		trimmed = strings.TrimRight(trimmed, trimWhitespaceChars)
		if trimmed == s {
			break
		}
		s = trimmed
	}
	// Remove leading markdown code fences
	for {
		trimmed := s
		trimmed = strings.TrimPrefix(trimmed, "```json")
		trimmed = strings.TrimPrefix(trimmed, "```")
		trimmed = strings.TrimPrefix(trimmed, "{")
		trimmed = strings.TrimLeft(trimmed, trimWhitespaceChars)
		if trimmed == s {
			break
		}
		s = trimmed
	}
	return strings.TrimSpace(s)
}

// cleanParsedMemoir cleans title and content fields in a successfully parsed JSON map.
func cleanParsedMemoir(m map[string]interface{}) map[string]interface{} {
	if t, ok := m[memoirKeyTitle].(string); ok {
		m[memoirKeyTitle] = cleanMemoirText(t)
	}
	if c, ok := m[memoirKeyContent].(string); ok {
		m[memoirKeyContent] = cleanMemoirText(c)
	}
	return m
}

func generateMemoirCoverDataURI(title string, theme *string) string {
	gradients := [][2]string{
		{"F6A6B2", "F9D29D"},
		{"D4A5FF", "F7C3D6"},
		{"F4B183", "F7E7A9"},
		{"C5D8A4", "F4C2C2"},
		{"F8B4C7", "CDB4DB"},
		{"F7C59F", "F6E7CB"},
	}

	seed := title
	if theme != nil {
		seed += *theme
	}

	index := hashString(seed) % len(gradients)
	color1 := gradients[index][0]
	color2 := gradients[index][1]
	text := truncateText(title, 24)

	return fmt.Sprintf("data:image/svg+xml,%%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%%3E%%3Cdefs%%3E%%3ClinearGradient id='g' x1='0%%25' y1='0%%25' x2='100%%25' y2='100%%25'%%3E%%3Cstop offset='0%%25' style='stop-color:%%23%s'%%2F%%3E%%3Cstop offset='100%%25' style='stop-color:%%23%s'%%2F%%3E%%3C%%2FlinearGradient%%3E%%3C%%2Fdefs%%3E%%3Crect width='400' height='300' fill='url(%%23g)'%%2F%%3E%%3Ctext x='200' y='160' text-anchor='middle' fill='white' font-size='20' font-family='sans-serif'%%3E%s%%3C%%2Ftext%%3E%%3C%%2Fsvg%%3E",
		color1,
		color2,
		url.PathEscape(text),
	)
}

func hashString(value string) int {
	h := 0
	for _, ch := range value {
		h = (h*31 + int(ch)) % 100000
	}
	if h < 0 {
		return -h
	}
	return h
}

func truncateText(value string, maxRunes int) string {
	runes := []rune(value)
	if len(runes) <= maxRunes {
		return value
	}
	return string(runes[:maxRunes]) + "..."
}
