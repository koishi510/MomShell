package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserRole enum
type UserRole string

const (
	RoleGuest              UserRole = "guest"
	RoleMom                UserRole = "mom"
	RoleDad                UserRole = "dad"
	RoleCertifiedDoctor    UserRole = "certified_doctor"
	RoleCertifiedTherapist UserRole = "certified_therapist"
	RoleCertifiedNurse     UserRole = "certified_nurse"
	RoleAIAssistant        UserRole = "ai_assistant"
)

var ProfessionalRoles = map[UserRole]bool{
	RoleCertifiedDoctor:    true,
	RoleCertifiedTherapist: true,
	RoleCertifiedNurse:     true,
}

var FamilyRoles = map[UserRole]bool{
	RoleMom: true,
	RoleDad: true,
}

// CertificationStatus enum
type CertificationStatus string

const (
	CertPending  CertificationStatus = "pending"
	CertApproved CertificationStatus = "approved"
	CertRejected CertificationStatus = "rejected"
	CertExpired  CertificationStatus = "expired"
	CertRevoked  CertificationStatus = "revoked"
)

type User struct {
	ID           string   `gorm:"type:varchar(36);primaryKey" json:"id"`
	Username     string   `gorm:"type:varchar(50);uniqueIndex;not null" json:"username"`
	Email        string   `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash string   `gorm:"type:varchar(255);not null" json:"-"`
	Nickname     string   `gorm:"type:varchar(50);not null" json:"nickname"`
	AvatarURL    *string  `gorm:"type:varchar(500)" json:"avatar_url"`
	Role         UserRole `gorm:"type:varchar(30);default:'mom'" json:"role"`
	ShellCode    *string  `gorm:"type:varchar(8);uniqueIndex" json:"shell_code"`
	IsGuest      bool     `gorm:"default:false" json:"is_guest"`
	IsAdmin      bool     `gorm:"default:false" json:"is_admin"`
	PartnerID    *string  `gorm:"type:varchar(36)" json:"partner_id"`

	// Postpartum info
	BabyBirthDate   *time.Time `json:"baby_birth_date"`
	PostpartumWeeks *int       `json:"postpartum_weeks"`

	// Status
	IsActive bool `gorm:"default:true" json:"is_active"`
	IsBanned bool `gorm:"default:false" json:"is_banned"`

	// Timestamps
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	LastActiveAt *time.Time `json:"last_active_at"`

	// Relationships
	Certification *UserCertification `gorm:"foreignKey:UserID" json:"certification,omitempty"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

type UserCertification struct {
	ID     string `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserID string `gorm:"type:varchar(36);uniqueIndex;not null" json:"user_id"`

	// Certification info
	CertificationType     UserRole `gorm:"type:varchar(30)" json:"certification_type"`
	RealName              string   `gorm:"type:varchar(50);not null" json:"real_name"`
	IDCardNumber          *string  `gorm:"type:varchar(18)" json:"id_card_number"`
	LicenseNumber         string   `gorm:"type:varchar(100);not null" json:"license_number"`
	HospitalOrInstitution string   `gorm:"type:varchar(200);not null" json:"hospital_or_institution"`
	Department            *string  `gorm:"type:varchar(100)" json:"department"`
	Title                 *string  `gorm:"type:varchar(50)" json:"title"`

	// Supporting documents
	LicenseImageURL    string  `gorm:"type:varchar(500);not null" json:"license_image_url"`
	IDCardImageURL     *string `gorm:"type:varchar(500)" json:"id_card_image_url"`
	AdditionalDocsURLs *string `gorm:"type:text" json:"additional_docs_urls"` // JSON array

	// Review status
	Status        CertificationStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`
	ReviewerID    *string             `gorm:"type:varchar(36)" json:"reviewer_id"`
	ReviewComment *string             `gorm:"type:text" json:"review_comment"`
	ReviewedAt    *time.Time          `json:"reviewed_at"`

	// Validity
	ValidFrom  *time.Time `json:"valid_from"`
	ValidUntil *time.Time `json:"valid_until"`

	// Timestamps
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

func (c *UserCertification) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
