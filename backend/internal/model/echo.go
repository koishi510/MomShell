package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type IdentityTag struct {
	ID        string    `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserID    string    `gorm:"type:varchar(36);index;not null" json:"-"`
	TagType   string    `gorm:"type:varchar(20);not null" json:"tag_type"`
	Content   string    `gorm:"type:varchar(200);not null" json:"content"`
	CreatedAt time.Time `json:"created_at"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

func (t *IdentityTag) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}

type Memoir struct {
	ID            string    `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserID        string    `gorm:"type:varchar(36);index;not null" json:"-"`
	Title         string    `gorm:"type:varchar(200);not null" json:"title"`
	Content       string    `gorm:"type:text;not null" json:"content"`
	CoverImageURL *string   `gorm:"type:text" json:"cover_image_url"`
	Theme         *string   `gorm:"type:varchar(100)" json:"-"`
	UserRating    *int      `gorm:"type:int" json:"user_rating"`
	CreatedAt     time.Time `gorm:"index" json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

func (m *Memoir) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
