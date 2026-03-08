package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

type PhotoRepo struct {
	db *gorm.DB
}

func NewPhotoRepo(db *gorm.DB) *PhotoRepo {
	return &PhotoRepo{db: db}
}

func (r *PhotoRepo) FindByUserID(userID string, limit, offset int) ([]model.Photo, int64, error) {
	query := r.db.Model(&model.Photo{}).Where("user_id = ?", userID)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var photos []model.Photo
	err := query.Order("created_at desc").Offset(offset).Limit(limit).Find(&photos).Error
	return photos, total, err
}

func (r *PhotoRepo) FindWallPhotos(userID string) ([]model.Photo, error) {
	var photos []model.Photo
	err := r.db.Where("user_id = ? AND is_on_wall = ?", userID, true).
		Order("wall_position asc").Find(&photos).Error
	return photos, err
}

func (r *PhotoRepo) FindByID(id string) (*model.Photo, error) {
	var photo model.Photo
	err := r.db.Where("id = ?", id).First(&photo).Error
	if err != nil {
		return nil, err
	}
	return &photo, nil
}

func (r *PhotoRepo) FindByIDAndUserID(id, userID string) (*model.Photo, error) {
	var photo model.Photo
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&photo).Error
	if err != nil {
		return nil, err
	}
	return &photo, nil
}

func (r *PhotoRepo) CountByUserID(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.Photo{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

func (r *PhotoRepo) CountWallPhotos(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.Photo{}).Where("user_id = ? AND is_on_wall = ?", userID, true).Count(&count).Error
	return count, err
}

func (r *PhotoRepo) Create(photo *model.Photo) error {
	return r.db.Create(photo).Error
}

func (r *PhotoRepo) Update(photo *model.Photo) error {
	return r.db.Save(photo).Error
}

func (r *PhotoRepo) Delete(id, userID string) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Photo{}).Error
}

func (r *PhotoRepo) BatchUpdateWall(userID string, updates []WallUpdate) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Clear all wall positions for user first
		if err := tx.Model(&model.Photo{}).
			Where("user_id = ? AND is_on_wall = ?", userID, true).
			Updates(map[string]interface{}{"is_on_wall": false, "wall_position": nil}).Error; err != nil {
			return err
		}

		// Set new wall positions
		for _, u := range updates {
			pos := u.Position
			if err := tx.Model(&model.Photo{}).
				Where("id = ? AND user_id = ?", u.PhotoID, userID).
				Updates(map[string]interface{}{"is_on_wall": true, "wall_position": pos}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

type WallUpdate struct {
	PhotoID  string
	Position int
}
