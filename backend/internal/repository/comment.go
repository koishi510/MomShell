package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

type CommentRepo struct {
	db *gorm.DB
}

func NewCommentRepo(db *gorm.DB) *CommentRepo {
	return &CommentRepo{db: db}
}

func (r *CommentRepo) FindByAnswerID(answerID string) ([]model.Comment, error) {
	var comments []model.Comment
	err := r.db.Preload("Author.Certification").
		Preload("ReplyToUser.Certification").
		Where("answer_id = ? AND status = ?", answerID, model.StatusPublished).
		Order("created_at asc").
		Find(&comments).Error
	return comments, err
}

func (r *CommentRepo) FindByID(id string) (*model.Comment, error) {
	var c model.Comment
	err := r.db.Preload("Author.Certification").
		First(&c, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CommentRepo) FindChildrenByParentID(parentID string) ([]model.Comment, error) {
	var comments []model.Comment
	err := r.db.Where("parent_id = ?", parentID).Find(&comments).Error
	return comments, err
}

func (r *CommentRepo) Create(c *model.Comment) error {
	return r.db.Create(c).Error
}

func (r *CommentRepo) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.Comment{}).Error
}

func (r *CommentRepo) Update(c *model.Comment) error {
	return r.db.Save(c).Error
}

func (r *CommentRepo) DeleteByParentID(parentID string) (int64, error) {
	result := r.db.Where("parent_id = ?", parentID).Delete(&model.Comment{})
	return result.RowsAffected, result.Error
}

func (r *CommentRepo) DeleteByAnswerID(answerID string) error {
	return r.db.Where("answer_id = ?", answerID).Delete(&model.Comment{}).Error
}

func (r *CommentRepo) UpdateLikeCount(id string, delta int) error {
	return r.db.Model(&model.Comment{}).Where("id = ?", id).
		UpdateColumn("like_count", gorm.Expr("like_count + ?", delta)).Error
}
