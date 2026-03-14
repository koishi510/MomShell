package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

type InteractionRepo struct {
	db *gorm.DB
}

func NewInteractionRepo(db *gorm.DB) *InteractionRepo {
	return &InteractionRepo{db: db}
}

// Like operations

func (r *InteractionRepo) FindLike(userID, targetType, targetID string) (*model.Like, error) {
	var like model.Like
	err := r.db.Where("user_id = ? AND target_type = ? AND target_id = ?",
		userID, targetType, targetID).First(&like).Error
	if err != nil {
		return nil, err
	}
	return &like, nil
}

func (r *InteractionRepo) FindLikedTargetIDs(userID, targetType string, targetIDs []string) (map[string]bool, error) {
	if len(targetIDs) == 0 {
		return make(map[string]bool), nil
	}
	var likes []model.Like
	err := r.db.Where("user_id = ? AND target_type = ? AND target_id IN ?",
		userID, targetType, targetIDs).Find(&likes).Error
	if err != nil {
		return nil, err
	}
	result := make(map[string]bool)
	for _, l := range likes {
		result[l.TargetID] = true
	}
	return result, nil
}

func (r *InteractionRepo) CreateLike(like *model.Like) error {
	return r.db.Create(like).Error
}

func (r *InteractionRepo) DeleteLike(userID, targetType, targetID string) error {
	return r.db.Where("user_id = ? AND target_type = ? AND target_id = ?",
		userID, targetType, targetID).Delete(&model.Like{}).Error
}

func (r *InteractionRepo) DeleteLikesByTarget(targetType, targetID string) error {
	return r.db.Where("target_type = ? AND target_id = ?", targetType, targetID).Delete(&model.Like{}).Error
}

// Collection operations

func (r *InteractionRepo) FindCollection(userID, questionID string) (*model.Collection, error) {
	var c model.Collection
	err := r.db.Where(whereUserIDAndQuestionID, userID, questionID).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *InteractionRepo) FindCollectedQuestionIDs(userID string, questionIDs []string) (map[string]bool, error) {
	if len(questionIDs) == 0 {
		return make(map[string]bool), nil
	}
	var collections []model.Collection
	err := r.db.Where(whereUserID+" AND question_id IN ?", userID, questionIDs).Find(&collections).Error
	if err != nil {
		return nil, err
	}
	result := make(map[string]bool)
	for _, c := range collections {
		result[c.QuestionID] = true
	}
	return result, nil
}

func (r *InteractionRepo) FindUserCollections(userID string, offset, limit int) ([]model.Collection, int64, error) {
	var total int64
	r.db.Model(&model.Collection{}).Where(whereUserID, userID).Count(&total)

	var collections []model.Collection
	err := r.db.Preload("Question.Author.Certification").
		Preload("Question.Tags").
		Where(whereUserID, userID).
		Order(orderCreatedAtDesc).
		Offset(offset).Limit(limit).
		Find(&collections).Error
	return collections, total, err
}

func (r *InteractionRepo) CreateCollection(c *model.Collection) error {
	return r.db.Create(c).Error
}

func (r *InteractionRepo) DeleteCollection(userID, questionID string) error {
	return r.db.Where(whereUserIDAndQuestionID, userID, questionID).Delete(&model.Collection{}).Error
}

func (r *InteractionRepo) DeleteCollectionsByQuestion(questionID string) error {
	return r.db.Where(whereQuestionID, questionID).Delete(&model.Collection{}).Error
}
