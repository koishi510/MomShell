package service

import (
	"testing"

	"github.com/momshell/backend/internal/model"
)

func TestFormatContext_Empty(t *testing.T) {
	s := &RAGService{}
	result := s.FormatContext(nil)
	if result != "" {
		t.Errorf("expected empty string, got %q", result)
	}
}

func TestFormatContext_SingleResult(t *testing.T) {
	s := &RAGService{}
	results := []model.KnowledgeEmbedding{
		{Source: model.SourceQuestion, Content: "如何给宝宝换尿布？"},
	}
	result := s.FormatContext(results)
	expected := "[question] 如何给宝宝换尿布？\n"
	if result != expected {
		t.Errorf("got %q, want %q", result, expected)
	}
}

func TestFormatContext_MultipleResults(t *testing.T) {
	s := &RAGService{}
	results := []model.KnowledgeEmbedding{
		{Source: model.SourceQuestion, Content: "问题1"},
		{Source: model.SourceAnswer, Content: "回答1"},
	}
	result := s.FormatContext(results)
	if result == "" {
		t.Fatal("expected non-empty result")
	}
	// Should contain both entries
	if len(result) < 10 {
		t.Errorf("result too short: %q", result)
	}
}
