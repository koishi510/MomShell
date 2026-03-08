package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Whisper struct {
	ID        string    `gorm:"type:varchar(36);primaryKey" json:"id"`
	AuthorID  string    `gorm:"type:varchar(36);index;not null" json:"author_id"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`

	// Relationships
	Author User `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}

func (w *Whisper) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = uuid.New().String()
	}
	return nil
}
