package service

import (
	"crypto/rand"
	"errors"
	"math/big"

	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"gorm.io/gorm"
)

const (
	errUserServiceUserNotFound = "用户不存在"
	whereIDEquals              = "id = ?"
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
			return nil, errors.New(errUserServiceUserNotFound)
		}
		return nil, err
	}

	stats, err := s.getUserStats(userID)
	if err != nil {
		return nil, err
	}

	info := s.community.BuildAuthorInfo(user)

	profile := &dto.UserProfile{
		ID:                 user.ID,
		Username:           user.Username,
		Nickname:           user.Nickname,
		Email:              user.Email,
		AvatarURL:          user.AvatarURL,
		Role:               string(user.Role),
		IsAdmin:            user.IsAdmin,
		ShellCode:          user.ShellCode,
		IsCertified:        info.IsCertified,
		CertificationTitle: info.CertificationTitle,
		Stats:              *stats,
		CreatedAt:          user.CreatedAt,
	}

	if user.PartnerID != nil {
		partner, err := s.userRepo.FindByID(*user.PartnerID)
		if err == nil {
			profile.Partner = &dto.PartnerInfo{
				ID:        partner.ID,
				Nickname:  partner.Nickname,
				AvatarURL: partner.AvatarURL,
				Role:      string(partner.Role),
			}
		}
	}

	return profile, nil
}

// validateRoleChange checks if a role update is allowed for the user.
func validateRoleChange(user *model.User, newRoleStr string) error {
	newRole := model.UserRole(newRoleStr)
	if !model.FamilyRoles[newRole] {
		return errors.New("角色只能是: mom, dad")
	}
	if model.ProfessionalRoles[user.Role] {
		return errors.New("认证专业人员不能修改角色")
	}
	if user.PartnerID != nil {
		return errors.New("已绑定伴侣，无法更改身份")
	}
	return nil
}

// applyProfileFieldUpdates applies the individual field updates from the request to the user model.
// Returns an error if any validation fails (e.g. duplicate username/email, invalid role).
func (s *UserService) applyProfileFieldUpdates(user *model.User, req dto.UserProfileUpdate) error {
	if req.Username != nil && *req.Username != user.Username {
		exists, _ := s.userRepo.ExistsByUsername(*req.Username, user.ID)
		if exists {
			return errors.New("该用户名已被使用")
		}
		user.Username = *req.Username
	}

	if req.Nickname != nil {
		user.Nickname = *req.Nickname
	}

	if req.Email != nil && *req.Email != user.Email {
		exists, _ := s.userRepo.ExistsByEmail(*req.Email, user.ID)
		if exists {
			return errors.New("该邮箱已被使用")
		}
		user.Email = *req.Email
	}

	if req.AvatarURL != nil {
		user.AvatarURL = req.AvatarURL
	}

	if req.Role != nil {
		if err := validateRoleChange(user, *req.Role); err != nil {
			return err
		}
		user.Role = model.UserRole(*req.Role)
	}

	return nil
}

func (s *UserService) UpdateProfile(userID string, req dto.UserProfileUpdate) (*dto.UserProfile, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New(errUserServiceUserNotFound)
	}

	if err := s.applyProfileFieldUpdates(user, req); err != nil {
		return nil, err
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return s.GetProfile(userID)
}

// GenerateShellCode generates a shell code for 溯源者 (mom) to share with their partner.
func (s *UserService) GenerateShellCode(userID string) (*dto.UserProfile, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New(errUserServiceUserNotFound)
	}

	if user.Role != model.RoleMom {
		return nil, errors.New("只有溯源者可以生成贝壳码")
	}

	if user.PartnerID != nil {
		return nil, errors.New("已绑定伴侣，无法重新生成贝壳码")
	}

	// Generate if not already present
	if user.ShellCode == nil {
		code, err := generateRandomCode(8)
		if err != nil {
			return nil, errors.New("生成贝壳码失败")
		}
		user.ShellCode = &code
		if err := s.userRepo.Update(user); err != nil {
			return nil, err
		}
	}

	return s.GetProfile(userID)
}

// BindPartner binds a 守护者 (dad) to a 溯源者 (mom) via shell code.
func (s *UserService) BindPartner(userID, shellCode string) (*dto.UserProfile, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New(errUserServiceUserNotFound)
	}

	if user.Role != model.RoleDad {
		return nil, errors.New("只有守护者可以填写贝壳码")
	}

	if user.PartnerID != nil {
		return nil, errors.New("您已绑定伴侣")
	}

	partner, err := s.userRepo.FindByShellCode(shellCode)
	if err != nil {
		return nil, errors.New("贝壳码无效")
	}

	if partner.Role != model.RoleMom {
		return nil, errors.New("贝壳码无效")
	}

	if partner.PartnerID != nil {
		return nil, errors.New("对方已绑定其他伴侣")
	}

	if partner.ID == userID {
		return nil, errors.New("不能绑定自己")
	}

	// Bind both sides in a transaction
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.User{}).Where(whereIDEquals, user.ID).Update("partner_id", partner.ID).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.User{}).Where(whereIDEquals, partner.ID).Update("partner_id", user.ID).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, errors.New("绑定失败")
	}

	return s.GetProfile(userID)
}

// UnbindPartner removes the partner relationship for the current user.
func (s *UserService) UnbindPartner(userID string) (*dto.UserProfile, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New(errUserServiceUserNotFound)
	}

	if user.PartnerID == nil {
		return nil, errors.New("您尚未绑定伴侣")
	}

	partnerID := *user.PartnerID

	// Unbind both sides, clear shell code
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.User{}).Where(whereIDEquals, userID).Updates(map[string]interface{}{
			"partner_id": nil,
			"shell_code": nil,
		}).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.User{}).Where(whereIDEquals, partnerID).Updates(map[string]interface{}{
			"partner_id": nil,
			"shell_code": nil,
		}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, errors.New("解绑失败")
	}

	return s.GetProfile(userID)
}

func generateRandomCode(length int) (string, error) {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	code := make([]byte, length)
	for i := range code {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		code[i] = charset[n.Int64()]
	}
	return string(code), nil
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
			IsExpertPost:   a.IsExpertPost,
			Sources:        a.Sources,
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
