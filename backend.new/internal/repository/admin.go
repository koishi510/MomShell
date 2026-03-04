package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

type AdminRepo struct {
	db *gorm.DB
}

func NewAdminRepo(db *gorm.DB) *AdminRepo {
	return &AdminRepo{db: db}
}

// ListUsers returns paginated users with optional search and filters
func (r *AdminRepo) ListUsers(search, role, status string, offset, limit int) ([]model.User, int64, error) {
	query := r.db.Model(&model.User{})

	if search != "" {
		like := "%" + search + "%"
		query = query.Where("username ILIKE ? OR email ILIKE ? OR nickname ILIKE ?", like, like, like)
	}

	if role != "" {
		query = query.Where("role = ?", role)
	}

	switch status {
	case "active":
		query = query.Where("is_active = ? AND is_banned = ?", true, false)
	case "banned":
		query = query.Where("is_banned = ?", true)
	case "inactive":
		query = query.Where("is_active = ?", false)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var users []model.User
	err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// CountUsersByRole returns user count grouped by role
func (r *AdminRepo) CountUsersByRole() (map[string]int64, error) {
	type result struct {
		Role  string
		Count int64
	}
	var results []result
	err := r.db.Model(&model.User{}).
		Select("role, count(*) as count").
		Group("role").
		Find(&results).Error
	if err != nil {
		return nil, err
	}

	m := make(map[string]int64)
	for _, r := range results {
		m[r.Role] = r.Count
	}
	return m, nil
}

// CountUsers returns total, active, banned, and guest user counts
func (r *AdminRepo) CountUsers() (total, active, banned, guest int64, err error) {
	if err = r.db.Model(&model.User{}).Count(&total).Error; err != nil {
		return
	}
	if err = r.db.Model(&model.User{}).Where("is_active = ? AND is_banned = ?", true, false).Count(&active).Error; err != nil {
		return
	}
	if err = r.db.Model(&model.User{}).Where("is_banned = ?", true).Count(&banned).Error; err != nil {
		return
	}
	if err = r.db.Model(&model.User{}).Where("is_guest = ?", true).Count(&guest).Error; err != nil {
		return
	}
	return
}

// DeleteUser hard-deletes a user by ID
func (r *AdminRepo) DeleteUser(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.User{}).Error
}

// CountQuestions returns total question count
func (r *AdminRepo) CountQuestions() (int64, error) {
	var count int64
	err := r.db.Model(&model.Question{}).Count(&count).Error
	return count, err
}

// CountAnswers returns total answer count
func (r *AdminRepo) CountAnswers() (int64, error) {
	var count int64
	err := r.db.Model(&model.Answer{}).Count(&count).Error
	return count, err
}

// CountCertifications returns total certification count
func (r *AdminRepo) CountCertifications() (int64, error) {
	var count int64
	err := r.db.Model(&model.UserCertification{}).Count(&count).Error
	return count, err
}
