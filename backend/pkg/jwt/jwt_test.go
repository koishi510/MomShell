package jwt

import (
	"testing"
)

const testSecret = "test-secret-key-for-unit-tests"

func TestCreateAndParseAccessToken(t *testing.T) {
	tokenStr, err := CreateAccessToken("user-123", testSecret, 30)
	if err != nil {
		t.Fatalf("CreateAccessToken failed: %v", err)
	}
	if tokenStr == "" {
		t.Fatal("expected non-empty token")
	}

	claims, err := ParseToken(tokenStr, testSecret)
	if err != nil {
		t.Fatalf("ParseToken failed: %v", err)
	}
	if claims.Subject != "user-123" {
		t.Errorf("expected subject user-123, got %s", claims.Subject)
	}
	if claims.Type != "access" {
		t.Errorf("expected type access, got %s", claims.Type)
	}
}

func TestCreateAndParseRefreshToken(t *testing.T) {
	tokenStr, err := CreateRefreshToken("user-456", testSecret, 7)
	if err != nil {
		t.Fatalf("CreateRefreshToken failed: %v", err)
	}

	claims, err := ParseToken(tokenStr, testSecret)
	if err != nil {
		t.Fatalf("ParseToken failed: %v", err)
	}
	if claims.Subject != "user-456" {
		t.Errorf("expected subject user-456, got %s", claims.Subject)
	}
	if claims.Type != "refresh" {
		t.Errorf("expected type refresh, got %s", claims.Type)
	}
}

func TestParseToken_WrongSecret(t *testing.T) {
	tokenStr, err := CreateAccessToken("user-123", testSecret, 30)
	if err != nil {
		t.Fatalf("CreateAccessToken failed: %v", err)
	}

	_, err = ParseToken(tokenStr, "wrong-secret")
	if err == nil {
		t.Fatal("expected error with wrong secret")
	}
	if err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken, got %v", err)
	}
}

func TestParseToken_InvalidString(t *testing.T) {
	_, err := ParseToken("not-a-valid-token", testSecret)
	if err == nil {
		t.Fatal("expected error for invalid token")
	}
	if err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken, got %v", err)
	}
}

func TestCreateAndVerifyPasswordResetToken(t *testing.T) {
	tokenStr, err := CreatePasswordResetToken("user-789", testSecret)
	if err != nil {
		t.Fatalf("CreatePasswordResetToken failed: %v", err)
	}

	userID, err := VerifyPasswordResetToken(tokenStr, testSecret)
	if err != nil {
		t.Fatalf("VerifyPasswordResetToken failed: %v", err)
	}
	if userID != "user-789" {
		t.Errorf("expected user-789, got %s", userID)
	}
}

func TestVerifyPasswordResetToken_WrongType(t *testing.T) {
	// Create an access token, try to verify it as password_reset
	tokenStr, err := CreateAccessToken("user-123", testSecret, 30)
	if err != nil {
		t.Fatalf("CreateAccessToken failed: %v", err)
	}

	_, err = VerifyPasswordResetToken(tokenStr, testSecret)
	if err == nil {
		t.Fatal("expected error for wrong token type")
	}
	if err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken, got %v", err)
	}
}
