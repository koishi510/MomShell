package service

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"github.com/momshell/backend/pkg/firecrawl"
	"github.com/momshell/backend/pkg/openai"
)

var mentionPattern = regexp.MustCompile(`@(小石光|koishi)`)

type CommunityAIService struct {
	client       *openai.Client
	firecrawl    *firecrawl.Client
	questionRepo *repository.QuestionRepo
	answerRepo   *repository.AnswerRepo
	commentRepo  *repository.CommentRepo
	aiUserID     string
}

func NewCommunityAIService(
	client *openai.Client,
	fc *firecrawl.Client,
	questionRepo *repository.QuestionRepo,
	answerRepo *repository.AnswerRepo,
	commentRepo *repository.CommentRepo,
	aiUserID string,
) *CommunityAIService {
	return &CommunityAIService{
		client:       client,
		firecrawl:    fc,
		questionRepo: questionRepo,
		answerRepo:   answerRepo,
		commentRepo:  commentRepo,
		aiUserID:     aiUserID,
	}
}

// ContainsMention checks if content mentions @小石光 or @koishi.
func ContainsMention(content string) bool {
	return mentionPattern.MatchString(content)
}

// HandleNewQuestion generates an AI answer for a question that mentions @小石光/@koishi.
func (s *CommunityAIService) HandleNewQuestion(questionID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	q, err := s.questionRepo.FindByID(questionID)
	if err != nil {
		log.Printf("[CommunityAI] failed to find question %s: %v", questionID, err)
		return
	}

	threadCtx := fmt.Sprintf("帖子标题：%s\n帖子内容：%s", q.Title, q.Content)
	searchCtx := s.searchWeb(ctx, q.Title)

	reply, err := s.generateReply(ctx, threadCtx, searchCtx)
	if err != nil {
		log.Printf("[CommunityAI] failed to generate reply for question %s: %v", questionID, err)
		return
	}

	answer := &model.Answer{
		QuestionID:     questionID,
		AuthorID:       s.aiUserID,
		Content:        reply,
		AuthorRole:     model.RoleAIAssistant,
		IsProfessional: false,
		Status:         model.StatusPublished,
	}

	if err := s.answerRepo.Create(answer); err != nil {
		log.Printf("[CommunityAI] failed to create answer for question %s: %v", questionID, err)
		return
	}

	_ = s.questionRepo.IncrementAnswerCount(questionID)
	log.Printf("[CommunityAI] AI answered question %s", questionID)
}

// HandleNewComment generates an AI comment reply when a comment mentions @小石光/@koishi.
func (s *CommunityAIService) HandleNewComment(answerID, commentID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	answer, err := s.answerRepo.FindByID(answerID)
	if err != nil {
		log.Printf("[CommunityAI] failed to find answer %s: %v", answerID, err)
		return
	}

	q, err := s.questionRepo.FindByID(answer.QuestionID)
	if err != nil {
		log.Printf("[CommunityAI] failed to find question %s: %v", answer.QuestionID, err)
		return
	}

	comments, err := s.commentRepo.FindByAnswerID(answerID)
	if err != nil {
		log.Printf("[CommunityAI] failed to find comments for answer %s: %v", answerID, err)
		return
	}

	var sb strings.Builder
	fmt.Fprintf(&sb, "帖子标题：%s\n帖子内容：%s\n\n", q.Title, q.Content)
	fmt.Fprintf(&sb, "当前回答：%s\n\n评论区对话：\n", answer.Content)
	for _, c := range comments {
		role := "用户"
		if c.AuthorID == s.aiUserID {
			role = "贝壳姐姐"
		}
		fmt.Fprintf(&sb, "%s：%s\n", role, c.Content)
	}

	searchCtx := s.searchWeb(ctx, q.Title)

	reply, err := s.generateReply(ctx, sb.String(), searchCtx)
	if err != nil {
		log.Printf("[CommunityAI] failed to generate comment reply: %v", err)
		return
	}

	triggerComment, err := s.commentRepo.FindByID(commentID)
	if err != nil {
		log.Printf("[CommunityAI] failed to find trigger comment %s: %v", commentID, err)
		return
	}

	comment := &model.Comment{
		AnswerID:      answerID,
		AuthorID:      s.aiUserID,
		ParentID:      &commentID,
		ReplyToUserID: &triggerComment.AuthorID,
		Content:       reply,
		Status:        model.StatusPublished,
	}

	if err := s.commentRepo.Create(comment); err != nil {
		log.Printf("[CommunityAI] failed to create comment reply: %v", err)
		return
	}

	_ = s.answerRepo.IncrementCommentCount(answerID)
	log.Printf("[CommunityAI] AI replied to comment %s on answer %s", commentID, answerID)
}

func (s *CommunityAIService) searchWeb(ctx context.Context, query string) string {
	if s.firecrawl == nil {
		return ""
	}

	results, err := s.firecrawl.Search(ctx, query, 3)
	if err != nil {
		log.Printf("[CommunityAI] web search failed: %v", err)
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
		if len([]rune(content)) > 500 {
			content = string([]rune(content)[:500]) + "..."
		}
		fmt.Fprintf(&sb, "[来源%d] %s\n链接：%s\n内容：%s\n\n", i+1, r.Title, r.URL, content)
	}
	return sb.String()
}

const communityAISystemPrompt = `你是「贝壳姐姐」，一位温柔且专业的产后恢复陪伴者，正在社区帖子中回复用户的提问。

## 角色定位
你面对的每一位用户，首先是一个完整的「独立女性」，其次才是新手妈妈。你用温暖、真诚、专业的语气回应她们的问题和困惑。

## 回复原则
1. **认可与共情优先**：先看见和认可她的感受，再提供建议
2. **拒绝说教**：用「我了解到...」「有研究表明...」「或许可以试试...」的方式分享
3. **保护主体性**：提醒她有权利为自己发声，可以寻求帮助
4. **避免有毒正能量**：承认困难的真实性

## 帖子上下文
%s

## 联网搜索结果
%s

## 防幻觉规则（严格遵守）
1. 只基于上述帖子上下文和搜索结果回答
2. 当搜索结果包含相关信息时，引用来源（如「根据[来源1]...」）
3. 如果不确定，明确说「关于这一点我不太确定，建议咨询专业医生/心理咨询师」
4. 绝不编造医疗数据、药物剂量、具体治疗方案
5. 涉及医疗问题时，始终建议咨询专业医生

## 回复要求
- 用纯文本回复，不要使用 JSON 格式
- 语气温暖自然，像朋友聊天
- 1-3段话即可，不要过长
- 不要重复用户说过的话
- 移除@提及，直接回复内容`

func (s *CommunityAIService) generateReply(ctx context.Context, threadContext, searchContext string) (string, error) {
	if searchContext == "" {
		searchContext = "（无搜索结果）"
	}

	systemPrompt := fmt.Sprintf(communityAISystemPrompt, threadContext, searchContext)

	messages := []openai.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: "请根据帖子上下文，给出一个温暖、有帮助的回复。"},
	}

	reply, err := s.client.Chat(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("AI 服务调用失败: %w", err)
	}

	reply = mentionPattern.ReplaceAllString(reply, "")
	reply = strings.TrimSpace(reply)

	if reply == "" {
		reply = "谢谢你的分享。如果需要更多帮助，随时可以找我聊聊。"
	}

	return reply, nil
}
