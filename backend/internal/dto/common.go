package dto

import "time"

// PaginationParams holds pagination query parameters
type PaginationParams struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
}

func (p *PaginationParams) GetPage() int {
	if p.Page <= 0 {
		return 1
	}
	return p.Page
}

func (p *PaginationParams) GetPageSize() int {
	if p.PageSize <= 0 {
		return 20
	}
	return p.PageSize
}

func (p *PaginationParams) GetOffset() int {
	return (p.GetPage() - 1) * p.GetPageSize()
}

// PaginatedResponse is a generic paginated response
type PaginatedResponse struct {
	Items      interface{} `json:"items"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int64       `json:"total_pages"`
}

func NewPaginatedResponse(items interface{}, total int64, page, pageSize int) PaginatedResponse {
	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)
	return PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}
}

// AuthorInfo holds basic author info for responses
type AuthorInfo struct {
	ID                 string  `json:"id"`
	Nickname           string  `json:"nickname"`
	AvatarURL          *string `json:"avatar_url"`
	Role               string  `json:"role"`
	DisplayTag         string  `json:"display_tag"`
	IsCertified        bool    `json:"is_certified"`
	CertificationTitle *string `json:"certification_title"`
}

// ErrorResponse is a standard error response
type ErrorResponse struct {
	Error  string      `json:"error"`
	Detail interface{} `json:"detail,omitempty"`
}

// SuccessResponse is a standard success response
type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// TimestampResponse used for items with timestamps
type TimestampResponse struct {
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
