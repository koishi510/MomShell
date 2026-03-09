package middleware

import (
	"sync"
	"time"
)

// TokenBlacklist is an in-memory blacklist for revoked JWT tokens.
var TokenBlacklist = &tokenBlacklistStore{
	tokens: make(map[string]time.Time),
}

type tokenBlacklistStore struct {
	mu     sync.RWMutex
	tokens map[string]time.Time
}

// Add blacklists a token until its expiry time.
func (b *tokenBlacklistStore) Add(token string, expiry time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.tokens[token] = expiry
}

// IsBlacklisted checks if a token has been revoked.
func (b *tokenBlacklistStore) IsBlacklisted(token string) bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	_, exists := b.tokens[token]
	return exists
}

func init() {
	go TokenBlacklist.cleanup()
}

func (b *tokenBlacklistStore) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		b.mu.Lock()
		now := time.Now()
		for token, expiry := range b.tokens {
			if now.After(expiry) {
				delete(b.tokens, token)
			}
		}
		b.mu.Unlock()
	}
}
