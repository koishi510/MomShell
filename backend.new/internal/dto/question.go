package dto

import "time"

// QuestionCreate is the request body for creating a question
type QuestionCreate struct {
	Title     string   `json:"title" binding:"required,min=1,max=200"`
	Content   string   `json:"content" binding:"required,min=1"`
	Channel   string   `json:"channel" binding:"required,oneof=professional experience"`
	ImageURLs []string `json:"image_urls"`
	TagIDs    []string `json:"tag_ids"`
}

// QuestionUpdate is the request body for updating a question
type QuestionUpdate struct {
	Title   *string  `json:"title" binding:"omitempty,min=1,max=200"`
	Content *string  `json:"content" binding:"omitempty,min=1"`
	TagIDs  []string `json:"tag_ids"`
}

// QuestionListParams holds query parameters for listing questions
type QuestionListParams struct {
	PaginationParams
	Channel string `form:"channel" binding:"omitempty,oneof=professional experience"`
	TagID   string `form:"tag_id"`
	SortBy  string `form:"sort_by" binding:"omitempty,oneof=created_at view_count answer_count like_count"`
	Order   string `form:"order" binding:"omitempty,oneof=asc desc"`
}

func (p *QuestionListParams) GetSortBy() string {
	if p.SortBy == "" {
		return "created_at"
	}
	return p.SortBy
}

func (p *QuestionListParams) GetOrder() string {
	if p.Order == "" {
		return "desc"
	}
	return p.Order
}

// QuestionListItem is a single question in list responses
type QuestionListItem struct {
	ID                string     `json:"id"`
	Title             string     `json:"title"`
	ContentPreview    string     `json:"content_preview"`
	Channel           string     `json:"channel"`
	Author            AuthorInfo `json:"author"`
	Tags              []TagInfo  `json:"tags"`
	ViewCount         int        `json:"view_count"`
	AnswerCount       int        `json:"answer_count"`
	LikeCount         int        `json:"like_count"`
	CollectionCount   int        `json:"collection_count"`
	IsPinned          bool       `json:"is_pinned"`
	IsFeatured        bool       `json:"is_featured"`
	HasAcceptedAnswer bool       `json:"has_accepted_answer"`
	IsLiked           bool       `json:"is_liked"`
	IsCollected       bool       `json:"is_collected"`
	CreatedAt         time.Time  `json:"created_at"`
}

// QuestionDetail is the full question detail
type QuestionDetail struct {
	ID                      string     `json:"id"`
	Title                   string     `json:"title"`
	Content                 string     `json:"content"`
	ContentPreview          string     `json:"content_preview"`
	Channel                 string     `json:"channel"`
	Status                  string     `json:"status"`
	Author                  AuthorInfo `json:"author"`
	Tags                    []TagInfo  `json:"tags"`
	ImageURLs               []string   `json:"image_urls"`
	ViewCount               int        `json:"view_count"`
	AnswerCount             int        `json:"answer_count"`
	LikeCount               int        `json:"like_count"`
	CollectionCount         int        `json:"collection_count"`
	IsPinned                bool       `json:"is_pinned"`
	IsFeatured              bool       `json:"is_featured"`
	HasAcceptedAnswer       bool       `json:"has_accepted_answer"`
	AcceptedAnswerID        *string    `json:"accepted_answer_id"`
	IsLiked                 bool       `json:"is_liked"`
	IsCollected             bool       `json:"is_collected"`
	ProfessionalAnswerCount int        `json:"professional_answer_count"`
	ExperienceAnswerCount   int        `json:"experience_answer_count"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
	PublishedAt             *time.Time `json:"published_at"`
}

// MyQuestionListItem is for the user's own questions list (includes status)
type MyQuestionListItem struct {
	ID                string    `json:"id"`
	Title             string    `json:"title"`
	ContentPreview    string    `json:"content_preview"`
	Channel           string    `json:"channel"`
	Tags              []TagInfo `json:"tags"`
	ViewCount         int       `json:"view_count"`
	AnswerCount       int       `json:"answer_count"`
	LikeCount         int       `json:"like_count"`
	CollectionCount   int       `json:"collection_count"`
	Status            string    `json:"status"`
	HasAcceptedAnswer bool      `json:"has_accepted_answer"`
	IsLiked           bool      `json:"is_liked"`
	IsCollected       bool      `json:"is_collected"`
	CreatedAt         time.Time `json:"created_at"`
}
