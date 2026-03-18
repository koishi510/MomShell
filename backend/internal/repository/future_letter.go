package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

type FutureLetterRepo struct {
	db *gorm.DB
}

func NewFutureLetterRepo(db *gorm.DB) *FutureLetterRepo {
	return &FutureLetterRepo{db: db}
}

func (r *FutureLetterRepo) Create(item *model.FutureLetterResponse) error {
	return r.db.Create(item).Error
}

func (r *FutureLetterRepo) FindRecentByAuthorID(authorID string, limit int) ([]model.FutureLetterResponse, error) {
	var items []model.FutureLetterResponse
	err := r.db.Where("author_id = ?", authorID).
		Order("created_at desc").
		Limit(limit).
		Find(&items).Error
	return items, err
}

func (r *FutureLetterRepo) FindRecentByRecipientID(recipientID string, limit int) ([]model.FutureLetterResponse, error) {
	var items []model.FutureLetterResponse
	err := r.db.Where("recipient_id = ?", recipientID).
		Order("created_at desc").
		Limit(limit).
		Find(&items).Error
	return items, err
}
