package fileutil

import (
	"os"
	"path/filepath"
	"strings"
)

// RemoveUploadedFile safely removes a file referenced by a URL-style path
// (e.g. "/uploads/photos/abc.png") from disk. It validates the resolved path
// is under the uploads directory and contains no path traversal components.
func RemoveUploadedFile(imageURL string) {
	if imageURL == "" {
		return
	}
	localPath := filepath.Clean("." + imageURL)
	if strings.HasPrefix(localPath, "uploads"+string(filepath.Separator)) &&
		!strings.Contains(localPath, "..") {
		_ = os.Remove(localPath)
	}
}
