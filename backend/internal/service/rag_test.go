package service

import (
	"testing"

	"github.com/momshell/backend/internal/config"
	"github.com/momshell/backend/internal/model"
)

func newTestRAGService() *RAGService {
	return NewRAGService(nil, nil, &config.Config{
		RAGSimilarityThreshold: 0.8,
		RAGTopK:                5,
		RAGRerankEnabled:       false,
	})
}

func TestFormatContext_Empty(t *testing.T) {
	s := newTestRAGService()
	result := s.FormatContext(nil)
	if result != "" {
		t.Errorf("expected empty string, got %q", result)
	}
}

func TestFormatContext_SingleResult(t *testing.T) {
	s := newTestRAGService()
	results := []model.ScoredResult{
		{
			KnowledgeEmbedding: model.KnowledgeEmbedding{
				Source:  model.SourceQuestion,
				Content: "如何给宝宝换尿布？",
			},
			Score:     6.0,
			MatchType: model.MatchVector,
		},
	}
	result := s.FormatContext(results)
	if result == "" {
		t.Fatal("expected non-empty result")
	}
	if !contains(result, "question") {
		t.Errorf("expected source tag, got %q", result)
	}
	if !contains(result, "如何给宝宝换尿布？") {
		t.Errorf("expected content, got %q", result)
	}
	if !contains(result, "★★★") {
		t.Errorf("expected high relevance indicator for score 6.0, got %q", result)
	}
}

func TestFormatContext_MultipleResults(t *testing.T) {
	s := newTestRAGService()
	results := []model.ScoredResult{
		{
			KnowledgeEmbedding: model.KnowledgeEmbedding{
				Source:  model.SourceQuestion,
				Content: "问题1",
			},
			Score:     3.0,
			MatchType: model.MatchHybrid,
		},
		{
			KnowledgeEmbedding: model.KnowledgeEmbedding{
				Source:  model.SourceAnswer,
				Content: "回答1",
			},
			Score:     1.0,
			MatchType: model.MatchKeyword,
		},
	}
	result := s.FormatContext(results)
	if result == "" {
		t.Fatal("expected non-empty result")
	}
	if !contains(result, "hybrid") {
		t.Errorf("expected hybrid match type, got %q", result)
	}
	if !contains(result, "keyword") {
		t.Errorf("expected keyword match type, got %q", result)
	}
}

func TestFormatContext_RelevanceIndicators(t *testing.T) {
	s := newTestRAGService()
	tests := []struct {
		score    float64
		expected string
	}{
		{7.0, "★★★"},
		{3.0, "★★"},
		{1.0, "★"},
	}
	for _, tt := range tests {
		results := []model.ScoredResult{
			{
				KnowledgeEmbedding: model.KnowledgeEmbedding{
					Source:  model.SourceFact,
					Content: "test",
				},
				Score:     tt.score,
				MatchType: model.MatchVector,
			},
		}
		result := s.FormatContext(results)
		if !contains(result, tt.expected) {
			t.Errorf("score %.1f: expected %q in result %q", tt.score, tt.expected, result)
		}
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsStr(s, substr)
}

func containsStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
