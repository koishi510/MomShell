package model

import "testing"

func TestKnowledgeEmbeddingBeforeCreate_GeneratesID(t *testing.T) {
	ke := &KnowledgeEmbedding{}
	if err := ke.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ke.ID == "" {
		t.Error("expected ID to be generated")
	}
}

func TestKnowledgeEmbeddingBeforeCreate_PreservesExistingID(t *testing.T) {
	ke := &KnowledgeEmbedding{ID: "existing"}
	if err := ke.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ke.ID != "existing" {
		t.Errorf("ID = %q, want existing", ke.ID)
	}
}
