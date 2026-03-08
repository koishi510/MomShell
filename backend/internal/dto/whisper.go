package dto

import "time"

type WhisperCreate struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

type WhisperItem struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type WhisperTips struct {
	Tips     string        `json:"tips"`
	Whispers []WhisperItem `json:"whispers"`
}
