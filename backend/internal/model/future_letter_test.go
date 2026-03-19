package model

import "testing"

func TestFutureLetterResponseBeforeCreate_GeneratesID(t *testing.T) {
	r := &FutureLetterResponse{}
	if err := r.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.ID == "" {
		t.Error("expected ID to be generated")
	}
}

func TestFutureLetterResponseBeforeCreate_PreservesExistingID(t *testing.T) {
	r := &FutureLetterResponse{ID: "existing"}
	if err := r.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.ID != "existing" {
		t.Errorf("ID = %q, want existing", r.ID)
	}
}
