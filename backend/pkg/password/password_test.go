package password

import (
	"testing"
)

func TestHashAndVerify(t *testing.T) {
	plain := "my-secure-password"
	hashed, err := Hash(plain)
	if err != nil {
		t.Fatalf("Hash failed: %v", err)
	}
	if hashed == "" {
		t.Fatal("expected non-empty hash")
	}
	if hashed == plain {
		t.Fatal("hash should not equal plaintext")
	}
	if !Verify(plain, hashed) {
		t.Error("Verify should return true for correct password")
	}
}

func TestVerify_WrongPassword(t *testing.T) {
	hashed, err := Hash("correct-password")
	if err != nil {
		t.Fatalf("Hash failed: %v", err)
	}
	if Verify("wrong-password", hashed) {
		t.Error("Verify should return false for wrong password")
	}
}

func TestHash_DifferentHashesForSamePassword(t *testing.T) {
	h1, err := Hash("same-password")
	if err != nil {
		t.Fatalf("Hash failed: %v", err)
	}
	h2, err := Hash("same-password")
	if err != nil {
		t.Fatalf("Hash failed: %v", err)
	}
	if h1 == h2 {
		t.Error("bcrypt should produce different hashes for same password (different salt)")
	}
}
