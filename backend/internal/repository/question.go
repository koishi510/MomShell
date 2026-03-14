package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

var allowedQuestionSortColumns = map[string]string{
	"created_at":   "questions.created_at",
	"view_count":   "questions.view_count",
	"answer_count": "questions.answer_count",
	"like_count":   "questions.like_count",
}

func sanitizeQuestionSort(sortBy, order string) string {
	col, ok := allowedQuestionSortColumns[sortBy]
	if !ok {
		col = "questions.created_at"
	}
	dir, ok := allowedSortOrders[order]
	if !ok {
		dir = "desc"
	}
	return col + " " + dir
}

type QuestionRepo struct {
	db *gorm.DB
}

func NewQuestionRepo(db *gorm.DB) *QuestionRepo {
	return &QuestionRepo{db: db}
}

func (r *QuestionRepo) FindAll(
	channel string,
	tagID string,
	status model.ContentStatus,
	sortBy string,
	order string,
	offset int,
	limit int,
) ([]model.Question, int64, error) {
	query := r.db.Model(&model.Question{}).
		Preload("Author.Certification").
		Preload("Tags").
		Where("questions.status = ?", status)

	if channel != "" {
		query = query.Where("questions.channel = ?", channel)
	}

	if tagID != "" {
		query = query.Joins("JOIN question_tags ON question_tags.question_id = questions.id").
			Where("question_tags.tag_id = ?", tagID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var questions []model.Question
	err := query.Order(sanitizeQuestionSort(sortBy, order)).Offset(offset).Limit(limit).Find(&questions).Error
	return questions, total, err
}

func (r *QuestionRepo) FindByID(id string) (*model.Question, error) {
	var q model.Question
	err := r.db.Preload("Author.Certification").
		Preload("Tags").
		First(&q, whereID, id).Error
	if err != nil {
		return nil, err
	}
	return &q, nil
}

func (r *QuestionRepo) FindByAuthorID(authorID string, offset, limit int) ([]model.Question, int64, error) {
	var total int64
	r.db.Model(&model.Question{}).Where(whereAuthorID, authorID).Count(&total)

	var questions []model.Question
	err := r.db.Preload("Tags").
		Where(whereAuthorID, authorID).
		Order(orderCreatedAtDesc).
		Offset(offset).Limit(limit).
		Find(&questions).Error
	return questions, total, err
}

func (r *QuestionRepo) Create(q *model.Question) error {
	return r.db.Create(q).Error
}

func (r *QuestionRepo) Update(q *model.Question) error {
	return r.db.Save(q).Error
}

func (r *QuestionRepo) Delete(id string) error {
	return r.db.Where(whereID, id).Delete(&model.Question{}).Error
}

func (r *QuestionRepo) IncrementViewCount(id string) error {
	return r.db.Model(&model.Question{}).Where(whereID, id).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error
}

func (r *QuestionRepo) IncrementAnswerCount(id string) error {
	return r.db.Model(&model.Question{}).Where(whereID, id).
		UpdateColumn("answer_count", gorm.Expr("answer_count + 1")).Error
}

func (r *QuestionRepo) DecrementAnswerCount(id string) error {
	return r.db.Model(&model.Question{}).Where(whereID, id).
		UpdateColumn("answer_count", gorm.Expr("answer_count - 1")).Error
}

func (r *QuestionRepo) UpdateLikeCount(id string, delta int) error {
	return r.db.Model(&model.Question{}).Where(whereID, id).
		UpdateColumn("like_count", gorm.Expr("like_count + ?", delta)).Error
}

func (r *QuestionRepo) UpdateCollectionCount(id string, delta int) error {
	return r.db.Model(&model.Question{}).Where(whereID, id).
		UpdateColumn("collection_count", gorm.Expr("collection_count + ?", delta)).Error
}
