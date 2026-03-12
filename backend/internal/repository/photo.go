package repository

import (
	"time"

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

// FindExpiredOffWall returns photos not on the wall created before the given time.
func (r *PhotoRepo) FindExpiredOffWall(before time.Time, limit int) ([]model.Photo, error) {
	var photos []model.Photo
	err := r.db.Where("is_on_wall = ? AND created_at < ?", false, before).
		Order("created_at asc").Limit(limit).Find(&photos).Error
	return photos, err
}

// DeleteByID deletes a photo by ID without user scoping (admin use).
func (r *PhotoRepo) DeleteByID(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.Photo{}).Error
}

// FindAllPaginated returns all photos with optional filters for admin listing.
func (r *PhotoRepo) FindAllPaginated(search, userID, source, onWall string, limit, offset int) ([]model.Photo, int64, error) {
	query := r.db.Model(&model.Photo{}).Preload("User")

	if search != "" {
		like := "%" + search + "%"
		query = query.Where("title ILIKE ?", like)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if source != "" {
		query = query.Where("source = ?", source)
	}
	switch onWall {
	case "true":
		query = query.Where("is_on_wall = ?", true)
	case "false":
		query = query.Where("is_on_wall = ?", false)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var photos []model.Photo
	err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&photos).Error
	return photos, total, err
}

// --- Family (partner-shared) query methods ---

func (r *PhotoRepo) FindByFamilyIDs(familyIDs []string, limit, offset int) ([]model.Photo, int64, error) {
	query := r.db.Model(&model.Photo{}).Where("user_id IN ?", familyIDs)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var photos []model.Photo
	err := query.Order("created_at desc").Offset(offset).Limit(limit).Find(&photos).Error
	return photos, total, err
}

func (r *PhotoRepo) FindWallPhotosByFamily(familyIDs []string) ([]model.Photo, error) {
	var photos []model.Photo
	err := r.db.Where("user_id IN ? AND is_on_wall = ?", familyIDs, true).
		Order("wall_position asc").Find(&photos).Error
	return photos, err
}

func (r *PhotoRepo) CountByFamilyIDs(familyIDs []string) (int64, error) {
	var count int64
	err := r.db.Model(&model.Photo{}).Where("user_id IN ?", familyIDs).Count(&count).Error
	return count, err
}

func (r *PhotoRepo) CountWallPhotosByFamily(familyIDs []string) (int64, error) {
	var count int64
	err := r.db.Model(&model.Photo{}).Where("user_id IN ? AND is_on_wall = ?", familyIDs, true).Count(&count).Error
	return count, err
}

func (r *PhotoRepo) FindByIDAndFamilyIDs(id string, familyIDs []string) (*model.Photo, error) {
	var photo model.Photo
	err := r.db.Where("id = ? AND user_id IN ?", id, familyIDs).First(&photo).Error
	if err != nil {
		return nil, err
	}
	return &photo, nil
}

func (r *PhotoRepo) BatchUpdateWallFamily(familyIDs []string, updates []WallUpdate) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.Photo{}).
			Where("user_id IN ? AND is_on_wall = ?", familyIDs, true).
			Updates(map[string]any{"is_on_wall": false, "wall_position": nil}).Error; err != nil {
			return err
		}
		for _, u := range updates {
			pos := u.Position
			if err := tx.Model(&model.Photo{}).
				Where("id = ? AND user_id IN ?", u.PhotoID, familyIDs).
				Updates(map[string]any{"is_on_wall": true, "wall_position": pos}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *PhotoRepo) DeleteByFamily(id string, familyIDs []string) error {
	return r.db.Where("id = ? AND user_id IN ?", id, familyIDs).Delete(&model.Photo{}).Error
}
