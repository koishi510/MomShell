package fileutil

import (
	"os"
	"path/filepath"
	"strings"
)

// RemoveUploadedFile safely removes a file referenced by a URL-style path
// (e.g. "/uploads/photos/abc.png") from disk. filepath.Clean resolves any
// path traversal components, and the prefix check ensures the resolved path
// remains under the uploads directory.
func RemoveUploadedFile(imageURL string) {
	if imageURL == "" {
		return
	}
	localPath := filepath.Clean("." + imageURL)
	if strings.HasPrefix(localPath, "uploads"+string(filepath.Separator)) {
		_ = os.Remove(localPath)
	}
}
