package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ChatMemory struct {
	ID                  string `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserID              string `gorm:"type:varchar(36);uniqueIndex;not null" json:"user_id"`
	ProfileData         string `gorm:"type:text" json:"profile_data"`         // JSON
	ConversationTurns   string `gorm:"type:text" json:"conversation_turns"`   // JSON array
	ConversationSummary string `gorm:"type:text" json:"conversation_summary"` // compressed old turns

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

type FactCategory string

const (
	FactCategoryPersonalInfo FactCategory = "personal_info"
	FactCategoryFamily       FactCategory = "family"
	FactCategoryInterest     FactCategory = "interest"
	FactCategoryConcern      FactCategory = "concern"
	FactCategoryPreference   FactCategory = "preference"
	FactCategoryOther        FactCategory = "other"
)

type ChatMemoryFact struct {
	ID               string         `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserID           string         `gorm:"type:varchar(36);index;not null" json:"user_id"`
	Content          string         `gorm:"type:text;not null" json:"content"`
	Category         FactCategory   `gorm:"type:varchar(30);default:'other'" json:"category"`
	CreatedAt        time.Time      `json:"created_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
	LastReferencedAt *time.Time     `json:"last_referenced_at"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

func (f *ChatMemoryFact) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.New().String()
	}
	return nil
}

func (m *ChatMemory) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}

func (m *ChatMemory) GetProfile() map[string]interface{} {
	if m.ProfileData == "" {
		return make(map[string]interface{})
	}
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(m.ProfileData), &result); err != nil {
		return make(map[string]interface{})
	}
	return result
}

func (m *ChatMemory) SetProfile(data map[string]interface{}) {
	b, _ := json.Marshal(data)
	m.ProfileData = string(b)
}

func (m *ChatMemory) GetTurns() []map[string]interface{} {
	if m.ConversationTurns == "" {
		return nil
	}
	var result []map[string]interface{}
	if err := json.Unmarshal([]byte(m.ConversationTurns), &result); err != nil {
		return nil
	}
	return result
}

func (m *ChatMemory) SetTurns(turns []map[string]interface{}) {
	b, _ := json.Marshal(turns)
	m.ConversationTurns = string(b)
}

func (m *ChatMemory) GetSummary() string {
	return m.ConversationSummary
}

func (m *ChatMemory) SetSummary(summary string) {
	m.ConversationSummary = summary
}
