package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TaskCategory enum
type TaskCategory string

const (
	TaskCategoryHousework TaskCategory = "housework"
	TaskCategoryParenting TaskCategory = "parenting"
	TaskCategoryHealth    TaskCategory = "health"
	TaskCategoryEmotional TaskCategory = "emotional"
)

// TaskStatus enum
type TaskStatus string

const (
	TaskPending   TaskStatus = "pending"
	TaskCompleted TaskStatus = "completed"
	TaskVerified  TaskStatus = "verified"
)

// DailyTask is a task template from which user tasks are generated.
type DailyTask struct {
	ID          string       `gorm:"type:varchar(36);primaryKey" json:"id"`
	Title       string       `gorm:"type:varchar(200);not null" json:"title"`
	Description string       `gorm:"type:text" json:"description"`
	Category    TaskCategory `gorm:"type:varchar(50);not null;index" json:"category"`
	Difficulty  int          `gorm:"default:1" json:"difficulty"` // 1-5
	CreatedAt   time.Time    `json:"created_at"`
}

func (t *DailyTask) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}

// UserTask is a concrete task assigned to a user on a given date.
type UserTask struct {
	ID     string `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserID string `gorm:"type:varchar(36);not null;index" json:"user_id"`
	TaskID string `gorm:"type:varchar(36);not null" json:"task_id"`

	Date   time.Time  `gorm:"type:date;not null;index" json:"date"`
	Status TaskStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`

	// Verification by partner
	Score      *int       `gorm:"type:int" json:"score"`
	Comment    *string    `gorm:"type:text" json:"comment"`
	ScoredByID *string    `gorm:"type:varchar(36)" json:"scored_by_id"`
	ScoredAt   *time.Time `json:"scored_at"`

	CompletedAt *time.Time `json:"completed_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Relationships
	User     User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Task     DailyTask `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	ScoredBy *User     `gorm:"foreignKey:ScoredByID" json:"scored_by,omitempty"`
}

func (ut *UserTask) BeforeCreate(tx *gorm.DB) error {
	if ut.ID == "" {
		ut.ID = uuid.New().String()
	}
	return nil
}
