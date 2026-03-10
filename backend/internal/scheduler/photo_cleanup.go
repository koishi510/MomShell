package scheduler

import (
	"log"
	"time"

	"github.com/momshell/backend/internal/fileutil"
	"github.com/momshell/backend/internal/repository"
)

const (
	cleanupInterval = 6 * time.Hour
	expireAge       = 365 * 24 * time.Hour
	batchSize       = 100
)

// StartPhotoCleanup launches a background goroutine that periodically deletes
// photos with is_on_wall=false older than 365 days, including their disk files.
func StartPhotoCleanup(photoRepo *repository.PhotoRepo) {
	go func() {
		log.Println("photo cleanup scheduler started")

		// Run immediately on start, then every 6 hours.
		runCleanup(photoRepo)

		ticker := time.NewTicker(cleanupInterval)
		defer ticker.Stop()
		for range ticker.C {
			runCleanup(photoRepo)
		}
	}()
}

func runCleanup(photoRepo *repository.PhotoRepo) {
	cutoff := time.Now().Add(-expireAge)
	totalDeleted := 0

	for {
		photos, err := photoRepo.FindExpiredOffWall(cutoff, batchSize)
		if err != nil {
			log.Printf("photo cleanup: query error: %v", err)
			break
		}
		if len(photos) == 0 {
			break
		}

		for _, p := range photos {
			fileutil.RemoveUploadedFile(p.ImageURL)
			if err := photoRepo.DeleteByID(p.ID); err != nil {
				log.Printf("photo cleanup: delete error id=%s: %v", p.ID, err)
				continue
			}
			totalDeleted++
		}
	}

	if totalDeleted > 0 {
		log.Printf("photo cleanup: deleted %d expired photos", totalDeleted)
	}
}
