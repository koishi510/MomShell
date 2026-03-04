package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Like struct {
	ID         string `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserID     string `gorm:"type:varchar(36);index;not null" json:"user_id"`
	TargetType string `gorm:"type:varchar(20);index;not null" json:"target_type"` // question, answer, comment
	TargetID   string `gorm:"type:varchar(36);index;not null" json:"target_id"`
	CreatedAt  time.Time `json:"created_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

func (l *Like) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	return nil
}

// TableName overrides
func (Like) TableName() string { return "likes" }

type Collection struct {
	ID         string  `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserID     string  `gorm:"type:varchar(36);index;not null" json:"user_id"`
	QuestionID string  `gorm:"type:varchar(36);index;not null" json:"question_id"`
	FolderName *string `gorm:"type:varchar(50)" json:"folder_name"`
	Note       *string `gorm:"type:varchar(500)" json:"note"`
	CreatedAt  time.Time `json:"created_at"`

	// Relationships
	User     User     `gorm:"foreignKey:UserID" json:"-"`
	Question Question `gorm:"foreignKey:QuestionID" json:"question,omitempty"`
}

func (c *Collection) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// ModerationResult enum
type ModerationResult string

const (
	ModerationPassed          ModerationResult = "passed"
	ModerationRejected        ModerationResult = "rejected"
	ModerationNeedManualReview ModerationResult = "need_manual_review"
)

type ModerationLog struct {
	ID                  string            `gorm:"type:varchar(36);primaryKey" json:"id"`
	TargetType          string            `gorm:"type:varchar(20);index;not null" json:"target_type"`
	TargetID            string            `gorm:"type:varchar(36);index;not null" json:"target_id"`
	ModerationType      string            `gorm:"type:varchar(20);not null" json:"moderation_type"` // auto, manual
	Result              ModerationResult  `gorm:"type:varchar(30);not null" json:"result"`
	SensitiveCategories *string           `gorm:"type:text" json:"sensitive_categories"` // JSON array
	ConfidenceScore     *float64          `json:"confidence_score"`
	Reason              *string           `gorm:"type:text" json:"reason"`
	OriginalContent     *string           `gorm:"type:text" json:"original_content"`
	ReviewerID          *string           `gorm:"type:varchar(36)" json:"reviewer_id"`
	CreatedAt           time.Time         `json:"created_at"`
}

func (m *ModerationLog) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
