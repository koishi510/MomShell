package dto

import "time"

// CommentCreate is the request body for creating a comment
type CommentCreate struct {
	Content  string  `json:"content" binding:"required,min=1,max=10000"`
	ParentID *string `json:"parent_id"`
}

// CommentListItem is a single comment (with nested replies)
type CommentListItem struct {
	ID          string            `json:"id"`
	AnswerID    string            `json:"answer_id"`
	Author      AuthorInfo        `json:"author"`
	Content     string            `json:"content"`
	ParentID    *string           `json:"parent_id"`
	ReplyToUser *AuthorInfo       `json:"reply_to_user"`
	LikeCount   int               `json:"like_count"`
	IsLiked     bool              `json:"is_liked"`
	CreatedAt   time.Time         `json:"created_at"`
	Replies     []CommentListItem `json:"replies"`
}
