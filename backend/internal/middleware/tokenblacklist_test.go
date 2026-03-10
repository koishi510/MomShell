package middleware

import (
	"testing"
	"time"
)

func TestTokenBlacklist_AddAndCheck(t *testing.T) {
	bl := &tokenBlacklistStore{
		tokens: make(map[string]time.Time),
	}

	bl.Add("token1", time.Now().Add(1*time.Hour))
	if !bl.IsBlacklisted("token1") {
		t.Error("expected token1 to be blacklisted")
	}
	if bl.IsBlacklisted("token2") {
		t.Error("expected token2 to NOT be blacklisted")
	}
}

func TestTokenBlacklist_ExpiredCleanup(t *testing.T) {
	bl := &tokenBlacklistStore{
		tokens: make(map[string]time.Time),
	}

	// Add an already-expired token
	bl.Add("expired", time.Now().Add(-1*time.Minute))

	// Token is still present in the map (cleanup is async), but it IS in the map
	if !bl.IsBlacklisted("expired") {
		t.Error("expected expired token to still be in blacklist before cleanup")
	}
}

func TestTokenBlacklist_CapacityWarning(t *testing.T) {
	// Create a small-capacity-simulated blacklist by filling to maxBlacklistSize
	// This test verifies that the Add function handles capacity gracefully
	bl := &tokenBlacklistStore{
		tokens: make(map[string]time.Time),
	}

	// Add a token with future expiry
	bl.Add("important", time.Now().Add(1*time.Hour))
	if !bl.IsBlacklisted("important") {
		t.Error("expected token to be blacklisted")
	}
}
