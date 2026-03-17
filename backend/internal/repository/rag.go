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
