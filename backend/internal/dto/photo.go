package dto

type PhotoResponse struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Tags         []string `json:"tags"`
	ImageURL     string   `json:"image_url"`
	IsOnWall     bool     `json:"is_on_wall"`
	WallPosition *int     `json:"wall_position"`
	Source       string   `json:"source"`
	CreatedAt    string   `json:"created_at"`
	UpdatedAt    string   `json:"updated_at"`
}

type PhotoListResponse struct {
	Photos     []PhotoResponse `json:"photos"`
	Total      int64           `json:"total"`
	Page       int             `json:"page"`
	PageSize   int             `json:"page_size"`
	TotalPages int             `json:"total_pages"`
}

type GeneratePhotoRequest struct {
	Prompt string `json:"prompt" binding:"required,min=1,max=500"`
}

type UpdatePhotoRequest struct {
	Title       *string  `json:"title" binding:"omitempty,max=200"`
	Description *string  `json:"description" binding:"omitempty,max=2000"`
	Tags        []string `json:"tags" binding:"omitempty,max=10"`
}

type ToggleWallRequest struct {
	IsOnWall     bool `json:"is_on_wall"`
	WallPosition *int `json:"wall_position" binding:"omitempty,min=0,max=8"`
}

type BatchWallUpdateRequest struct {
	Photos []WallItem `json:"photos" binding:"required,min=1,max=9"`
}

type WallItem struct {
	PhotoID  string `json:"photo_id" binding:"required"`
	Position int    `json:"position" binding:"min=0,max=8"`
}
