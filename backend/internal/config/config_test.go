package config

import (
	"os"
	"testing"
)

func TestGetEnv_Default(t *testing.T) {
	v := getEnv("NONEXISTENT_KEY_FOR_TEST", "default")
	if v != "default" {
		t.Errorf("getEnv() = %q, want %q", v, "default")
	}
}

func TestGetEnv_Set(t *testing.T) {
	os.Setenv("TEST_CONFIG_KEY", "value")
	defer os.Unsetenv("TEST_CONFIG_KEY")

	v := getEnv("TEST_CONFIG_KEY", "default")
	if v != "value" {
		t.Errorf("getEnv() = %q, want %q", v, "value")
	}
}

func TestGetEnvInt_Default(t *testing.T) {
	v := getEnvInt("NONEXISTENT_INT_KEY", 42)
	if v != 42 {
		t.Errorf("getEnvInt() = %d, want %d", v, 42)
	}
}

func TestGetEnvInt_Invalid(t *testing.T) {
	os.Setenv("TEST_INT_KEY", "notanumber")
	defer os.Unsetenv("TEST_INT_KEY")

	v := getEnvInt("TEST_INT_KEY", 42)
	if v != 42 {
		t.Errorf("getEnvInt() = %d, want %d (fallback for invalid input)", v, 42)
	}
}
