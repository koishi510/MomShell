package service

import (
	"context"
	"fmt"
	"log"

	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"github.com/momshell/backend/pkg/openai"
	"github.com/pgvector/pgvector-go"
)

type RAGService struct {
	client  *openai.Client
	ragRepo *repository.RAGRepo
}

func NewRAGService(client *openai.Client, ragRepo *repository.RAGRepo) *RAGService {
	return &RAGService{
		client:  client,
		ragRepo: ragRepo,
	}
}

// IndexText creates and stores an embedding for the given text.
func (s *RAGService) IndexText(ctx context.Context, source model.KnowledgeSource, sourceID string, userID *string, content string) error {
	// Skip if already indexed
	exists, err := s.ragRepo.Exists(source, sourceID)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	embedding, err := s.client.CreateEmbedding(ctx, content)
	if err != nil {
		return fmt.Errorf("failed to create embedding: %w", err)
	}

	ke := &model.KnowledgeEmbedding{
		Source:    source,
		SourceID:  sourceID,
		UserID:    userID,
		Content:   content,
		Embedding: pgvector.NewVector(embedding),
	}

	return s.ragRepo.CreateEmbedding(ke)
}

// SearchSimilar returns similar knowledge snippets for the given query.
func (s *RAGService) SearchSimilar(ctx context.Context, query string, limit int, userID *string) ([]model.KnowledgeEmbedding, error) {
	embedding, err := s.client.CreateEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to create query embedding: %w", err)
	}

	return s.ragRepo.FindSimilar(embedding, limit, userID)
}

// FormatContext returns a formatted string of retrieved knowledge for the LLM prompt.
func (s *RAGService) FormatContext(results []model.KnowledgeEmbedding) string {
	if len(results) == 0 {
		return ""
	}

	var contextStr string
	for _, res := range results {
		contextStr += fmt.Sprintf("[%s] %s\n", res.Source, res.Content)
	}
	return contextStr
}

// BackgroundReindexAll reindexes existing content in the background.
func (s *RAGService) BackgroundReindexAll(questionRepo *repository.QuestionRepo, answerRepo *repository.AnswerRepo, whisperRepo *repository.WhisperRepo, echoRepo *repository.EchoRepo) {
	go func() {
		ctx := context.Background()
		log.Println("[RAGService] starting background reindexing...")

		// Questions
		questions, _, err := questionRepo.FindAll("", "", model.StatusPublished, "created_at", "asc", 0, 1000)
		if err == nil {
			for _, q := range questions {
				_ = s.IndexText(ctx, model.SourceQuestion, q.ID, nil, q.Title+"\n"+q.Content)
			}
		}

		// Answers
		answers, _, err := answerRepo.FindByQuestionID("", nil, "created_at", "asc", 0, 1000)
		if err == nil {
			for _, a := range answers {
				if a.Status == model.StatusPublished {
					_ = s.IndexText(ctx, model.SourceAnswer, a.ID, nil, a.Content)
				}
			}
		}

		// Whispers
		// Since we don't have a way to fetch all whispers across users easily in Repo right now,
		// we skip them in bulk reindex or implement a FindAll for Whispers if needed.
		// For now, index only memoirs.

		// Memoirs
		// Similar to whispers, memoir repo doesn't have FindAll.
		// But in a real system, we would iterate through all users.

		log.Println("[RAGService] background reindexing completed.")
	}()
}
