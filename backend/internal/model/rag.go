package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/pgvector/pgvector-go"
	"gorm.io/gorm"
)

type KnowledgeSource string

const (
	SourceQuestion KnowledgeSource = "question"
	SourceAnswer   KnowledgeSource = "answer"
	SourceWhisper  KnowledgeSource = "whisper"
	SourceFact     KnowledgeSource = "fact"
	SourceMemoir   KnowledgeSource = "memoir"
)

type KnowledgeEmbedding struct {
	ID        string          `gorm:"type:varchar(36);primaryKey" json:"id"`
	Source    KnowledgeSource `gorm:"type:varchar(20);index;not null" json:"source"`
	SourceID  string          `gorm:"type:varchar(36);index;not null" json:"source_id"`
	UserID    *string         `gorm:"type:varchar(36);index" json:"user_id"` // 可为空，表示公共内容
	Content   string          `gorm:"type:text;not null" json:"content"`
	Embedding pgvector.Vector `gorm:"type:vector(1024)" json:"embedding"` // 默认为 1024 维度，后续根据模型调整
	CreatedAt time.Time       `gorm:"index" json:"created_at"`
}

func (ke *KnowledgeEmbedding) BeforeCreate(tx *gorm.DB) error {
	if ke.ID == "" {
		ke.ID = uuid.New().String()
	}
	return nil
}

// MatchType indicates which retrieval path found this result.
type MatchType string

const (
	MatchVector  MatchType = "vector"
	MatchKeyword MatchType = "keyword"
	MatchHybrid  MatchType = "hybrid"
)

// ScoredResult wraps a knowledge embedding with relevance scoring metadata.
type ScoredResult struct {
	KnowledgeEmbedding
	Score     float64   `json:"score"`
	MatchType MatchType `json:"match_type"`
}
