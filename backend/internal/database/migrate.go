package database

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
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
	)
}
