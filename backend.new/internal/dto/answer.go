package dto

import "time"

// AnswerCreate is the request body for creating an answer
type AnswerCreate struct {
	Content   string   `json:"content" binding:"required,min=1"`
	ImageURLs []string `json:"image_urls"`
}

// AnswerUpdate is the request body for updating an answer
type AnswerUpdate struct {
	Content *string `json:"content" binding:"omitempty,min=1"`
}

// AnswerListParams holds query parameters for listing answers
type AnswerListParams struct {
	PaginationParams
	IsProfessional *bool  `form:"is_professional"`
	SortBy         string `form:"sort_by" binding:"omitempty,oneof=created_at like_count"`
	Order          string `form:"order" binding:"omitempty,oneof=asc desc"`
}

func (p *AnswerListParams) GetSortBy() string {
	if p.SortBy == "" {
		return "created_at"
	}
	return p.SortBy
}

func (p *AnswerListParams) GetOrder() string {
	if p.Order == "" {
		return "desc"
	}
	return p.Order
}

// AnswerListItem is a single answer in list responses
type AnswerListItem struct {
	ID             string     `json:"id"`
	QuestionID     string     `json:"question_id"`
	Author         AuthorInfo `json:"author"`
	Content        string     `json:"content"`
	ContentPreview string     `json:"content_preview"`
	IsProfessional bool       `json:"is_professional"`
	IsAccepted     bool       `json:"is_accepted"`
	LikeCount      int        `json:"like_count"`
	CommentCount   int        `json:"comment_count"`
	IsLiked        bool       `json:"is_liked"`
	CreatedAt      time.Time  `json:"created_at"`
}

// MyAnswerListItem is for the user's own answers list
type MyAnswerListItem struct {
	ID             string        `json:"id"`
	ContentPreview string        `json:"content_preview"`
	Question       QuestionBrief `json:"question"`
	IsProfessional bool          `json:"is_professional"`
	IsAccepted     bool          `json:"is_accepted"`
	LikeCount      int           `json:"like_count"`
	CommentCount   int           `json:"comment_count"`
	Status         string        `json:"status"`
	IsLiked        bool          `json:"is_liked"`
	CreatedAt      time.Time     `json:"created_at"`
}

// QuestionBrief is a brief question for context in answer lists
type QuestionBrief struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Channel string `json:"channel"`
}
