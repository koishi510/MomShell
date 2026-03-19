package model

import "testing"

func TestPerkCardBeforeCreate_GeneratesID(t *testing.T) {
	c := &PerkCard{}
	if err := c.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c.ID == "" {
		t.Error("expected ID to be generated")
	}
}

func TestPerkCardBeforeCreate_PreservesExistingID(t *testing.T) {
	c := &PerkCard{ID: "existing"}
	if err := c.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c.ID != "existing" {
		t.Errorf("ID = %q, want existing", c.ID)
	}
}
