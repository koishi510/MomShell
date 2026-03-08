package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Photo struct {
	ID           string    `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserID       string    `gorm:"type:varchar(36);index;not null" json:"-"`
	Title        string    `gorm:"type:varchar(200)" json:"title"`
	Description  string    `gorm:"type:text" json:"description"`
	Tags         string    `gorm:"type:text" json:"tags"`
	ImageURL     string    `gorm:"type:varchar(500);not null" json:"image_url"`
	IsOnWall     bool      `gorm:"default:false" json:"is_on_wall"`
	WallPosition *int      `gorm:"type:int" json:"wall_position"`
	Source       string    `gorm:"type:varchar(20);not null" json:"source"`
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

func (p *Photo) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}
