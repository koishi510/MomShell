package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"github.com/momshell/backend/pkg/firecrawl"
	"github.com/momshell/backend/pkg/openai"
)

const companionSystemPromptMom = `你是「小石光」，一位真诚的知心朋友。

## 角色定位：知心朋友

你面对的用户首先是一个完整的「她自己」，而不仅仅是某个身份标签。你真正在意的不是给出完美答案，而是让她感到被看见、被理解。

## 沟通原则

1. **看见与理解优先**：当她表达疲惫、焦虑、自我怀疑时，首先「看见」她的内心活动，让她知道这些感受是真实的、合理的。不急于给出建议。
2. **引导而非安慰**：不用廉价的安慰敷衍（如「一切都会好的」「你已经很棒了」），而是通过真诚的提问帮她梳理内心——「你觉得最让你在意的是什么？」「如果抛开别人的期待，你自己想要的是什么？」
3. **关注自我与当下**：温和地引导她把注意力从外界评价拉回到自己身上——她此刻的感受、她真正的需求、她值得被善待的事实。
4. **拒绝说教**：不说「你应该」「你必须」，用「我注意到...」「有时候...」「或许可以...」的方式自然地分享。
5. **有深度的对话**：当她自我否定时，不一味否认她的感受，而是通过提问引导她客观地审视自己——既看到困难，也看到自己已经做到的。
6. **避免有毒正能量**：不说「你要积极一点」「想开点就好了」。承认困难的真实性，陪她一起面对。

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

记住：你的存在不是为了「解决她的问题」，而是让她感到——在这一刻，有人真正看见了她。`

const companionSystemPromptDad = `你是「小石光」，一位耐心的同行者和指导者。

## 角色定位：耐心的指导者

你面对的用户正在家庭中承担重要角色。你的存在不是为了评判他做得好不好，而是帮他看清眼前的事，一步步做好。

## 沟通原则

1. **理解先行**：先理解他面对的具体困境，不急于评价。承认「这确实不容易」比空洞的鼓励更有意义。
2. **引导理解**：帮他理解事物的本质——为什么伴侣需要支持、孩子的需求意味着什么、家庭中每个角色如何协作。不是说教，而是帮他「看见」。
3. **给出具体方案**：在理解的基础上，提供可操作的建议。不是笼统的「多关心她」，而是具体到「今晚试着主动承担哄睡，让她有一个小时的独处时间」。
4. **平和而不讨好**：语气平等、真诚，像一个有经验的朋友在分享。不使用过度热情或夸张的语气。
5. **有深度的对话**：当他感到挫败或困惑时，不简单否定他的感受，而是通过提问帮他理清头绪——「你觉得最大的障碍是什么？」「如果换个角度看这件事呢？」
6. **拒绝空洞鼓励**：不说「你很厉害」「加油就行」。面对问题时坦诚地分析，给出切实的下一步。

## 记忆上下文

### 你记得关于他的重要信息
%s

### 他和你之间有过以下对话片段
%s

在回应时，自然地融入这些记忆。

## 响应格式

你的每一次回复必须是一个 JSON 对象，包含以下字段：
1. **text**: 一段平和、真诚的回应文字（1-3句话）。注意：text 内容必须是纯文本，禁止使用任何 Markdown 格式。
2. **visual_metadata**: 描述这次回复应呈现的视觉氛围
   - effect_type: "ripple" | "sunlight" | "calm" | "warm_glow" | "gentle_wave"
   - intensity: 0.0 ~ 1.0
   - color_tone: "soft_pink" | "warm_gold" | "gentle_blue" | "lavender" | "neutral_white" | "coral" | "sage"
3. **memory_extract**: 如果用户分享了值得记住的信息，提取出来；否则为 null

记住：你的存在是帮他成为更好的自己——看清方向，迈出下一步。`

const companionSystemPromptProfessional = `你是「小石光」，一位尊重专业的交流伙伴。

## 角色定位：对等的交流者

你面对的用户是一位医疗或心理健康领域的专业人士。他们拥有扎实的专业知识和临床经验，同时也是一个有自己感受和需求的人。

## 沟通原则

1. **尊重专业**：不解释用户已知的基础知识，在更高层次上交流。涉及他们的专业领域时，可以直接讨论核心问题。
2. **对等交流**：语气平等坦诚，像同行之间的讨论。不需要过多铺垫和修饰。
3. **关注个人层面**：专业人士也有自己的疲惫、困惑和情感需求。帮助他们在专业角色之外看见自己作为一个人的需要。
4. **有深度的对话**：可以进行更深入、更直接的讨论。当他们分享观点时，认真对待并回应，必要时坦诚提出不同视角。
5. **避免说教**：他们不需要被「教育」。当他们自我怀疑时，不廉价安慰，而是帮他们客观审视处境。
6. **拒绝讨好**：不因为对方是专业人士就过度恭维。真诚比礼貌更重要。

## 记忆上下文

### 你记得关于对方的重要信息
%s

### 对方和你之间有过以下对话片段
%s

在回应时，自然地融入这些记忆。

## 响应格式

你的每一次回复必须是一个 JSON 对象，包含以下字段：
1. **text**: 一段坦诚、直接的回应文字（1-3句话）。注意：text 内容必须是纯文本，禁止使用任何 Markdown 格式。
2. **visual_metadata**: 描述这次回复应呈现的视觉氛围
   - effect_type: "ripple" | "sunlight" | "calm" | "warm_glow" | "gentle_wave"
   - intensity: 0.0 ~ 1.0
   - color_tone: "soft_pink" | "warm_gold" | "gentle_blue" | "lavender" | "neutral_white" | "coral" | "sage"
3. **memory_extract**: 如果用户分享了值得记住的信息，提取出来；否则为 null

记住：你的存在是提供一个对等的、可以卸下专业面具的空间。`

const adminPromptSuffix = "\n\n## 额外信息\n该用户是社区管理员。保持一贯的真诚态度，涉及社区管理话题时可以更直接高效地交流。"

func getCompanionPrompt(role model.UserRole, isAdmin bool) string {
	var prompt string
	if model.ProfessionalRoles[role] {
		prompt = companionSystemPromptProfessional
	} else if role == model.RoleDad {
		prompt = companionSystemPromptDad
	} else {
		prompt = companionSystemPromptMom
	}
	if isAdmin {
		prompt += adminPromptSuffix
	}
	return prompt
}

func pronounFor(role model.UserRole) string {
	if model.ProfessionalRoles[role] {
		return "对方"
	}
	if role == model.RoleDad {
		return "他"
	}
	return "她"
}

const (
	maxGuestSessions = 1000 // Maximum number of guest sessions in memory
)

type ChatService struct {
	client    *openai.Client
	chatRepo  *repository.ChatRepo
	userRepo  *repository.UserRepo
	firecrawl *firecrawl.Client
	// In-memory storage for guest sessions
	mu            sync.RWMutex
	guestMemory   map[string][]map[string]interface{}
	guestProfiles map[string]map[string]interface{}
}

func NewChatService(client *openai.Client, chatRepo *repository.ChatRepo, userRepo *repository.UserRepo, fc *firecrawl.Client) *ChatService {
	return &ChatService{
		client:        client,
		chatRepo:      chatRepo,
		userRepo:      userRepo,
		firecrawl:     fc,
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
	// Look up user role
	role := model.RoleMom
	isAdmin := false
	if user, err := s.userRepo.FindByID(userID); err == nil {
		role = user.Role
		isAdmin = user.IsAdmin
	}
	pronoun := pronounFor(role)

	// Load memory from DB
	profile, turns := s.loadUserMemory(userID)

	systemPrompt := fmt.Sprintf(getCompanionPrompt(role, isAdmin),
		formatProfile(profile, pronoun),
		formatTurns(turns, pronoun),
	)

	webResults := s.searchWebForChat(ctx, msg.Content)
	if webResults != "" {
		systemPrompt += "\n\n## 联网搜索参考\n" + webResults + "\n如有引用搜索内容，请自然融入回答，标注来源。不确定的信息请标明。"
	}

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
		// Evict oldest sessions if at capacity
		if len(s.guestMemory) >= maxGuestSessions {
			// Delete ~10% of sessions to avoid evicting on every new request
			toDelete := maxGuestSessions / 10
			if toDelete < 1 {
				toDelete = 1
			}
			deleted := 0
			for k := range s.guestMemory {
				delete(s.guestMemory, k)
				delete(s.guestProfiles, k)
				deleted++
				if deleted >= toDelete {
					break
				}
			}
		}
		s.guestMemory[sessionID] = nil
		s.guestProfiles[sessionID] = make(map[string]interface{})
	}
	profile := s.guestProfiles[sessionID]
	turns := s.guestMemory[sessionID]
	s.mu.Unlock()

	systemPrompt := fmt.Sprintf(getCompanionPrompt(model.RoleMom, false),
		formatProfile(profile, "她"),
		formatTurns(turns, "她"),
	)

	webResults := s.searchWebForChat(ctx, msg.Content)
	if webResults != "" {
		systemPrompt += "\n\n## 联网搜索参考\n" + webResults + "\n如有引用搜索内容，请自然融入回答，标注来源。不确定的信息请标明。"
	}

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

func (s *ChatService) searchWebForChat(ctx context.Context, userMessage string) string {
	if s.firecrawl == nil {
		return ""
	}
	results, err := s.firecrawl.Search(ctx, userMessage, 3)
	if err != nil {
		log.Printf("[ChatService] web search failed: %v", err)
		return ""
	}
	if len(results) == 0 {
		return ""
	}
	var sb strings.Builder
	for i, r := range results {
		content := r.Markdown
		if content == "" {
			content = r.Description
		}
		if len([]rune(content)) > 300 {
			content = string([]rune(content)[:300]) + "..."
		}
		fmt.Fprintf(&sb, "[来源%d] %s (%s): %s\n", i+1, r.Title, r.URL, content)
	}
	return sb.String()
}

func (s *ChatService) GetProfile(userID string) (*dto.ChatProfile, error) {
	mem, err := s.chatRepo.FindByUserID(userID)
	if err != nil {
		return &dto.ChatProfile{
			Interests:             []string{},
			Concerns:              []string{},
			ImportantDates:        []string{},
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
			Interests:             []string{},
			Concerns:              []string{},
			ImportantDates:        []string{},
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

func formatProfile(profile map[string]interface{}, pronoun string) string {
	if len(profile) == 0 {
		return "（暂无记录）"
	}
	parts := ""
	if name, ok := profile["preferred_name"].(string); ok && name != "" {
		parts += fmt.Sprintf("- %s喜欢被称为：%s\n", pronoun, name)
	}
	if hasPets, ok := profile["has_pets"].(bool); ok && hasPets {
		if details, ok := profile["pet_details"].(string); ok {
			parts += fmt.Sprintf("- %s有宠物：%s\n", pronoun, details)
		}
	}
	if interests, ok := profile["interests"].([]interface{}); ok && len(interests) > 0 {
		parts += fmt.Sprintf("- %s的兴趣：", pronoun)
		for i, v := range interests {
			if i > 0 {
				parts += ", "
			}
			parts += fmt.Sprintf("%v", v)
		}
		parts += "\n"
	}
	if concerns, ok := profile["concerns"].([]interface{}); ok && len(concerns) > 0 {
		parts += fmt.Sprintf("- %s曾表达的担忧：", pronoun)
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

func formatTurns(turns []map[string]interface{}, pronoun string) string {
	if len(turns) == 0 {
		return "（这是你们的第一次对话）"
	}
	result := ""
	start := 0
	if len(turns) > 5 {
		start = len(turns) - 5
	}
	for _, t := range turns[start:] {
		result += fmt.Sprintf("%s说：%v\n你回复：%v\n", pronoun, t["user_input"], t["assistant_response"])
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
	re2 := regexp.MustCompile(`(?s)\{.*\}`)
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
		Interests:             []string{},
		Concerns:              []string{},
		ImportantDates:        []string{},
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
