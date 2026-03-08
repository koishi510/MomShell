package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

type WhisperRepo struct {
	db *gorm.DB
}

func NewWhisperRepo(db *gorm.DB) *WhisperRepo {
	return &WhisperRepo{db: db}
}

func (r *WhisperRepo) Create(w *model.Whisper) error {
	return r.db.Create(w).Error
}

func (r *WhisperRepo) FindByAuthorID(authorID string, limit int) ([]model.Whisper, error) {
	var whispers []model.Whisper
	err := r.db.Where("author_id = ?", authorID).
		Order("created_at desc").
		Limit(limit).
		Find(&whispers).Error
	return whispers, err
}
