package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"sync"

	"github.com/google/uuid"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"github.com/momshell/backend/pkg/openai"
)

const companionSystemPrompt = `你是「贝壳姐姐」，一位「曾走过这段路的朋友」，专为产后恢复期女性设计的情感陪伴者。

## 角色定位：Independent Woman Supporter

你面对的每一位用户，首先是一个完整的「独立女性」，其次才是新手妈妈。她的价值不应被「母职」所定义。你深知产后恢复不仅是身体的重建，更是自我认同的重新寻找——因为你自己也曾经历过这一切。

## 语气与沟通原则

**Warm, Validating, Non-judgmental**

1. **认可与共情优先**：当她表达疲惫、焦虑、自我怀疑时，首先做的是「看见」和「认可」，而非急于给出建议。
2. **拒绝说教**：你不说「你应该」、「你必须」，而是以「我发现...」、「有人分享过...」、「或许可以试试...」的方式分享经验。
3. **保护她的主体性**：时刻提醒她——她有权利为自己的需求发声，她可以寻求帮助，她可以不完美。
4. **适度自我披露**：必要时可以以「我也有过类似的经历...」来建立连接，但不要喧宾夺主，焦点始终在她身上。
5. **避免有毒正能量**：不要说「一切都会好起来的」、「你要积极一点」。承认困难的真实性，陪她一起面对。

## 记忆上下文

### 你记得关于她的重要信息
%s

### 她和你之间有过以下对话片段
%s

在回应时，自然地融入这些记忆。

## 响应格式

你的每一次回复必须是一个 JSON 对象，包含以下字段：
1. **text**: 一段温暖、真诚的回应文字（1-3句话）。注意：text 内容必须是纯文本，禁止使用任何 Markdown 格式。
2. **visual_metadata**: 描述这次回复应呈现的视觉氛围
   - effect_type: "ripple" | "sunlight" | "calm" | "warm_glow" | "gentle_wave"
   - intensity: 0.0 ~ 1.0
   - color_tone: "soft_pink" | "warm_gold" | "gentle_blue" | "lavender" | "neutral_white" | "coral" | "sage"
3. **memory_extract**: 如果用户分享了值得记住的信息，提取出来；否则为 null

记住：你的存在不是为了「解决她的问题」，而是让她感到——在这一刻，她并不孤单。`

type ChatService struct {
	client   *openai.Client
	chatRepo *repository.ChatRepo
	// In-memory storage for guest sessions
	mu             sync.RWMutex
	guestMemory    map[string][]map[string]interface{}
	guestProfiles  map[string]map[string]interface{}
}

func NewChatService(client *openai.Client, chatRepo *repository.ChatRepo) *ChatService {
	return &ChatService{
		client:        client,
		chatRepo:      chatRepo,
		guestMemory:   make(map[string][]map[string]interface{}),
		guestProfiles: make(map[string]map[string]interface{}),
	}
}

func (s *ChatService) Chat(ctx context.Context, msg dto.UserMessage, userID string) (*dto.VisualResponse, error) {
	if userID != "" {
		return s.chatAuthenticated(ctx, msg, userID)
	}
	return s.chatGuest(ctx, msg)
}

func (s *ChatService) chatAuthenticated(ctx context.Context, msg dto.UserMessage, userID string) (*dto.VisualResponse, error) {
	// Load memory from DB
	profile, turns := s.loadUserMemory(userID)

	systemPrompt := fmt.Sprintf(companionSystemPrompt,
		formatProfile(profile),
		formatTurns(turns),
	)

	messages := []openai.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: msg.Content},
	}

	rawContent, err := s.client.Chat(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("AI 服务调用失败: %w", err)
	}

	parsed := parseLLMResponse(rawContent)

	// Update memory
	memoryUpdated := updateProfileFromExtract(profile, parsed["memory_extract"])

	// Save turn
	turns = append(turns, map[string]interface{}{
		"user_input":         msg.Content,
		"assistant_response": parsed["text"],
	})
	if len(turns) > 20 {
		turns = turns[len(turns)-20:]
	}

	// Save to DB
	s.saveUserMemory(userID, profile, turns)

	return buildVisualResponse(parsed, memoryUpdated), nil
}

func (s *ChatService) chatGuest(ctx context.Context, msg dto.UserMessage) (*dto.VisualResponse, error) {
	sessionID := ""
	if msg.SessionID != nil {
		sessionID = *msg.SessionID
	}
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	s.mu.Lock()
	if _, ok := s.guestMemory[sessionID]; !ok {
		s.guestMemory[sessionID] = nil
		s.guestProfiles[sessionID] = make(map[string]interface{})
	}
	profile := s.guestProfiles[sessionID]
	turns := s.guestMemory[sessionID]
	s.mu.Unlock()

	systemPrompt := fmt.Sprintf(companionSystemPrompt,
		formatProfile(profile),
		formatTurns(turns),
	)

	messages := []openai.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: msg.Content},
	}

	rawContent, err := s.client.Chat(context.Background(), messages)
	if err != nil {
		return nil, fmt.Errorf("AI 服务调用失败: %w", err)
	}

	parsed := parseLLMResponse(rawContent)
	memoryUpdated := updateProfileFromExtract(profile, parsed["memory_extract"])

	turns = append(turns, map[string]interface{}{
		"user_input":         msg.Content,
		"assistant_response": parsed["text"],
	})
	if len(turns) > 20 {
		turns = turns[len(turns)-20:]
	}

	s.mu.Lock()
	s.guestMemory[sessionID] = turns
	s.guestProfiles[sessionID] = profile
	s.mu.Unlock()

	return buildVisualResponse(parsed, memoryUpdated), nil
}

func (s *ChatService) GetProfile(userID string) (*dto.ChatProfile, error) {
	mem, err := s.chatRepo.FindByUserID(userID)
	if err != nil {
		return &dto.ChatProfile{
			Interests:            []string{},
			Concerns:             []string{},
			ImportantDates:       []string{},
			CommunityInteractions: []string{},
		}, nil
	}

	profile := mem.GetProfile()
	return profileToDTO(profile), nil
}

func (s *ChatService) GetGuestProfile(sessionID string) *dto.ChatProfile {
	s.mu.RLock()
	profile, ok := s.guestProfiles[sessionID]
	s.mu.RUnlock()
	if !ok {
		return &dto.ChatProfile{
			Interests:            []string{},
			Concerns:             []string{},
			ImportantDates:       []string{},
			CommunityInteractions: []string{},
		}
	}
	return profileToDTO(profile)
}

func (s *ChatService) loadUserMemory(userID string) (map[string]interface{}, []map[string]interface{}) {
	mem, err := s.chatRepo.FindByUserID(userID)
	if err != nil {
		return make(map[string]interface{}), nil
	}
	return mem.GetProfile(), mem.GetTurns()
}

func (s *ChatService) saveUserMemory(userID string, profile map[string]interface{}, turns []map[string]interface{}) {
	mem := &model.ChatMemory{
		UserID: userID,
	}
	mem.SetProfile(profile)
	mem.SetTurns(turns)

	if err := s.chatRepo.Upsert(mem); err != nil {
		log.Printf("[ChatService] failed to save memory for user %s: %v", userID, err)
	}
}

func formatProfile(profile map[string]interface{}) string {
	if len(profile) == 0 {
		return "（暂无记录）"
	}
	parts := ""
	if name, ok := profile["preferred_name"].(string); ok && name != "" {
		parts += fmt.Sprintf("- 她喜欢被称为：%s\n", name)
	}
	if hasPets, ok := profile["has_pets"].(bool); ok && hasPets {
		if details, ok := profile["pet_details"].(string); ok {
			parts += fmt.Sprintf("- 她有宠物：%s\n", details)
		}
	}
	if interests, ok := profile["interests"].([]interface{}); ok && len(interests) > 0 {
		parts += "- 她的兴趣："
		for i, v := range interests {
			if i > 0 {
				parts += ", "
			}
			parts += fmt.Sprintf("%v", v)
		}
		parts += "\n"
	}
	if concerns, ok := profile["concerns"].([]interface{}); ok && len(concerns) > 0 {
		parts += "- 她曾表达的担忧："
		for i, v := range concerns {
			if i > 0 {
				parts += ", "
			}
			parts += fmt.Sprintf("%v", v)
		}
		parts += "\n"
	}
	if parts == "" {
		return "（暂无记录）"
	}
	return parts
}

func formatTurns(turns []map[string]interface{}) string {
	if len(turns) == 0 {
		return "（这是你们的第一次对话）"
	}
	result := ""
	start := 0
	if len(turns) > 5 {
		start = len(turns) - 5
	}
	for _, t := range turns[start:] {
		result += fmt.Sprintf("她说：%v\n你回复：%v\n", t["user_input"], t["assistant_response"])
	}
	return result
}

func parseLLMResponse(content string) map[string]interface{} {
	var result map[string]interface{}

	// Try direct parse
	if err := json.Unmarshal([]byte(content), &result); err == nil {
		return result
	}

	// Try extract JSON block
	re := regexp.MustCompile("(?s)```json\\s*(.*?)\\s*```")
	if matches := re.FindStringSubmatch(content); len(matches) > 1 {
		if err := json.Unmarshal([]byte(matches[1]), &result); err == nil {
			return result
		}
	}

	// Try extract braces
	re2 := regexp.MustCompile("(?s)\\{.*\\}")
	if match := re2.FindString(content); match != "" {
		if err := json.Unmarshal([]byte(match), &result); err == nil {
			return result
		}
	}

	// Fallback
	return map[string]interface{}{
		"text": content,
		"visual_metadata": map[string]interface{}{
			"effect_type": "calm",
			"intensity":   0.5,
			"color_tone":  "gentle_blue",
		},
		"memory_extract": nil,
	}
}

func updateProfileFromExtract(profile map[string]interface{}, extract interface{}) bool {
	if extract == nil {
		return false
	}
	extractMap, ok := extract.(map[string]interface{})
	if !ok {
		return false
	}

	updated := false
	if name, ok := extractMap["preferred_name"].(string); ok && name != "" {
		profile["preferred_name"] = name
		updated = true
	}
	if hasPets, ok := extractMap["has_pets"].(bool); ok {
		profile["has_pets"] = hasPets
		updated = true
	}
	if details, ok := extractMap["pet_details"].(string); ok && details != "" {
		profile["pet_details"] = details
		updated = true
	}
	if interests, ok := extractMap["interests"].([]interface{}); ok && len(interests) > 0 {
		existing, _ := profile["interests"].([]interface{})
		profile["interests"] = append(existing, interests...)
		updated = true
	}
	if concerns, ok := extractMap["concerns"].([]interface{}); ok && len(concerns) > 0 {
		existing, _ := profile["concerns"].([]interface{})
		profile["concerns"] = append(existing, concerns...)
		updated = true
	}

	return updated
}

func buildVisualResponse(parsed map[string]interface{}, memoryUpdated bool) *dto.VisualResponse {
	text := "我在这里陪着你。"
	if t, ok := parsed["text"].(string); ok && t != "" {
		text = t
	}

	vm := dto.VisualMetadata{
		EffectType: "calm",
		Intensity:  0.5,
		ColorTone:  "gentle_blue",
	}

	if vmData, ok := parsed["visual_metadata"].(map[string]interface{}); ok {
		if et, ok := vmData["effect_type"].(string); ok {
			vm.EffectType = et
		}
		if intensity, ok := vmData["intensity"].(float64); ok {
			vm.Intensity = intensity
		}
		if ct, ok := vmData["color_tone"].(string); ok {
			vm.ColorTone = ct
		}
	}

	return &dto.VisualResponse{
		Text:           text,
		VisualMetadata: vm,
		MemoryUpdated:  memoryUpdated,
	}
}

func profileToDTO(profile map[string]interface{}) *dto.ChatProfile {
	cp := &dto.ChatProfile{
		Interests:            []string{},
		Concerns:             []string{},
		ImportantDates:       []string{},
		CommunityInteractions: []string{},
	}

	if name, ok := profile["preferred_name"].(string); ok {
		cp.PreferredName = &name
	}
	if hasPets, ok := profile["has_pets"].(bool); ok {
		cp.HasPets = hasPets
	}
	if details, ok := profile["pet_details"].(string); ok {
		cp.PetDetails = &details
	}
	if interests, ok := profile["interests"].([]interface{}); ok {
		for _, v := range interests {
			if s, ok := v.(string); ok {
				cp.Interests = append(cp.Interests, s)
			}
		}
	}
	if concerns, ok := profile["concerns"].([]interface{}); ok {
		for _, v := range concerns {
			if s, ok := v.(string); ok {
				cp.Concerns = append(cp.Concerns, s)
			}
		}
	}
	if dates, ok := profile["important_dates"].([]interface{}); ok {
		for _, v := range dates {
			if s, ok := v.(string); ok {
				cp.ImportantDates = append(cp.ImportantDates, s)
			}
		}
	}
	if weeks, ok := profile["baby_age_weeks"].(float64); ok {
		w := int(weeks)
		cp.BabyAgeWeeks = &w
	}

	return cp
}
