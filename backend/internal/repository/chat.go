package repository

import (
	"github.com/momshell/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ChatRepo struct {
	db *gorm.DB
}

func NewChatRepo(db *gorm.DB) *ChatRepo {
	return &ChatRepo{db: db}
}

func (r *ChatRepo) FindByUserID(userID string) (*model.ChatMemory, error) {
	var m model.ChatMemory
	err := r.db.Where("user_id = ?", userID).First(&m).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *ChatRepo) Upsert(m *model.ChatMemory) error {
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"profile_data", "conversation_turns", "conversation_summary", "updated_at"}),
	}).Create(m).Error
}

func (r *ChatRepo) Create(m *model.ChatMemory) error {
	return r.db.Create(m).Error
}

// UpdateSummaryAndTurns updates only the summary and turns fields.
func (r *ChatRepo) UpdateSummaryAndTurns(userID string, summary string, turns string) error {
	return r.db.Model(&model.ChatMemory{}).
		Where("user_id = ?", userID).
		Updates(map[string]any{
			"conversation_summary": summary,
			"conversation_turns":   turns,
		}).Error
}

// --- ChatMemoryFact methods ---

func (r *ChatRepo) FindFactsByUserID(userID string) ([]model.ChatMemoryFact, error) {
	var facts []model.ChatMemoryFact
	err := r.db.Where("user_id = ?", userID).Order("created_at desc").Find(&facts).Error
	return facts, err
}

func (r *ChatRepo) FindFactByID(id string) (*model.ChatMemoryFact, error) {
	var f model.ChatMemoryFact
	err := r.db.Where("id = ?", id).First(&f).Error
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *ChatRepo) CreateFact(f *model.ChatMemoryFact) error {
	return r.db.Create(f).Error
}

func (r *ChatRepo) DeleteFact(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.ChatMemoryFact{}).Error
}

func (r *ChatRepo) FactExistsByContent(userID, content string) (bool, error) {
	var count int64
	err := r.db.Model(&model.ChatMemoryFact{}).
		Where("user_id = ? AND content = ?", userID, content).
		Count(&count).Error
	return count > 0, err
}

func (r *ChatRepo) TouchFactReferencedAt(ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.Model(&model.ChatMemoryFact{}).
		Where("id IN ?", ids).
		Update("last_referenced_at", gorm.Expr("NOW()")).Error
}
