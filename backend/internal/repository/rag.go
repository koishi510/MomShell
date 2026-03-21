package repository

import (
	"github.com/momshell/backend/internal/model"
	"github.com/pgvector/pgvector-go"
	"gorm.io/gorm"
)

type RAGRepo struct {
	db *gorm.DB
}

func NewRAGRepo(db *gorm.DB) *RAGRepo {
	return &RAGRepo{db: db}
}

func (r *RAGRepo) CreateEmbedding(emb *model.KnowledgeEmbedding) error {
	return r.db.Create(emb).Error
}

func (r *RAGRepo) FindSimilar(embedding []float32, limit int, userID *string) ([]model.KnowledgeEmbedding, error) {
	var results []model.KnowledgeEmbedding

	// pgvector distance operators:
	// <=> : cosine distance
	// <-> : L2 distance
	// <#> : negative inner product

	query := r.db.Order("embedding <=> ?")

	if userID != nil {
		// Search public content OR user's own private content
		query = query.Where("user_id IS NULL OR user_id = ?", *userID)
	} else {
		// Only search public content for guests
		query = query.Where("user_id IS NULL")
	}

	err := query.Limit(limit).Find(&results, pgvector.NewVector(embedding)).Error
	return results, err
}

// ScoredEmbedding holds a KnowledgeEmbedding with its cosine distance score.
type ScoredEmbedding struct {
	model.KnowledgeEmbedding
	Distance float64
}

// FindSimilarWithScore returns results with cosine distance scores.
func (r *RAGRepo) FindSimilarWithScore(embedding []float32, limit int, userID *string) ([]ScoredEmbedding, error) {
	var results []ScoredEmbedding

	vec := pgvector.NewVector(embedding)
	query := r.db.Table("knowledge_embeddings").
		Select("*, embedding <=> ? AS distance", vec).
		Order("distance ASC")

	if userID != nil {
		query = query.Where("user_id IS NULL OR user_id = ?", *userID)
	} else {
		query = query.Where("user_id IS NULL")
	}

	err := query.Limit(limit).Find(&results).Error
	return results, err
}

// KeywordResult holds a KnowledgeEmbedding with its ts_rank score.
type KeywordResult struct {
	model.KnowledgeEmbedding
	Rank float64
}

// FindByKeyword performs PostgreSQL full-text search on the content column.
func (r *RAGRepo) FindByKeyword(keywords string, limit int, userID *string) ([]KeywordResult, error) {
	var results []KeywordResult

	query := r.db.Table("knowledge_embeddings").
		Select("*, ts_rank(to_tsvector('simple', content), plainto_tsquery('simple', ?)) AS rank", keywords).
		Where("to_tsvector('simple', content) @@ plainto_tsquery('simple', ?)", keywords).
		Order("rank DESC")

	if userID != nil {
		query = query.Where("user_id IS NULL OR user_id = ?", *userID)
	} else {
		query = query.Where("user_id IS NULL")
	}

	err := query.Limit(limit).Find(&results).Error
	return results, err
}

func (r *RAGRepo) Exists(source model.KnowledgeSource, sourceID string) (bool, error) {
	var count int64
	err := r.db.Model(&model.KnowledgeEmbedding{}).
		Where("source = ? AND source_id = ?", source, sourceID).
		Count(&count).Error
	return count > 0, err
}

func (r *RAGRepo) DeleteBySource(source model.KnowledgeSource, sourceID string) error {
	return r.db.Where("source = ? AND source_id = ?", source, sourceID).
		Delete(&model.KnowledgeEmbedding{}).Error
}
