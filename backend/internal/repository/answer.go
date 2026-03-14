package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

var allowedAnswerSortColumns = map[string]string{
	"created_at": "created_at",
	"like_count": "like_count",
}

func sanitizeAnswerSort(sortBy, order string) string {
	col, ok := allowedAnswerSortColumns[sortBy]
	if !ok {
		col = "created_at"
	}
	dir, ok := allowedSortOrders[order]
	if !ok {
		dir = "desc"
	}
	return col + " " + dir
}

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
		Where(whereQuestionID+" AND status = ?", questionID, model.StatusPublished)

	if isProfessional != nil {
		query = query.Where("is_professional = ?", *isProfessional)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var answers []model.Answer
	err := query.Order(sanitizeAnswerSort(sortBy, order)).Offset(offset).Limit(limit).Find(&answers).Error
	return answers, total, err
}

func (r *AnswerRepo) FindByID(id string) (*model.Answer, error) {
	var a model.Answer
	err := r.db.Preload("Author.Certification").Preload("Question").
		First(&a, whereID, id).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AnswerRepo) FindByAuthorID(authorID string, offset, limit int) ([]model.Answer, int64, error) {
	var total int64
	r.db.Model(&model.Answer{}).Where(whereAuthorID, authorID).Count(&total)

	var answers []model.Answer
	err := r.db.Preload("Question").
		Where(whereAuthorID, authorID).
		Order(orderCreatedAtDesc).
		Offset(offset).Limit(limit).
		Find(&answers).Error
	return answers, total, err
}

func (r *AnswerRepo) CountByQuestionID(questionID string, isProfessional bool) (int64, error) {
	var count int64
	err := r.db.Model(&model.Answer{}).
		Where(whereQuestionID+" AND is_professional = ? AND status = ?",
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
	return r.db.Where(whereID, id).Delete(&model.Answer{}).Error
}

func (r *AnswerRepo) DeleteByQuestionID(questionID string) error {
	return r.db.Where(whereQuestionID, questionID).Delete(&model.Answer{}).Error
}

func (r *AnswerRepo) FindIDsByQuestionID(questionID string) ([]string, error) {
	var ids []string
	err := r.db.Model(&model.Answer{}).Where(whereQuestionID, questionID).Pluck("id", &ids).Error
	return ids, err
}

func (r *AnswerRepo) UpdateLikeCount(id string, delta int) error {
	return r.db.Model(&model.Answer{}).Where(whereID, id).
		UpdateColumn("like_count", gorm.Expr("like_count + ?", delta)).Error
}

func (r *AnswerRepo) IncrementCommentCount(id string) error {
	return r.db.Model(&model.Answer{}).Where(whereID, id).
		UpdateColumn("comment_count", gorm.Expr("comment_count + 1")).Error
}

func (r *AnswerRepo) DecrementCommentCount(id string, count int) error {
	return r.db.Model(&model.Answer{}).Where(whereID, id).
		UpdateColumn("comment_count", gorm.Expr("comment_count - ?", count)).Error
}
