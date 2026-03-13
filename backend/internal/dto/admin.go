package dto

import "time"

// AdminUserListParams holds query parameters for admin user listing
type AdminUserListParams struct {
	PaginationParams
	Search string `form:"search"`
	Role   string `form:"role"`
	Status string `form:"status"` // active, banned, inactive
}

// AdminUserListItem is a user row in admin user list
type AdminUserListItem struct {
	ID                string    `json:"id"`
	Username          string    `json:"username"`
	Email             string    `json:"email"`
	Nickname          string    `json:"nickname"`
	Role              string    `json:"role"`
	IsAdmin           bool      `json:"is_admin"`
	IsActive          bool      `json:"is_active"`
	IsBanned          bool      `json:"is_banned"`
	IsGuest           bool      `json:"is_guest"`
	TutorialCompleted bool      `json:"tutorial_completed"`
	CreatedAt         time.Time `json:"created_at"`
}

// AdminUserDetail is the full user detail for admin view
type AdminUserDetail struct {
	ID                string     `json:"id"`
	Username          string     `json:"username"`
	Email             string     `json:"email"`
	Nickname          string     `json:"nickname"`
	AvatarURL         *string    `json:"avatar_url"`
	Role              string     `json:"role"`
	IsAdmin           bool       `json:"is_admin"`
	ShellCode         *string    `json:"shell_code"`
	IsGuest           bool       `json:"is_guest"`
	IsActive          bool       `json:"is_active"`
	IsBanned          bool       `json:"is_banned"`
	TutorialCompleted bool       `json:"tutorial_completed"`
	PartnerID         *string    `json:"partner_id"`
	BabyBirthDate     *time.Time `json:"baby_birth_date"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	LastActiveAt      *time.Time `json:"last_active_at"`

	// Certification info
	CertificationStatus *string `json:"certification_status,omitempty"`
	CertificationType   *string `json:"certification_type,omitempty"`
}

// AdminCreateUser is the request body for creating a user via admin
type AdminCreateUser struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Nickname string `json:"nickname" binding:"required,min=1,max=50"`
	Role     string `json:"role" binding:"required"`
}

// AdminUserUpdate is the request body for updating a user via admin
type AdminUserUpdate struct {
	Role     *string `json:"role"`
	IsAdmin  *bool   `json:"is_admin"`
	IsActive *bool   `json:"is_active"`
	IsBanned *bool   `json:"is_banned"`
	Nickname *string `json:"nickname"`
	Email    *string `json:"email"`
}

// DashboardStats holds statistics for the admin dashboard
type DashboardStats struct {
	TotalUsers          int64            `json:"total_users"`
	ActiveUsers         int64            `json:"active_users"`
	BannedUsers         int64            `json:"banned_users"`
	GuestUsers          int64            `json:"guest_users"`
	RoleDistribution    map[string]int64 `json:"role_distribution"`
	TotalQuestions      int64            `json:"total_questions"`
	TotalAnswers        int64            `json:"total_answers"`
	TotalCertifications int64            `json:"total_certifications"`
	TotalPhotos         int64            `json:"total_photos"`
	WallPhotos          int64            `json:"wall_photos"`
}

// ConfigItem represents a single configuration item
type ConfigItem struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Editable bool   `json:"editable"`
}

// ConfigUpdateRequest is the request body for updating configuration
type ConfigUpdateRequest struct {
	Items map[string]string `json:"items" binding:"required"`
}

// AdminPhotoListParams holds query parameters for admin photo listing
type AdminPhotoListParams struct {
	PaginationParams
	Search string `form:"search"`
	UserID string `form:"user_id"`
	Source string `form:"source"`
	OnWall string `form:"on_wall"`
}

// AdminPhotoListItem is a photo row in admin photo list
type AdminPhotoListItem struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	Title     string    `json:"title"`
	ImageURL  string    `json:"image_url"`
	IsOnWall  bool      `json:"is_on_wall"`
	Source    string    `json:"source"`
	CreatedAt time.Time `json:"created_at"`
}
