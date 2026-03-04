package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Tag struct {
	ID          string `gorm:"type:varchar(36);primaryKey" json:"id"`
	Name        string `gorm:"type:varchar(50);uniqueIndex;not null" json:"name"`
	Slug        string `gorm:"type:varchar(50);uniqueIndex;not null" json:"slug"`
	Description *string `gorm:"type:varchar(200)" json:"description"`

	// Statistics
	QuestionCount int `gorm:"default:0" json:"question_count"`
	FollowerCount int `gorm:"default:0" json:"follower_count"`

	// Status
	IsActive   bool `gorm:"default:true" json:"is_active"`
	IsFeatured bool `gorm:"default:false" json:"is_featured"`

	CreatedAt time.Time `json:"created_at"`

	// Relationships
	Questions []Question `gorm:"many2many:question_tags" json:"questions,omitempty"`
}

func (t *Tag) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}

type QuestionTag struct {
	QuestionID string    `gorm:"type:varchar(36);primaryKey" json:"question_id"`
	TagID      string    `gorm:"type:varchar(36);primaryKey" json:"tag_id"`
	CreatedAt  time.Time `json:"created_at"`
}

func (QuestionTag) TableName() string { return "question_tags" }
