package service

import (
	"testing"
)

func TestValidateExternalURL(t *testing.T) {
	tests := []struct {
		name    string
		url     string
		wantErr bool
	}{
		// These tests don't require DNS resolution
		{"localhost blocked", "http://localhost/image.png", true},
		{"loopback IP blocked", "http://127.0.0.1/image.png", true},
		{"IPv6 loopback blocked", "http://[::1]/image.png", true},
		{"unspecified IP blocked", "http://0.0.0.0/image.png", true},
		{".local suffix blocked", "http://myhost.local/image.png", true},
		{".internal suffix blocked", "http://myhost.internal/image.png", true},
		{"metadata endpoint blocked", "http://169.254.169.254/latest/meta-data/", true},
		{"GCP metadata blocked", "http://metadata.google.internal/computeMetadata/v1/", true},
		{"ftp scheme blocked", "ftp://example.com/image.png", true},
		{"file scheme blocked", "file:///etc/passwd", true},
		{"invalid URL", "://bad", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateExternalURL(tt.url)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateExternalURL(%q) error = %v, wantErr %v", tt.url, err, tt.wantErr)
			}
		})
	}
}
