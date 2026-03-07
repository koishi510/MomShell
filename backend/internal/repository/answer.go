package repository

import (
	"fmt"

	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

type AnswerRepo struct {
	db *gorm.DB
}

func NewAnswerRepo(db *gorm.DB) *AnswerRepo {
	return &AnswerRepo{db: db}
}

func (r *AnswerRepo) FindByQuestionID(
	questionID string,
	isProfessional *bool,
	sortBy string,
	order string,
	offset int,
	limit int,
) ([]model.Answer, int64, error) {
	query := r.db.Model(&model.Answer{}).
		Preload("Author.Certification").
		Where("question_id = ? AND status = ?", questionID, model.StatusPublished)

	if isProfessional != nil {
		query = query.Where("is_professional = ?", *isProfessional)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderClause := fmt.Sprintf("%s %s", sortBy, order)
	var answers []model.Answer
	err := query.Order(orderClause).Offset(offset).Limit(limit).Find(&answers).Error
	return answers, total, err
}

func (r *AnswerRepo) FindByID(id string) (*model.Answer, error) {
	var a model.Answer
	err := r.db.Preload("Author.Certification").Preload("Question").
		First(&a, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AnswerRepo) FindByAuthorID(authorID string, offset, limit int) ([]model.Answer, int64, error) {
	var total int64
	r.db.Model(&model.Answer{}).Where("author_id = ?", authorID).Count(&total)

	var answers []model.Answer
	err := r.db.Preload("Question").
		Where("author_id = ?", authorID).
		Order("created_at desc").
		Offset(offset).Limit(limit).
		Find(&answers).Error
	return answers, total, err
}

func (r *AnswerRepo) CountByQuestionID(questionID string, isProfessional bool) (int64, error) {
	var count int64
	err := r.db.Model(&model.Answer{}).
		Where("question_id = ? AND is_professional = ? AND status = ?",
			questionID, isProfessional, model.StatusPublished).
		Count(&count).Error
	return count, err
}

func (r *AnswerRepo) Create(a *model.Answer) error {
	return r.db.Create(a).Error
}

func (r *AnswerRepo) Update(a *model.Answer) error {
	return r.db.Save(a).Error
}

func (r *AnswerRepo) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.Answer{}).Error
}

func (r *AnswerRepo) DeleteByQuestionID(questionID string) error {
	return r.db.Where("question_id = ?", questionID).Delete(&model.Answer{}).Error
}

func (r *AnswerRepo) FindIDsByQuestionID(questionID string) ([]string, error) {
	var ids []string
	err := r.db.Model(&model.Answer{}).Where("question_id = ?", questionID).Pluck("id", &ids).Error
	return ids, err
}

func (r *AnswerRepo) UpdateLikeCount(id string, delta int) error {
	return r.db.Model(&model.Answer{}).Where("id = ?", id).
		UpdateColumn("like_count", gorm.Expr("like_count + ?", delta)).Error
}

func (r *AnswerRepo) IncrementCommentCount(id string) error {
	return r.db.Model(&model.Answer{}).Where("id = ?", id).
		UpdateColumn("comment_count", gorm.Expr("comment_count + 1")).Error
}

func (r *AnswerRepo) DecrementCommentCount(id string, count int) error {
	return r.db.Model(&model.Answer{}).Where("id = ?", id).
		UpdateColumn("comment_count", gorm.Expr("comment_count - ?", count)).Error
}
