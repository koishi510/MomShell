package service

import (
	"context"
	"strings"
	"testing"

	"github.com/momshell/backend/internal/config"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"github.com/momshell/backend/pkg/openai"
)

func newTestRAGService() *RAGService {
	return NewRAGService(nil, nil, &config.Config{
		RAGSimilarityThreshold: 0.8,
		RAGTopK:                5,
		RAGRerankEnabled:       false,
	})
}

// --- FormatContext tests ---

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
	if !strings.Contains(result, "question") {
		t.Errorf("expected source tag, got %q", result)
	}
	if !strings.Contains(result, "如何给宝宝换尿布？") {
		t.Errorf("expected content, got %q", result)
	}
	if !strings.Contains(result, "★★★") {
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
	if !strings.Contains(result, "hybrid") {
		t.Errorf("expected hybrid match type, got %q", result)
	}
	if !strings.Contains(result, "keyword") {
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
		if !strings.Contains(result, tt.expected) {
			t.Errorf("score %.1f: expected %q in result %q", tt.score, tt.expected, result)
		}
	}
}

// --- FormatContextLegacy tests ---

func TestFormatContextLegacy_Empty(t *testing.T) {
	s := newTestRAGService()
	result := s.FormatContextLegacy(nil)
	if result != "" {
		t.Errorf("expected empty string, got %q", result)
	}
}

func TestFormatContextLegacy_SingleResult(t *testing.T) {
	s := newTestRAGService()
	results := []model.KnowledgeEmbedding{
		{Source: model.SourceQuestion, Content: "test content"},
	}
	result := s.FormatContextLegacy(results)
	expected := "[question] test content\n"
	if result != expected {
		t.Errorf("got %q, want %q", result, expected)
	}
}

// --- resolveMatchType tests ---

func TestResolveMatchType(t *testing.T) {
	tests := []struct {
		vectorRank int
		kwRank     int
		expected   model.MatchType
	}{
		{0, -1, model.MatchVector},
		{-1, 0, model.MatchKeyword},
		{0, 0, model.MatchHybrid},
		{5, 3, model.MatchHybrid},
		{-1, -1, model.MatchHybrid}, // edge case: neither found
	}
	for _, tt := range tests {
		result := resolveMatchType(tt.vectorRank, tt.kwRank)
		if result != tt.expected {
			t.Errorf("resolveMatchType(%d, %d) = %s, want %s", tt.vectorRank, tt.kwRank, result, tt.expected)
		}
	}
}

// --- computeRRFScores tests ---

func TestComputeRRFScores(t *testing.T) {
	candidates := map[string]*rrfCandidate{
		"a": {vectorRank: 0, kwRank: -1},
		"b": {vectorRank: -1, kwRank: 0},
		"c": {vectorRank: 1, kwRank: 2},
	}
	computeRRFScores(candidates)

	// "a": only vector rank 0 → 0.7 / (60+0) = 0.7/60
	expectedA := 0.7 / 60.0
	if diff := candidates["a"].rrfScore - expectedA; diff > 1e-9 || diff < -1e-9 {
		t.Errorf("a: got %f, want %f", candidates["a"].rrfScore, expectedA)
	}

	// "b": only keyword rank 0 → 0.3 / (60+0) = 0.3/60
	expectedB := 0.3 / 60.0
	if diff := candidates["b"].rrfScore - expectedB; diff > 1e-9 || diff < -1e-9 {
		t.Errorf("b: got %f, want %f", candidates["b"].rrfScore, expectedB)
	}

	// "c": vector rank 1 + keyword rank 2 → 0.7/(60+1) + 0.3/(60+2)
	expectedC := 0.7/61.0 + 0.3/62.0
	if diff := candidates["c"].rrfScore - expectedC; diff > 1e-9 || diff < -1e-9 {
		t.Errorf("c: got %f, want %f", candidates["c"].rrfScore, expectedC)
	}
}

func TestComputeRRFScores_NeitherPresent(t *testing.T) {
	candidates := map[string]*rrfCandidate{
		"x": {vectorRank: -1, kwRank: -1},
	}
	computeRRFScores(candidates)
	if candidates["x"].rrfScore != 0 {
		t.Errorf("expected 0 score, got %f", candidates["x"].rrfScore)
	}
}

// --- collectKeywordCandidates tests ---

func TestCollectKeywordCandidates_NewAndMerge(t *testing.T) {
	candidates := map[string]*rrfCandidate{
		"existing": {
			embedding:  model.KnowledgeEmbedding{ID: "existing"},
			vectorRank: 0,
			kwRank:     -1,
		},
	}

	kwResults := []repository.KeywordResult{
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "existing"}, Rank: 0.9},
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "new-kw"}, Rank: 0.5},
	}
	collectKeywordCandidates(candidates, kwResults)

	if len(candidates) != 2 {
		t.Fatalf("expected 2 candidates, got %d", len(candidates))
	}
	if candidates["existing"].kwRank != 0 {
		t.Errorf("existing kw rank: got %d, want 0", candidates["existing"].kwRank)
	}
	if candidates["new-kw"].kwRank != 1 {
		t.Errorf("new-kw kw rank: got %d, want 1", candidates["new-kw"].kwRank)
	}
	if candidates["new-kw"].vectorRank != -1 {
		t.Errorf("new-kw vector rank: got %d, want -1", candidates["new-kw"].vectorRank)
	}
}

// --- sortAndConvertCandidates tests ---

func TestSortAndConvertCandidates(t *testing.T) {
	candidates := map[string]*rrfCandidate{
		"low": {
			embedding:  model.KnowledgeEmbedding{ID: "low", Content: "low score"},
			vectorRank: -1,
			kwRank:     5,
			rrfScore:   0.001,
		},
		"high": {
			embedding:  model.KnowledgeEmbedding{ID: "high", Content: "high score"},
			vectorRank: 0,
			kwRank:     0,
			rrfScore:   0.05,
		},
		"mid": {
			embedding:  model.KnowledgeEmbedding{ID: "mid", Content: "mid score"},
			vectorRank: 2,
			kwRank:     -1,
			rrfScore:   0.01,
		},
	}

	results := sortAndConvertCandidates(candidates)
	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}
	// Should be sorted descending by score
	if results[0].ID != "high" {
		t.Errorf("first result should be 'high', got %s", results[0].ID)
	}
	if results[1].ID != "mid" {
		t.Errorf("second result should be 'mid', got %s", results[1].ID)
	}
	if results[2].ID != "low" {
		t.Errorf("third result should be 'low', got %s", results[2].ID)
	}
	// Check match types
	if results[0].MatchType != model.MatchHybrid {
		t.Errorf("high should be hybrid, got %s", results[0].MatchType)
	}
	if results[1].MatchType != model.MatchVector {
		t.Errorf("mid should be vector, got %s", results[1].MatchType)
	}
	if results[2].MatchType != model.MatchKeyword {
		t.Errorf("low should be keyword, got %s", results[2].MatchType)
	}
}

func TestSortAndConvertCandidates_Empty(t *testing.T) {
	results := sortAndConvertCandidates(map[string]*rrfCandidate{})
	if len(results) != 0 {
		t.Errorf("expected empty results, got %d", len(results))
	}
}

// --- collectVectorCandidates tests ---

func TestCollectVectorCandidates_ThresholdFilter(t *testing.T) {
	s := newTestRAGService() // threshold = 0.8

	vectorResults := []repository.ScoredEmbedding{
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "close"}, Distance: 0.3},
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "far"}, Distance: 0.9},
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "edge"}, Distance: 0.8},
	}

	candidates := make(map[string]*rrfCandidate)
	s.collectVectorCandidates(candidates, vectorResults)

	if len(candidates) != 2 {
		t.Fatalf("expected 2 candidates (0.3 and 0.8 pass threshold), got %d", len(candidates))
	}
	if _, ok := candidates["close"]; !ok {
		t.Error("expected 'close' to be included")
	}
	if _, ok := candidates["edge"]; !ok {
		t.Error("expected 'edge' to be included (0.8 == threshold)")
	}
	if _, ok := candidates["far"]; ok {
		t.Error("expected 'far' to be filtered out (0.9 > 0.8)")
	}
}

// --- NewRAGService tests ---

func TestNewRAGService_ConfigMapping(t *testing.T) {
	cfg := &config.Config{
		RAGSimilarityThreshold: 0.6,
		RAGTopK:                10,
		RAGRerankEnabled:       true,
	}
	s := NewRAGService(nil, nil, cfg)
	if s.cfg.SimilarityThreshold != 0.6 {
		t.Errorf("threshold: got %f, want 0.6", s.cfg.SimilarityThreshold)
	}
	if s.cfg.TopK != 10 {
		t.Errorf("topK: got %d, want 10", s.cfg.TopK)
	}
	if !s.cfg.RerankEnabled {
		t.Error("rerankEnabled: got false, want true")
	}
}

// --- rerank tests (without LLM, just disabled path) ---

func TestRerank_Disabled(t *testing.T) {
	s := newTestRAGService() // rerank disabled
	results := []model.ScoredResult{
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "a"}, Score: 1.0},
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "b"}, Score: 2.0},
	}
	reranked := s.rerank(context.Background(), "query", results)
	if len(reranked) != 2 {
		t.Fatalf("expected 2 results, got %d", len(reranked))
	}
	// Should be unchanged since rerank is disabled
	if reranked[0].ID != "a" || reranked[1].ID != "b" {
		t.Error("rerank should not modify order when disabled")
	}
}

func TestRerank_EmptyResults(t *testing.T) {
	s := NewRAGService(nil, nil, &config.Config{
		RAGRerankEnabled: true,
		RAGTopK:          5,
	})
	reranked := s.rerank(context.Background(), "query", nil)
	if len(reranked) != 0 {
		t.Errorf("expected empty, got %d", len(reranked))
	}
}

// --- applyRerankScores tests ---

func TestApplyRerankScores_ReordersResults(t *testing.T) {
	results := []model.ScoredResult{
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "a"}, Score: 1.0},
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "b"}, Score: 2.0},
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "c"}, Score: 3.0},
	}
	scores := []openai.RerankResult{
		{ID: "a", Score: 9.0},
		{ID: "b", Score: 1.0},
		{ID: "c", Score: 5.0},
	}

	reranked := applyRerankScores(results, scores)
	if reranked[0].ID != "a" || reranked[0].Score != 9.0 {
		t.Errorf("first should be 'a' with score 9.0, got %s %.1f", reranked[0].ID, reranked[0].Score)
	}
	if reranked[1].ID != "c" || reranked[1].Score != 5.0 {
		t.Errorf("second should be 'c' with score 5.0, got %s %.1f", reranked[1].ID, reranked[1].Score)
	}
	if reranked[2].ID != "b" || reranked[2].Score != 1.0 {
		t.Errorf("third should be 'b' with score 1.0, got %s %.1f", reranked[2].ID, reranked[2].Score)
	}
}

func TestApplyRerankScores_PartialScores(t *testing.T) {
	results := []model.ScoredResult{
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "a"}, Score: 5.0},
		{KnowledgeEmbedding: model.KnowledgeEmbedding{ID: "b"}, Score: 3.0},
	}
	scores := []openai.RerankResult{
		{ID: "a", Score: 2.0},
		// "b" not in scores - should keep original
	}

	reranked := applyRerankScores(results, scores)
	// "b" keeps original score 3.0, "a" gets 2.0 → b should be first
	if reranked[0].ID != "b" {
		t.Errorf("expected 'b' first (score 3.0), got %s (%.1f)", reranked[0].ID, reranked[0].Score)
	}
}

func TestApplyRerankScores_Empty(t *testing.T) {
	reranked := applyRerankScores(nil, nil)
	if len(reranked) != 0 {
		t.Errorf("expected empty, got %d", len(reranked))
	}
}
