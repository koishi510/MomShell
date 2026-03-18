package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FutureLetterResponse stores a structured reply to the "future self" letter flow.
type FutureLetterResponse struct {
	ID string `gorm:"type:varchar(36);primaryKey" json:"id"`

	AuthorID    string `gorm:"type:varchar(36);index;not null" json:"author_id"`
	RecipientID string `gorm:"type:varchar(36);index;not null" json:"recipient_id"`
	LetterCode  string `gorm:"type:varchar(60);index;not null" json:"letter_code"`

	StageTag   string `gorm:"type:varchar(40);index;not null" json:"stage_tag"`
	StageLabel string `gorm:"type:varchar(120);not null" json:"stage_label"`
	StateTag   string `gorm:"type:varchar(40);index;not null" json:"state_tag"`
	StateLabel string `gorm:"type:varchar(120);not null" json:"state_label"`

	WishContent *string `gorm:"type:text" json:"wish_content"`

	DadPlanCode          string `gorm:"type:varchar(60);index;not null" json:"dad_plan_code"`
	DadPlanTitle         string `gorm:"type:varchar(160);not null" json:"dad_plan_title"`
	DadHeadline          string `gorm:"type:text;not null" json:"dad_headline"`
	DadSummary           string `gorm:"type:text;not null" json:"dad_summary"`
	DadTasksJSON         string `gorm:"type:text;not null" json:"dad_tasks_json"`
	DadAdviceSourcesJSON string `gorm:"type:text" json:"dad_advice_sources_json"`

	ImagePrompt string    `gorm:"type:text;not null" json:"image_prompt"`
	CreatedAt   time.Time `gorm:"index" json:"created_at"`

	Author    User `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	Recipient User `gorm:"foreignKey:RecipientID" json:"recipient,omitempty"`
}

func (r *FutureLetterResponse) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}
