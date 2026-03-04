package dto

// TagCreate is the request body for creating a tag
type TagCreate struct {
	Name        string  `json:"name" binding:"required,min=1,max=50"`
	Slug        string  `json:"slug" binding:"required,min=1,max=50"`
	Description *string `json:"description"`
}

// TagUpdate is the request body for updating a tag
type TagUpdate struct {
	Name        *string `json:"name" binding:"omitempty,min=1,max=50"`
	Slug        *string `json:"slug" binding:"omitempty,min=1,max=50"`
	Description *string `json:"description"`
}

// TagInfo is a brief tag info for embedding in other responses
type TagInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// TagListItem is a single tag in list responses
type TagListItem struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Slug          string  `json:"slug"`
	Description   *string `json:"description"`
	QuestionCount int     `json:"question_count"`
	FollowerCount int     `json:"follower_count"`
	IsActive      bool    `json:"is_active"`
	IsFeatured    bool    `json:"is_featured"`
}
