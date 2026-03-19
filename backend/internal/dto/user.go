package dto

import "time"

// UserProfile is the response for user profile
type UserProfile struct {
	ID                 string       `json:"id"`
	Username           string       `json:"username"`
	Nickname           string       `json:"nickname"`
	Email              string       `json:"email"`
	AvatarURL          *string      `json:"avatar_url"`
	Role               string       `json:"role"`
	DadChatStyle       string       `json:"dad_chat_style"`
	IsAdmin            bool         `json:"is_admin"`
	ShellCode          *string      `json:"shell_code"`
	Partner            *PartnerInfo `json:"partner"`
	IsCertified        bool         `json:"is_certified"`
	CertificationTitle *string      `json:"certification_title"`
	Stats              UserStats    `json:"stats"`
	CreatedAt          time.Time    `json:"created_at"`
}

// PartnerInfo is the partner summary shown in profile
type PartnerInfo struct {
	ID        string  `json:"id"`
	Nickname  string  `json:"nickname"`
	AvatarURL *string `json:"avatar_url"`
	Role      string  `json:"role"`
}

// UserStats holds user statistics
type UserStats struct {
	QuestionCount     int `json:"question_count"`
	AnswerCount       int `json:"answer_count"`
	LikeReceivedCount int `json:"like_received_count"`
	CollectionCount   int `json:"collection_count"`
}

// UserProfileUpdate is the request body for updating user profile
type UserProfileUpdate struct {
	Username     *string `json:"username" binding:"omitempty,min=3,max=50"`
	Nickname     *string `json:"nickname" binding:"omitempty,min=1,max=50"`
	Email        *string `json:"email" binding:"omitempty,email"`
	AvatarURL    *string `json:"avatar_url"`
	Role         *string `json:"role" binding:"omitempty,oneof=mom dad"`
	DadChatStyle *string `json:"dad_chat_style" binding:"omitempty,oneof=terminal ambient"`
}

// BindPartnerRequest is the request body for binding a partner via shell code
type BindPartnerRequest struct {
	ShellCode string `json:"shell_code" binding:"required"`
}
