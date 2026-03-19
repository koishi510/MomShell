package model

import "testing"

func TestAchievementBeforeCreate_GeneratesID(t *testing.T) {
	a := &Achievement{}
	if err := a.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.ID == "" {
		t.Error("expected ID to be generated")
	}
}

func TestAchievementBeforeCreate_PreservesExistingID(t *testing.T) {
	a := &Achievement{ID: "existing-id"}
	if err := a.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.ID != "existing-id" {
		t.Errorf("ID = %q, want existing-id", a.ID)
	}
}

func TestUserAchievementBeforeCreate_GeneratesID(t *testing.T) {
	ua := &UserAchievement{}
	if err := ua.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ua.ID == "" {
		t.Error("expected ID to be generated")
	}
	if ua.UnlockedAt.IsZero() {
		t.Error("expected UnlockedAt to be set")
	}
}

func TestUserAchievementBeforeCreate_PreservesExisting(t *testing.T) {
	ua := &UserAchievement{ID: "ua-id"}
	if err := ua.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ua.ID != "ua-id" {
		t.Errorf("ID = %q, want ua-id", ua.ID)
	}
}
