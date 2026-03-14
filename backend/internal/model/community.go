package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ChannelType enum
type ChannelType string

const (
	ChannelProfessional ChannelType = "professional"
	ChannelExperience   ChannelType = "experience"
)

// ContentStatus enum
type ContentStatus string

const (
	StatusDraft         ContentStatus = "draft"
	StatusPendingReview ContentStatus = "pending_review"
	StatusPublished     ContentStatus = "published"
	StatusHidden        ContentStatus = "hidden"
	StatusDeleted       ContentStatus = "deleted"
)

type Question struct {
	ID       string `gorm:"type:varchar(36);primaryKey" json:"id"`
	AuthorID string `gorm:"type:varchar(36);index;not null" json:"author_id"`

	// Content
	Title     string  `gorm:"type:varchar(200);index;not null" json:"title"`
	Content   string  `gorm:"type:text;not null" json:"content"`
	ImageURLs *string `gorm:"type:text" json:"image_urls"` // JSON array

	// Channel
	Channel ChannelType `gorm:"type:varchar(20);index;default:'experience'" json:"channel"`

	// Status
	Status ContentStatus `gorm:"type:varchar(20);index;default:'pending_review'" json:"status"`

	// Statistics
	ViewCount       int `gorm:"default:0" json:"view_count"`
	AnswerCount     int `gorm:"default:0" json:"answer_count"`
	LikeCount       int `gorm:"default:0" json:"like_count"`
	CollectionCount int `gorm:"default:0" json:"collection_count"`

	// Flags
	IsPinned   bool `gorm:"default:false" json:"is_pinned"`
	IsFeatured bool `gorm:"default:false" json:"is_featured"`

	// Accepted answer
	AcceptedAnswerID *string `gorm:"type:varchar(36)" json:"accepted_answer_id"`

	// Timestamps
	CreatedAt   time.Time  `gorm:"index" json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	PublishedAt *time.Time `json:"published_at"`

	// Relationships
	Author  User     `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	Answers []Answer `gorm:"foreignKey:QuestionID" json:"answers,omitempty"`
	Tags    []Tag    `gorm:"many2many:question_tags" json:"tags,omitempty"`
}

func (q *Question) BeforeCreate(tx *gorm.DB) error {
	if q.ID == "" {
		q.ID = uuid.New().String()
	}
	return nil
}

type Answer struct {
	ID         string `gorm:"type:varchar(36);primaryKey" json:"id"`
	QuestionID string `gorm:"type:varchar(36);index;not null" json:"question_id"`
	AuthorID   string `gorm:"type:varchar(36);index;not null" json:"author_id"`

	// Content
	Content   string  `gorm:"type:text;not null" json:"content"`
	ImageURLs *string `gorm:"type:text" json:"image_urls"`

	// Author role info
	AuthorRole     UserRole `gorm:"type:varchar(30);index" json:"author_role"`
	IsProfessional bool     `gorm:"index;default:false" json:"is_professional"`

	// Expert post: only certified professionals can publish
	IsExpertPost bool    `gorm:"index;default:false" json:"is_expert_post"`
	Sources      *string `gorm:"type:text" json:"sources"` // Required for expert posts

	// Status
	Status ContentStatus `gorm:"type:varchar(20);index;default:'pending_review'" json:"status"`

	// Statistics
	LikeCount    int `gorm:"default:0" json:"like_count"`
	CommentCount int `gorm:"default:0" json:"comment_count"`

	// Accepted
	IsAccepted bool `gorm:"default:false" json:"is_accepted"`

	// Timestamps
	CreatedAt time.Time `gorm:"index" json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	Author   User      `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	Question Question  `gorm:"foreignKey:QuestionID" json:"-"`
	Comments []Comment `gorm:"foreignKey:AnswerID" json:"comments,omitempty"`
}

func (a *Answer) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}

type Comment struct {
	ID       string `gorm:"type:varchar(36);primaryKey" json:"id"`
	AnswerID string `gorm:"type:varchar(36);index;not null" json:"answer_id"`
	AuthorID string `gorm:"type:varchar(36);index;not null" json:"author_id"`

	// Nested reply
	ParentID      *string `gorm:"type:varchar(36)" json:"parent_id"`
	ReplyToUserID *string `gorm:"type:varchar(36)" json:"reply_to_user_id"`

	// Content
	Content string `gorm:"type:text;not null" json:"content"`

	// Status
	Status ContentStatus `gorm:"type:varchar(20);default:'pending_review'" json:"status"`

	// Statistics
	LikeCount int `gorm:"default:0" json:"like_count"`

	// Timestamps
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	Author      User   `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	Answer      Answer `gorm:"foreignKey:AnswerID" json:"-"`
	ReplyToUser *User  `gorm:"foreignKey:ReplyToUserID" json:"reply_to_user,omitempty"`
}

func (c *Comment) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
