package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ChatRepo struct {
	db *gorm.DB
}

func NewChatRepo(db *gorm.DB) *ChatRepo {
	return &ChatRepo{db: db}
}

func (r *ChatRepo) FindByUserID(userID string) (*model.ChatMemory, error) {
	var m model.ChatMemory
	result := r.db.Where("user_id = ?", userID).Limit(1).Find(&m)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &m, nil
}

func (r *ChatRepo) Upsert(m *model.ChatMemory) error {
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"profile_data", "conversation_turns", "updated_at"}),
	}).Create(m).Error
}

func (r *ChatRepo) Create(m *model.ChatMemory) error {
	return r.db.Create(m).Error
}
