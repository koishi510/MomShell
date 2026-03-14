package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
)

type EchoRepo struct {
	db *gorm.DB
}

func NewEchoRepo(db *gorm.DB) *EchoRepo {
	return &EchoRepo{db: db}
}

func (r *EchoRepo) FindIdentityTagsByUserID(userID string) ([]model.IdentityTag, error) {
	var tags []model.IdentityTag
	err := r.db.Where(whereUserID, userID).Order(orderCreatedAtDesc).Find(&tags).Error
	return tags, err
}

func (r *EchoRepo) CreateIdentityTag(tag *model.IdentityTag) error {
	return r.db.Create(tag).Error
}

func (r *EchoRepo) FindIdentityTagByIDAndUserID(id, userID string) (*model.IdentityTag, error) {
	var tag model.IdentityTag
	err := r.db.Where(whereIDAndUserID, id, userID).First(&tag).Error
	if err != nil {
		return nil, err
	}
	return &tag, nil
}

func (r *EchoRepo) DeleteIdentityTag(id, userID string) error {
	return r.db.Where(whereIDAndUserID, id, userID).Delete(&model.IdentityTag{}).Error
}

func (r *EchoRepo) FindMemoirsByUserID(userID string, limit, offset int) ([]model.Memoir, int64, error) {
	query := r.db.Model(&model.Memoir{}).Where(whereUserID, userID)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var memoirs []model.Memoir
	err := query.Order(orderCreatedAtDesc).Offset(offset).Limit(limit).Find(&memoirs).Error
	return memoirs, total, err
}

func (r *EchoRepo) FindMemoirsByUserIDs(userIDs []string, limit, offset int) ([]model.Memoir, int64, error) {
	query := r.db.Model(&model.Memoir{}).Where(whereUserIDIn, userIDs)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var memoirs []model.Memoir
	err := query.Order(orderCreatedAtDesc).Offset(offset).Limit(limit).Find(&memoirs).Error
	return memoirs, total, err
}

func (r *EchoRepo) CreateMemoir(memoir *model.Memoir) error {
	return r.db.Create(memoir).Error
}

func (r *EchoRepo) FindMemoirByIDAndUserID(id, userID string) (*model.Memoir, error) {
	var memoir model.Memoir
	err := r.db.Where(whereIDAndUserID, id, userID).First(&memoir).Error
	if err != nil {
		return nil, err
	}
	return &memoir, nil
}

func (r *EchoRepo) UpdateMemoir(memoir *model.Memoir) error {
	return r.db.Save(memoir).Error
}
