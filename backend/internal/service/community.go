package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"time"

	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"gorm.io/gorm"
)

const (
	errExpertPostSourceRequired = "专家帖必须标注来源依据"
	errContentModerationFailed  = "内容审核未通过: %s"
)

type CommunityService struct {
	questionRepo    *repository.QuestionRepo
	answerRepo      *repository.AnswerRepo
	commentRepo     *repository.CommentRepo
	interactionRepo *repository.InteractionRepo
	tagRepo         *repository.TagRepo
	userRepo        *repository.UserRepo
	moderation      *ModerationService
}

func NewCommunityService(
	questionRepo *repository.QuestionRepo,
	answerRepo *repository.AnswerRepo,
	commentRepo *repository.CommentRepo,
	interactionRepo *repository.InteractionRepo,
	tagRepo *repository.TagRepo,
	userRepo *repository.UserRepo,
	moderation *ModerationService,
) *CommunityService {
	return &CommunityService{
		questionRepo:    questionRepo,
		answerRepo:      answerRepo,
		commentRepo:     commentRepo,
		interactionRepo: interactionRepo,
		tagRepo:         tagRepo,
		userRepo:        userRepo,
		moderation:      moderation,
	}
}

// ==================== Helper Methods ====================

func (s *CommunityService) IsCertifiedProfessional(user *model.User) bool {
	return model.ProfessionalRoles[user.Role] &&
		user.Certification != nil &&
		user.Certification.Status == model.CertApproved
}

func (s *CommunityService) BuildAuthorInfo(user *model.User) dto.AuthorInfo {
	info := dto.AuthorInfo{
		ID:        user.ID,
		Nickname:  user.Nickname,
		AvatarURL: user.AvatarURL,
		Role:      string(user.Role),
	}

	if user.Certification != nil && user.Certification.Status == model.CertApproved {
		info.IsCertified = true
		title := ""
		if user.Certification.HospitalOrInstitution != "" {
			title += user.Certification.HospitalOrInstitution
		}
		if user.Certification.Department != nil && *user.Certification.Department != "" {
			title += " " + *user.Certification.Department
		}
		if user.Certification.Title != nil && *user.Certification.Title != "" {
			title += " " + *user.Certification.Title
		}
		if title != "" {
			info.CertificationTitle = &title
		}
	}

	// Compute display tag: additional tag takes priority over base tag
	info.DisplayTag = displayTag(user)

	return info
}

// displayTag returns the tag to show in community.
// Additional tags (admin, certified, ai_assistant) override the base tag (溯源者/守护者).
func displayTag(user *model.User) string {
	if user.Certification != nil && user.Certification.Status == model.CertApproved {
		switch user.Certification.CertificationType {
		case model.RoleCertifiedDoctor:
			return "认证医师"
		case model.RoleCertifiedTherapist:
			return "认证心理师"
		case model.RoleCertifiedNurse:
			return "认证护士"
		}
	}
	if user.IsAdmin {
		return "管理员"
	}
	if user.Role == model.RoleAIAssistant {
		return "AI 助手"
	}
	// Base tag
	if user.Role == model.RoleDad {
		return "守护者"
	}
	return "溯源者"
}

func buildTagInfo(tag model.Tag) dto.TagInfo {
	return dto.TagInfo{ID: tag.ID, Name: tag.Name, Slug: tag.Slug}
}

func contentPreview(content string, maxLen int) string {
	if len(content) > maxLen {
		return content[:maxLen] + "..."
	}
	return content
}

// ==================== Question Operations ====================

func (s *CommunityService) GetQuestions(params dto.QuestionListParams, currentUserID string) (*dto.PaginatedResponse, error) {
	questions, total, err := s.questionRepo.FindAll(
		params.Channel,
		params.TagID,
		model.StatusPublished,
		params.GetSortBy(),
		params.GetOrder(),
		params.GetOffset(),
		params.GetPageSize(),
	)
	if err != nil {
		return nil, err
	}

	// Get user's likes and collections
	questionIDs := make([]string, len(questions))
	for i, q := range questions {
		questionIDs[i] = q.ID
	}

	likedIDs := make(map[string]bool)
	collectedIDs := make(map[string]bool)
	if currentUserID != "" && len(questionIDs) > 0 {
		likedIDs, _ = s.interactionRepo.FindLikedTargetIDs(currentUserID, "question", questionIDs)
		collectedIDs, _ = s.interactionRepo.FindCollectedQuestionIDs(currentUserID, questionIDs)
	}

	items := make([]dto.QuestionListItem, 0, len(questions))
	for _, q := range questions {
		tags := make([]dto.TagInfo, 0, len(q.Tags))
		for _, t := range q.Tags {
			tags = append(tags, buildTagInfo(t))
		}

		items = append(items, dto.QuestionListItem{
			ID:                q.ID,
			Title:             q.Title,
			ContentPreview:    contentPreview(q.Content, 100),
			Channel:           string(q.Channel),
			Author:            s.BuildAuthorInfo(&q.Author),
			Tags:              tags,
			ViewCount:         q.ViewCount,
			AnswerCount:       q.AnswerCount,
			LikeCount:         q.LikeCount,
			CollectionCount:   q.CollectionCount,
			IsPinned:          q.IsPinned,
			IsFeatured:        q.IsFeatured,
			HasAcceptedAnswer: q.AcceptedAnswerID != nil,
			IsLiked:           likedIDs[q.ID],
			IsCollected:       collectedIDs[q.ID],
			CreatedAt:         q.CreatedAt,
		})
	}

	page := params.GetPage()
	pageSize := params.GetPageSize()
	resp := dto.NewPaginatedResponse(items, total, page, pageSize)
	return &resp, nil
}

func (s *CommunityService) GetQuestion(questionID, currentUserID string) (*dto.QuestionDetail, error) {
	q, err := s.questionRepo.FindByID(questionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("问题不存在")
		}
		return nil, err
	}

	// Increment view count
	_ = s.questionRepo.IncrementViewCount(questionID)
	q.ViewCount++

	// Check user interactions
	isLiked := false
	isCollected := false
	if currentUserID != "" {
		if _, err := s.interactionRepo.FindLike(currentUserID, "question", questionID); err == nil {
			isLiked = true
		}
		if _, err := s.interactionRepo.FindCollection(currentUserID, questionID); err == nil {
			isCollected = true
		}
	}

	// Count professional vs experience answers
	proCount, _ := s.answerRepo.CountByQuestionID(questionID, true)
	expCount, _ := s.answerRepo.CountByQuestionID(questionID, false)

	var imageURLs []string
	if q.ImageURLs != nil {
		_ = json.Unmarshal([]byte(*q.ImageURLs), &imageURLs)
	}
	if imageURLs == nil {
		imageURLs = []string{}
	}

	tags := make([]dto.TagInfo, 0, len(q.Tags))
	for _, t := range q.Tags {
		tags = append(tags, buildTagInfo(t))
	}

	return &dto.QuestionDetail{
		ID:                      q.ID,
		Title:                   q.Title,
		Content:                 q.Content,
		ContentPreview:          contentPreview(q.Content, 100),
		Channel:                 string(q.Channel),
		Status:                  string(q.Status),
		Author:                  s.BuildAuthorInfo(&q.Author),
		Tags:                    tags,
		ImageURLs:               imageURLs,
		ViewCount:               q.ViewCount,
		AnswerCount:             q.AnswerCount,
		LikeCount:               q.LikeCount,
		CollectionCount:         q.CollectionCount,
		IsPinned:                q.IsPinned,
		IsFeatured:              q.IsFeatured,
		HasAcceptedAnswer:       q.AcceptedAnswerID != nil,
		AcceptedAnswerID:        q.AcceptedAnswerID,
		IsLiked:                 isLiked,
		IsCollected:             isCollected,
		ProfessionalAnswerCount: int(proCount),
		ExperienceAnswerCount:   int(expCount),
		CreatedAt:               q.CreatedAt,
		UpdatedAt:               q.UpdatedAt,
		PublishedAt:             q.PublishedAt,
	}, nil
}

func (s *CommunityService) CreateQuestion(req dto.QuestionCreate, author *model.User) (*model.Question, error) {
	// Sanitize user content
	req.Title = sanitizeHTML(req.Title)
	req.Content = sanitizeHTML(req.Content)

	// Content moderation
	titleDecision := s.moderation.ModerateText(req.Title)
	if titleDecision.Result == model.ModerationRejected {
		return nil, fmt.Errorf("标题审核未通过: %s", derefStr(titleDecision.Reason))
	}

	contentDecision := s.moderation.ModerateText(req.Content)
	if contentDecision.Result == model.ModerationRejected {
		return nil, fmt.Errorf(errContentModerationFailed, derefStr(contentDecision.Reason))
	}

	// Determine status
	status := model.StatusPublished
	var publishedAt *time.Time
	now := time.Now()
	if titleDecision.Result == model.ModerationPassed && contentDecision.Result == model.ModerationPassed {
		publishedAt = &now
	} else {
		status = model.StatusPendingReview
	}

	var imageURLsJSON *string
	if len(req.ImageURLs) > 0 {
		b, _ := json.Marshal(req.ImageURLs)
		s := string(b)
		imageURLsJSON = &s
	}

	q := &model.Question{
		AuthorID:    author.ID,
		Title:       req.Title,
		Content:     req.Content,
		Channel:     model.ChannelType(req.Channel),
		Status:      status,
		PublishedAt: publishedAt,
		ImageURLs:   imageURLsJSON,
	}

	if err := s.questionRepo.Create(q); err != nil {
		return nil, err
	}

	// Associate tags
	for _, tagID := range req.TagIDs {
		_ = s.tagRepo.CreateQuestionTag(&model.QuestionTag{
			QuestionID: q.ID,
			TagID:      tagID,
		})
		_ = s.tagRepo.IncrementQuestionCount(tagID)
	}

	return q, nil
}

// moderateAndUpdateTextField moderates text content and updates the target field on the question.
// Returns an error if moderation rejects the content. Sets status to PendingReview if manual review is needed.
func (s *CommunityService) moderateAndUpdateTextField(q *model.Question, newText *string, fieldName string, setter func(string)) error {
	if newText == nil {
		return nil
	}
	sanitized := sanitizeHTML(*newText)
	newText = &sanitized
	decision := s.moderation.ModerateText(*newText)
	if decision.Result == model.ModerationRejected {
		return fmt.Errorf("%s审核未通过: %s", fieldName, derefStr(decision.Reason))
	}
	setter(*newText)
	if decision.Result == model.ModerationNeedManualReview {
		q.Status = model.StatusPendingReview
	}
	return nil
}

func (s *CommunityService) UpdateQuestion(questionID string, req dto.QuestionUpdate, user *model.User) (*model.Question, error) {
	q, err := s.questionRepo.FindByID(questionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("问题不存在")
		}
		return nil, err
	}

	if q.AuthorID != user.ID && !user.IsAdmin {
		return nil, errors.New("无权修改此问题")
	}

	if err := s.moderateAndUpdateTextField(q, req.Title, "标题", func(v string) { q.Title = v }); err != nil {
		return nil, err
	}
	if err := s.moderateAndUpdateTextField(q, req.Content, "内容", func(v string) { q.Content = v }); err != nil {
		return nil, err
	}

	if req.TagIDs != nil {
		_ = s.tagRepo.DeleteQuestionTags(questionID)
		for _, tagID := range req.TagIDs {
			_ = s.tagRepo.CreateQuestionTag(&model.QuestionTag{
				QuestionID: questionID,
				TagID:      tagID,
			})
		}
	}

	q.UpdatedAt = time.Now()
	if err := s.questionRepo.Update(q); err != nil {
		return nil, err
	}

	return q, nil
}

func (s *CommunityService) DeleteQuestion(questionID string, user *model.User) error {
	q, err := s.questionRepo.FindByID(questionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("问题不存在")
		}
		return err
	}

	if q.AuthorID != user.ID && !user.IsAdmin {
		return errors.New("无权删除此问题")
	}

	// Clean up related data
	answerIDs, _ := s.answerRepo.FindIDsByQuestionID(questionID)
	for _, aid := range answerIDs {
		// Delete likes on comments before deleting the comments themselves
		if comments, cErr := s.commentRepo.FindByAnswerID(aid); cErr == nil {
			for _, c := range comments {
				_ = s.interactionRepo.DeleteLikesByTarget("comment", c.ID)
			}
		}
		_ = s.commentRepo.DeleteByAnswerID(aid)
		_ = s.interactionRepo.DeleteLikesByTarget("answer", aid)
	}
	_ = s.answerRepo.DeleteByQuestionID(questionID)
	_ = s.interactionRepo.DeleteLikesByTarget("question", questionID)
	_ = s.interactionRepo.DeleteCollectionsByQuestion(questionID)
	_ = s.tagRepo.DeleteQuestionTags(questionID)

	return s.questionRepo.Delete(questionID)
}

// ==================== Answer Operations ====================

func (s *CommunityService) GetAnswers(questionID string, params dto.AnswerListParams, currentUserID string) (*dto.PaginatedResponse, error) {
	answers, total, err := s.answerRepo.FindByQuestionID(
		questionID,
		params.IsProfessional,
		params.GetSortBy(),
		params.GetOrder(),
		params.GetOffset(),
		params.GetPageSize(),
	)
	if err != nil {
		return nil, err
	}

	answerIDs := make([]string, len(answers))
	for i, a := range answers {
		answerIDs[i] = a.ID
	}

	likedIDs := make(map[string]bool)
	if currentUserID != "" && len(answerIDs) > 0 {
		likedIDs, _ = s.interactionRepo.FindLikedTargetIDs(currentUserID, "answer", answerIDs)
	}

	items := make([]dto.AnswerListItem, 0, len(answers))
	for _, a := range answers {
		items = append(items, dto.AnswerListItem{
			ID:             a.ID,
			QuestionID:     a.QuestionID,
			Author:         s.BuildAuthorInfo(&a.Author),
			Content:        a.Content,
			ContentPreview: contentPreview(a.Content, 200),
			IsProfessional: a.IsProfessional,
			IsExpertPost:   a.IsExpertPost,
			Sources:        a.Sources,
			IsAccepted:     a.IsAccepted,
			LikeCount:      a.LikeCount,
			CommentCount:   a.CommentCount,
			IsLiked:        likedIDs[a.ID],
			CreatedAt:      a.CreatedAt,
		})
	}

	page := params.GetPage()
	pageSize := params.GetPageSize()
	resp := dto.NewPaginatedResponse(items, total, page, pageSize)
	return &resp, nil
}

func (s *CommunityService) CreateAnswer(questionID string, req dto.AnswerCreate, author *model.User) (*model.Answer, error) {
	// Sanitize user content
	req.Content = sanitizeHTML(req.Content)

	// Check question exists
	_, err := s.questionRepo.FindByID(questionID)
	if err != nil {
		return nil, errors.New("问题不存在")
	}

	// Expert post: only certified professionals can publish, and sources are required
	if req.IsExpertPost {
		if !s.IsCertifiedProfessional(author) && !author.IsAdmin {
			return nil, errors.New("仅认证专业人士可发布专家帖")
		}
		if req.Sources == "" {
			return nil, errors.New(errExpertPostSourceRequired)
		}
	}

	// Content moderation
	decision := s.moderation.ModerateText(req.Content)
	if decision.Result == model.ModerationRejected {
		return nil, fmt.Errorf(errContentModerationFailed, derefStr(decision.Reason))
	}

	status := model.StatusPublished
	if decision.Result != model.ModerationPassed {
		status = model.StatusPendingReview
	}

	var imageURLsJSON *string
	if len(req.ImageURLs) > 0 {
		b, _ := json.Marshal(req.ImageURLs)
		s := string(b)
		imageURLsJSON = &s
	}

	var sourcesPtr *string
	if req.Sources != "" {
		sourcesPtr = &req.Sources
	}

	answer := &model.Answer{
		QuestionID:     questionID,
		AuthorID:       author.ID,
		Content:        req.Content,
		AuthorRole:     author.Role,
		IsProfessional: s.IsCertifiedProfessional(author),
		IsExpertPost:   req.IsExpertPost,
		Sources:        sourcesPtr,
		Status:         status,
		ImageURLs:      imageURLsJSON,
	}

	if err := s.answerRepo.Create(answer); err != nil {
		return nil, err
	}

	_ = s.questionRepo.IncrementAnswerCount(questionID)

	return answer, nil
}

// updateAnswerContent moderates and applies content update to an answer.
func (s *CommunityService) updateAnswerContent(a *model.Answer, content *string) error {
	if content == nil {
		return nil
	}
	sanitized := sanitizeHTML(*content)
	content = &sanitized
	decision := s.moderation.ModerateText(*content)
	if decision.Result == model.ModerationRejected {
		return fmt.Errorf(errContentModerationFailed, derefStr(decision.Reason))
	}
	a.Content = *content
	if decision.Result == model.ModerationNeedManualReview {
		a.Status = model.StatusPendingReview
	}
	return nil
}

// resolveExpertPostSources determines the sources value for an expert post update.
func resolveExpertPostSources(reqSources *string, existingSources *string) string {
	if reqSources != nil {
		return *reqSources
	}
	if existingSources != nil {
		return *existingSources
	}
	return ""
}

// updateExpertPostFields handles the expert post flag and sources fields on answer update.
func (s *CommunityService) updateExpertPostFields(a *model.Answer, req dto.AnswerUpdate, user *model.User) error {
	if req.IsExpertPost != nil {
		if *req.IsExpertPost {
			if !s.IsCertifiedProfessional(user) && !user.IsAdmin {
				return errors.New("仅认证专业人士可发布专家帖")
			}
			sources := resolveExpertPostSources(req.Sources, a.Sources)
			if sources == "" {
				return errors.New(errExpertPostSourceRequired)
			}
			a.IsExpertPost = true
			a.Sources = &sources
		} else {
			a.IsExpertPost = false
		}
	}
	if req.Sources != nil && (req.IsExpertPost == nil || !*req.IsExpertPost) {
		if a.IsExpertPost && *req.Sources == "" {
			return errors.New(errExpertPostSourceRequired)
		}
		a.Sources = req.Sources
	}
	return nil
}

func (s *CommunityService) UpdateAnswer(answerID string, req dto.AnswerUpdate, user *model.User) (*model.Answer, error) {
	a, err := s.answerRepo.FindByID(answerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("回答不存在")
		}
		return nil, err
	}

	if a.AuthorID != user.ID && !user.IsAdmin {
		return nil, errors.New("无权修改此回答")
	}

	if err := s.updateAnswerContent(a, req.Content); err != nil {
		return nil, err
	}

	if err := s.updateExpertPostFields(a, req, user); err != nil {
		return nil, err
	}

	a.UpdatedAt = time.Now()
	if err := s.answerRepo.Update(a); err != nil {
		return nil, err
	}

	return a, nil
}

func (s *CommunityService) DeleteAnswer(answerID string, user *model.User) error {
	a, err := s.answerRepo.FindByID(answerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("回答不存在")
		}
		return err
	}

	isAnswerAuthor := a.AuthorID == user.ID
	isQuestionAuthor := a.Question.AuthorID == user.ID
	isAdmin := user.IsAdmin

	if !isAnswerAuthor && !isQuestionAuthor && !isAdmin {
		return errors.New("无权删除此回答")
	}

	// Delete likes on comments before deleting the comments themselves
	if comments, cErr := s.commentRepo.FindByAnswerID(answerID); cErr == nil {
		for _, c := range comments {
			_ = s.interactionRepo.DeleteLikesByTarget("comment", c.ID)
		}
	}
	_ = s.commentRepo.DeleteByAnswerID(answerID)
	_ = s.interactionRepo.DeleteLikesByTarget("answer", answerID)
	_ = s.questionRepo.DecrementAnswerCount(a.QuestionID)

	return s.answerRepo.Delete(answerID)
}

// ==================== Comment Operations ====================

func (s *CommunityService) GetComments(answerID, currentUserID string) ([]dto.CommentListItem, error) {
	comments, err := s.commentRepo.FindByAnswerID(answerID)
	if err != nil {
		return nil, err
	}

	commentIDs := make([]string, len(comments))
	for i, c := range comments {
		commentIDs[i] = c.ID
	}

	likedIDs := make(map[string]bool)
	if currentUserID != "" && len(commentIDs) > 0 {
		likedIDs, _ = s.interactionRepo.FindLikedTargetIDs(currentUserID, "comment", commentIDs)
	}

	// Build flat list in chronological order, with reply_to_user resolved
	var result []dto.CommentListItem
	for _, c := range comments {
		var replyToUser *dto.AuthorInfo
		if c.ReplyToUser != nil {
			info := s.BuildAuthorInfo(c.ReplyToUser)
			replyToUser = &info
		}
		result = append(result, dto.CommentListItem{
			ID:          c.ID,
			AnswerID:    c.AnswerID,
			Author:      s.BuildAuthorInfo(&c.Author),
			Content:     c.Content,
			ParentID:    c.ParentID,
			ReplyToUser: replyToUser,
			LikeCount:   c.LikeCount,
			IsLiked:     likedIDs[c.ID],
			CreatedAt:   c.CreatedAt,
			Replies:     []dto.CommentListItem{},
		})
	}

	if result == nil {
		result = []dto.CommentListItem{}
	}
	return result, nil
}

func (s *CommunityService) CreateComment(answerID string, req dto.CommentCreate, user *model.User) (*dto.CommentListItem, error) {
	// Sanitize user content
	req.Content = sanitizeHTML(req.Content)

	// Check answer exists
	_, err := s.answerRepo.FindByID(answerID)
	if err != nil {
		return nil, errors.New("回答不存在")
	}

	// If replying, verify parent
	var replyToUserID *string
	if req.ParentID != nil {
		parent, err := s.commentRepo.FindByID(*req.ParentID)
		if err != nil || parent.AnswerID != answerID {
			return nil, errors.New("回复目标不存在")
		}
		replyToUserID = &parent.AuthorID
	}

	// Moderation
	decision := s.moderation.ModerateText(req.Content)
	if decision.Result == model.ModerationRejected {
		return nil, fmt.Errorf("评论审核未通过: %s", derefStr(decision.Reason))
	}

	status := model.StatusPublished
	if decision.Result != model.ModerationPassed {
		status = model.StatusPendingReview
	}

	comment := &model.Comment{
		AnswerID:      answerID,
		AuthorID:      user.ID,
		ParentID:      req.ParentID,
		ReplyToUserID: replyToUserID,
		Content:       req.Content,
		Status:        status,
	}

	if err := s.commentRepo.Create(comment); err != nil {
		return nil, err
	}

	_ = s.answerRepo.IncrementCommentCount(answerID)

	return &dto.CommentListItem{
		ID:        comment.ID,
		AnswerID:  comment.AnswerID,
		Author:    s.BuildAuthorInfo(user),
		Content:   comment.Content,
		ParentID:  comment.ParentID,
		LikeCount: 0,
		IsLiked:   false,
		CreatedAt: comment.CreatedAt,
		Replies:   []dto.CommentListItem{},
	}, nil
}

func (s *CommunityService) UpdateComment(commentID string, req dto.CommentUpdate, user *model.User) (*model.Comment, error) {
	comment, err := s.commentRepo.FindByID(commentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("评论不存在")
		}
		return nil, err
	}

	if comment.AuthorID != user.ID && !user.IsAdmin {
		return nil, errors.New("无权修改此评论")
	}

	req.Content = sanitizeHTML(req.Content)

	decision := s.moderation.ModerateText(req.Content)
	if decision.Result == model.ModerationRejected {
		return nil, fmt.Errorf("评论审核未通过: %s", derefStr(decision.Reason))
	}

	comment.Content = req.Content
	if decision.Result == model.ModerationNeedManualReview {
		comment.Status = model.StatusPendingReview
	}

	comment.UpdatedAt = time.Now()
	if err := s.commentRepo.Update(comment); err != nil {
		return nil, err
	}

	return comment, nil
}

func (s *CommunityService) DeleteComment(commentID string, user *model.User) error {
	comment, err := s.commentRepo.FindByID(commentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("评论不存在")
		}
		return err
	}

	if comment.AuthorID != user.ID && !user.IsAdmin {
		return errors.New("无权删除此评论")
	}

	// Delete children
	childrenDeleted, _ := s.commentRepo.DeleteByParentID(commentID)

	// Delete comment itself
	if err := s.commentRepo.Delete(commentID); err != nil {
		return err
	}

	// Decrement answer comment count (1 for this + children)
	_ = s.answerRepo.DecrementCommentCount(comment.AnswerID, int(childrenDeleted)+1)

	return nil
}

// ==================== Like Operations ====================

func (s *CommunityService) ToggleLike(userID, targetType, targetID string) (bool, int, error) {
	_, err := s.interactionRepo.FindLike(userID, targetType, targetID)
	if err == nil {
		// Unlike
		if err := s.interactionRepo.DeleteLike(userID, targetType, targetID); err != nil {
			return false, 0, err
		}
		s.updateTargetLikeCount(targetType, targetID, -1)
		count := s.getTargetLikeCount(targetType, targetID)
		return false, count, nil
	}

	// Like
	like := &model.Like{
		UserID:     userID,
		TargetType: targetType,
		TargetID:   targetID,
	}
	if err := s.interactionRepo.CreateLike(like); err != nil {
		return false, 0, err
	}
	s.updateTargetLikeCount(targetType, targetID, 1)
	count := s.getTargetLikeCount(targetType, targetID)
	return true, count, nil
}

// AddLike creates a like only if one doesn't already exist. Returns the
// current state and count without toggling.
func (s *CommunityService) AddLike(userID, targetType, targetID string) (bool, int, error) {
	_, err := s.interactionRepo.FindLike(userID, targetType, targetID)
	if err == nil {
		// Already liked — return current state (idempotent)
		count := s.getTargetLikeCount(targetType, targetID)
		return true, count, nil
	}

	like := &model.Like{
		UserID:     userID,
		TargetType: targetType,
		TargetID:   targetID,
	}
	if err := s.interactionRepo.CreateLike(like); err != nil {
		return false, 0, err
	}
	s.updateTargetLikeCount(targetType, targetID, 1)
	count := s.getTargetLikeCount(targetType, targetID)
	return true, count, nil
}

// RemoveLike removes a like only if one exists. Returns the current state
// and count without toggling. Calling DELETE on an already-unliked resource
// is a no-op (idempotent).
func (s *CommunityService) RemoveLike(userID, targetType, targetID string) (bool, int, error) {
	_, err := s.interactionRepo.FindLike(userID, targetType, targetID)
	if err != nil {
		// Not liked — return current state (idempotent)
		count := s.getTargetLikeCount(targetType, targetID)
		return false, count, nil
	}

	if err := s.interactionRepo.DeleteLike(userID, targetType, targetID); err != nil {
		return false, 0, err
	}
	s.updateTargetLikeCount(targetType, targetID, -1)
	count := s.getTargetLikeCount(targetType, targetID)
	return false, count, nil
}

func (s *CommunityService) updateTargetLikeCount(targetType, targetID string, delta int) {
	switch targetType {
	case "question":
		_ = s.questionRepo.UpdateLikeCount(targetID, delta)
	case "answer":
		_ = s.answerRepo.UpdateLikeCount(targetID, delta)
	case "comment":
		_ = s.commentRepo.UpdateLikeCount(targetID, delta)
	}
}

func (s *CommunityService) getTargetLikeCount(targetType, targetID string) int {
	switch targetType {
	case "question":
		if q, err := s.questionRepo.FindByID(targetID); err == nil {
			return q.LikeCount
		}
	case "answer":
		if a, err := s.answerRepo.FindByID(targetID); err == nil {
			return a.LikeCount
		}
	case "comment":
		if c, err := s.commentRepo.FindByID(targetID); err == nil {
			return c.LikeCount
		}
	}
	return 0
}

// ==================== Collection Operations ====================

func (s *CommunityService) ToggleCollection(userID, questionID string, folderName, note *string) (bool, int, error) {
	_, err := s.interactionRepo.FindCollection(userID, questionID)
	if err == nil {
		// Uncollect
		if err := s.interactionRepo.DeleteCollection(userID, questionID); err != nil {
			return false, 0, err
		}
		_ = s.questionRepo.UpdateCollectionCount(questionID, -1)
		if q, err := s.questionRepo.FindByID(questionID); err == nil {
			return false, q.CollectionCount, nil
		}
		return false, 0, nil
	}

	// Collect
	c := &model.Collection{
		UserID:     userID,
		QuestionID: questionID,
		FolderName: folderName,
		Note:       note,
	}
	if err := s.interactionRepo.CreateCollection(c); err != nil {
		return false, 0, err
	}
	_ = s.questionRepo.UpdateCollectionCount(questionID, 1)
	if q, err := s.questionRepo.FindByID(questionID); err == nil {
		return true, q.CollectionCount, nil
	}
	return true, 1, nil
}

func (s *CommunityService) GetUserCollections(userID string, page, pageSize int) (*dto.PaginatedResponse, error) {
	offset := (page - 1) * pageSize
	collections, total, err := s.interactionRepo.FindUserCollections(userID, offset, pageSize)
	if err != nil {
		return nil, err
	}

	// Get liked question IDs
	questionIDs := make([]string, 0, len(collections))
	for _, c := range collections {
		questionIDs = append(questionIDs, c.QuestionID)
	}
	likedIDs, _ := s.interactionRepo.FindLikedTargetIDs(userID, "question", questionIDs)

	items := make([]dto.CollectionItem, 0, len(collections))
	for _, c := range collections {
		q := c.Question
		tags := make([]dto.TagInfo, 0)
		for _, t := range q.Tags {
			tags = append(tags, buildTagInfo(t))
		}

		items = append(items, dto.CollectionItem{
			ID: c.ID,
			Question: dto.QuestionListItem{
				ID:                q.ID,
				Title:             q.Title,
				ContentPreview:    contentPreview(q.Content, 100),
				Channel:           string(q.Channel),
				Author:            s.BuildAuthorInfo(&q.Author),
				Tags:              tags,
				ViewCount:         q.ViewCount,
				AnswerCount:       q.AnswerCount,
				LikeCount:         q.LikeCount,
				CollectionCount:   q.CollectionCount,
				IsPinned:          q.IsPinned,
				IsFeatured:        q.IsFeatured,
				HasAcceptedAnswer: q.AcceptedAnswerID != nil,
				IsLiked:           likedIDs[q.ID],
				IsCollected:       true,
				CreatedAt:         q.CreatedAt,
			},
			FolderName: c.FolderName,
			Note:       c.Note,
			CreatedAt:  c.CreatedAt,
		})
	}

	resp := dto.NewPaginatedResponse(items, total, page, pageSize)
	return &resp, nil
}

// ==================== Tag Operations ====================

func (s *CommunityService) GetTags() ([]dto.TagListItem, error) {
	tags, err := s.tagRepo.FindAll()
	if err != nil {
		return nil, err
	}

	items := make([]dto.TagListItem, 0, len(tags))
	for _, t := range tags {
		items = append(items, dto.TagListItem{
			ID:            t.ID,
			Name:          t.Name,
			Slug:          t.Slug,
			Description:   t.Description,
			QuestionCount: t.QuestionCount,
			FollowerCount: t.FollowerCount,
			IsActive:      t.IsActive,
			IsFeatured:    t.IsFeatured,
		})
	}
	return items, nil
}

func (s *CommunityService) GetHotTags(limit int) ([]dto.TagListItem, error) {
	if limit <= 0 {
		limit = 20
	}
	tags, err := s.tagRepo.FindHot(limit)
	if err != nil {
		return nil, err
	}

	items := make([]dto.TagListItem, 0, len(tags))
	for _, t := range tags {
		items = append(items, dto.TagListItem{
			ID:            t.ID,
			Name:          t.Name,
			Slug:          t.Slug,
			Description:   t.Description,
			QuestionCount: t.QuestionCount,
			FollowerCount: t.FollowerCount,
			IsActive:      t.IsActive,
			IsFeatured:    t.IsFeatured,
		})
	}
	return items, nil
}

func (s *CommunityService) CreateTag(req dto.TagCreate) (*model.Tag, error) {
	tag := &model.Tag{
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
	}
	if err := s.tagRepo.Create(tag); err != nil {
		return nil, err
	}
	return tag, nil
}

// helper
func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// sanitizeHTML escapes HTML entities in user-provided content to prevent XSS.
func sanitizeHTML(s string) string {
	return html.EscapeString(s)
}
