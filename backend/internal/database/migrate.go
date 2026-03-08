package database

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

func Migrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&model.User{},
		&model.UserCertification{},
		&model.Tag{},
		&model.Question{},
		&model.QuestionTag{},
		&model.Answer{},
		&model.Comment{},
		&model.Like{},
		&model.Collection{},
		&model.ModerationLog{},
		&model.ChatMemory{},
		&model.IdentityTag{},
		&model.Memoir{},
		&model.Photo{},
	); err != nil {
		return err
	}

	// Migrate legacy role='admin' users to is_admin flag
	db.Model(&model.User{}).Where("role = ?", "admin").Updates(map[string]interface{}{
		"is_admin": true,
		"role":     "mom",
	})

	return nil
}
