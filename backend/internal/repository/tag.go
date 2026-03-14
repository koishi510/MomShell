package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

type TagRepo struct {
	db *gorm.DB
}

func NewTagRepo(db *gorm.DB) *TagRepo {
	return &TagRepo{db: db}
}

func (r *TagRepo) FindAll() ([]model.Tag, error) {
	var tags []model.Tag
	err := r.db.Where(whereIsActive, true).Order("name asc").Find(&tags).Error
	return tags, err
}

func (r *TagRepo) FindHot(limit int) ([]model.Tag, error) {
	var tags []model.Tag
	err := r.db.Where(whereIsActive, true).
		Order("question_count desc").
		Limit(limit).
		Find(&tags).Error
	return tags, err
}

func (r *TagRepo) FindByID(id string) (*model.Tag, error) {
	var tag model.Tag
	err := r.db.First(&tag, whereID, id).Error
	if err != nil {
		return nil, err
	}
	return &tag, nil
}

func (r *TagRepo) Create(tag *model.Tag) error {
	return r.db.Create(tag).Error
}

func (r *TagRepo) Update(tag *model.Tag) error {
	return r.db.Save(tag).Error
}

func (r *TagRepo) Delete(id string) error {
	return r.db.Where(whereID, id).Delete(&model.Tag{}).Error
}

func (r *TagRepo) IncrementQuestionCount(id string) error {
	return r.db.Model(&model.Tag{}).Where(whereID, id).
		UpdateColumn("question_count", gorm.Expr("question_count + 1")).Error
}

// QuestionTag operations

func (r *TagRepo) CreateQuestionTag(qt *model.QuestionTag) error {
	return r.db.Create(qt).Error
}

func (r *TagRepo) DeleteQuestionTags(questionID string) error {
	return r.db.Where(whereQuestionID, questionID).Delete(&model.QuestionTag{}).Error
}
