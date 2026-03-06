package service

import (
	"errors"

	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"gorm.io/gorm"
)

type UserService struct {
	db              *gorm.DB
	userRepo        *repository.UserRepo
	questionRepo    *repository.QuestionRepo
	answerRepo      *repository.AnswerRepo
	interactionRepo *repository.InteractionRepo
	community       *CommunityService
}

func NewUserService(
	db *gorm.DB,
	userRepo *repository.UserRepo,
	questionRepo *repository.QuestionRepo,
	answerRepo *repository.AnswerRepo,
	interactionRepo *repository.InteractionRepo,
	community *CommunityService,
) *UserService {
	return &UserService{
		db:              db,
		userRepo:        userRepo,
		questionRepo:    questionRepo,
		answerRepo:      answerRepo,
		interactionRepo: interactionRepo,
		community:       community,
	}
}

func (s *UserService) GetProfile(userID string) (*dto.UserProfile, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, err
	}

	stats, err := s.getUserStats(userID)
	if err != nil {
		return nil, err
	}

	info := s.community.BuildAuthorInfo(user)

	return &dto.UserProfile{
		ID:                 user.ID,
		Username:           user.Username,
		Nickname:           user.Nickname,
		Email:              user.Email,
		AvatarURL:          user.AvatarURL,
		Role:               string(user.Role),
		IsCertified:        info.IsCertified,
		CertificationTitle: info.CertificationTitle,
		Stats:              *stats,
		CreatedAt:          user.CreatedAt,
	}, nil
}

func (s *UserService) UpdateProfile(userID string, req dto.UserProfileUpdate) (*dto.UserProfile, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("用户不存在")
	}

	if req.Username != nil && *req.Username != user.Username {
		exists, _ := s.userRepo.ExistsByUsername(*req.Username, userID)
		if exists {
			return nil, errors.New("该用户名已被使用")
		}
		user.Username = *req.Username
	}

	if req.Nickname != nil {
		user.Nickname = *req.Nickname
	}

	if req.Email != nil && *req.Email != user.Email {
		exists, _ := s.userRepo.ExistsByEmail(*req.Email, userID)
		if exists {
			return nil, errors.New("该邮箱已被使用")
		}
		user.Email = *req.Email
	}

	if req.AvatarURL != nil {
		user.AvatarURL = req.AvatarURL
	}

	if req.Role != nil {
		newRole := model.UserRole(*req.Role)
		if !model.FamilyRoles[newRole] {
			return nil, errors.New("角色只能是: mom, dad, family")
		}
		if model.ProfessionalRoles[user.Role] {
			return nil, errors.New("认证专业人员不能修改角色")
		}
		if user.Role == model.RoleAdmin {
			return nil, errors.New("管理员不能通过此接口修改角色")
		}
		user.Role = newRole
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return s.GetProfile(userID)
}

func (s *UserService) GetUserQuestions(userID string, page, pageSize int) (*dto.PaginatedResponse, error) {
	offset := (page - 1) * pageSize
	questions, total, err := s.questionRepo.FindByAuthorID(userID, offset, pageSize)
	if err != nil {
		return nil, err
	}

	questionIDs := make([]string, len(questions))
	for i, q := range questions {
		questionIDs[i] = q.ID
	}

	likedIDs, _ := s.interactionRepo.FindLikedTargetIDs(userID, "question", questionIDs)
	collectedIDs, _ := s.interactionRepo.FindCollectedQuestionIDs(userID, questionIDs)

	items := make([]dto.MyQuestionListItem, 0, len(questions))
	for _, q := range questions {
		tags := make([]dto.TagInfo, 0)
		for _, t := range q.Tags {
			tags = append(tags, buildTagInfo(t))
		}

		items = append(items, dto.MyQuestionListItem{
			ID:                q.ID,
			Title:             q.Title,
			ContentPreview:    contentPreview(q.Content, 100),
			Channel:           string(q.Channel),
			Tags:              tags,
			ViewCount:         q.ViewCount,
			AnswerCount:       q.AnswerCount,
			LikeCount:         q.LikeCount,
			CollectionCount:   q.CollectionCount,
			Status:            string(q.Status),
			HasAcceptedAnswer: q.AcceptedAnswerID != nil,
			IsLiked:           likedIDs[q.ID],
			IsCollected:       collectedIDs[q.ID],
			CreatedAt:         q.CreatedAt,
		})
	}

	resp := dto.NewPaginatedResponse(items, total, page, pageSize)
	return &resp, nil
}

func (s *UserService) GetUserAnswers(userID string, page, pageSize int) (*dto.PaginatedResponse, error) {
	offset := (page - 1) * pageSize
	answers, total, err := s.answerRepo.FindByAuthorID(userID, offset, pageSize)
	if err != nil {
		return nil, err
	}

	answerIDs := make([]string, len(answers))
	for i, a := range answers {
		answerIDs[i] = a.ID
	}
	likedIDs, _ := s.interactionRepo.FindLikedTargetIDs(userID, "answer", answerIDs)

	items := make([]dto.MyAnswerListItem, 0, len(answers))
	for _, a := range answers {
		items = append(items, dto.MyAnswerListItem{
			ID:             a.ID,
			ContentPreview: contentPreview(a.Content, 200),
			Question: dto.QuestionBrief{
				ID:      a.Question.ID,
				Title:   a.Question.Title,
				Channel: string(a.Question.Channel),
			},
			IsProfessional: a.IsProfessional,
			IsAccepted:     a.IsAccepted,
			LikeCount:      a.LikeCount,
			CommentCount:   a.CommentCount,
			Status:         string(a.Status),
			IsLiked:        likedIDs[a.ID],
			CreatedAt:      a.CreatedAt,
		})
	}

	resp := dto.NewPaginatedResponse(items, total, page, pageSize)
	return &resp, nil
}

func (s *UserService) getUserStats(userID string) (*dto.UserStats, error) {
	_, questionTotal, _ := s.questionRepo.FindByAuthorID(userID, 0, 1)
	_, answerTotal, _ := s.answerRepo.FindByAuthorID(userID, 0, 1)

	// Sum likes received
	var questionLikes, answerLikes int64
	_ = s.db.Model(&model.Question{}).
		Where("author_id = ?", userID).
		Select("COALESCE(SUM(like_count), 0)").
		Row().Scan(&questionLikes)
	_ = s.db.Model(&model.Answer{}).
		Where("author_id = ?", userID).
		Select("COALESCE(SUM(like_count), 0)").
		Row().Scan(&answerLikes)

	var collectionCount int64
	s.db.Model(&model.Collection{}).
		Where("user_id = ?", userID).
		Count(&collectionCount)

	return &dto.UserStats{
		QuestionCount:     int(questionTotal),
		AnswerCount:       int(answerTotal),
		LikeReceivedCount: int(questionLikes + answerLikes),
		CollectionCount:   int(collectionCount),
	}, nil
}
