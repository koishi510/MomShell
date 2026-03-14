package service

import (
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
)

const (
	errUserNotFound    = "用户不存在"
	errPartnerRequired = "请先完成伴侣绑定"
	errTaskNotFound    = "任务不存在"
)

type TaskService struct {
	taskRepo *repository.TaskRepo
	userRepo *repository.UserRepo
}

func NewTaskService(taskRepo *repository.TaskRepo, userRepo *repository.UserRepo) *TaskService {
	return &TaskService{taskRepo: taskRepo, userRepo: userRepo}
}

func today() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
}

// GetDailyTasks returns today's tasks for a Dad user, lazily creating them if needed.
func (s *TaskService) GetDailyTasks(userID string) ([]dto.UserTaskItem, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New(errUserNotFound)
	}
	if user.Role != model.RoleDad {
		return nil, fmt.Errorf("只有爸爸角色可以查看任务")
	}
	if user.PartnerID == nil {
		return nil, errors.New(errPartnerRequired)
	}

	date := today()
	tasks, err := s.taskRepo.FindUserTasksByDate(userID, date)
	if err != nil {
		return nil, err
	}

	// Lazy initialization: assign tasks for today
	if len(tasks) == 0 {
		templates, err := s.taskRepo.FindRandomTemplates(4)
		if err != nil || len(templates) == 0 {
			return []dto.UserTaskItem{}, nil
		}
		for _, tmpl := range templates {
			ut := &model.UserTask{
				UserID: userID,
				TaskID: tmpl.ID,
				Date:   date,
				Status: model.TaskPending,
			}
			if err := s.taskRepo.CreateUserTask(ut); err != nil {
				continue
			}
		}
		tasks, err = s.taskRepo.FindUserTasksByDate(userID, date)
		if err != nil {
			return nil, err
		}
	}

	return toTaskItems(tasks), nil
}

// CompleteTask marks a task as completed by the Dad user.
func (s *TaskService) CompleteTask(userID, taskID string) (*dto.UserTaskItem, error) {
	ut, err := s.taskRepo.FindUserTaskByID(taskID)
	if err != nil {
		return nil, errors.New(errTaskNotFound)
	}
	if ut.UserID != userID {
		return nil, fmt.Errorf("无权操作此任务")
	}
	if ut.Status != model.TaskPending {
		return nil, fmt.Errorf("任务已完成或已验收")
	}

	now := time.Now()
	ut.Status = model.TaskCompleted
	ut.CompletedAt = &now

	if err := s.taskRepo.UpdateUserTask(ut); err != nil {
		return nil, err
	}

	item := toTaskItem(*ut)
	return &item, nil
}

// GetPartnerTasks returns the partner (Dad)'s tasks for Mom to review.
func (s *TaskService) GetPartnerTasks(callerID string) ([]dto.UserTaskItem, error) {
	user, err := s.userRepo.FindByID(callerID)
	if err != nil {
		return nil, errors.New(errUserNotFound)
	}
	if user.Role != model.RoleMom {
		return nil, fmt.Errorf("只有妈妈角色可以查看伴侣任务")
	}
	if user.PartnerID == nil {
		return nil, errors.New(errPartnerRequired)
	}

	date := today()
	tasks, err := s.taskRepo.FindUserTasksByDate(*user.PartnerID, date)
	if err != nil {
		return nil, err
	}

	// Lazily assign tasks for partner if none exist today
	if len(tasks) == 0 {
		templates, err := s.taskRepo.FindRandomTemplates(4)
		if err != nil || len(templates) == 0 {
			return []dto.UserTaskItem{}, nil
		}
		for _, tmpl := range templates {
			ut := &model.UserTask{
				UserID: *user.PartnerID,
				TaskID: tmpl.ID,
				Date:   date,
				Status: model.TaskPending,
			}
			if err := s.taskRepo.CreateUserTask(ut); err != nil {
				continue
			}
		}
		tasks, err = s.taskRepo.FindUserTasksByDate(*user.PartnerID, date)
		if err != nil {
			return nil, err
		}
	}

	return toTaskItems(tasks), nil
}

// ScoreTask allows Mom to verify and score a completed task.
func (s *TaskService) ScoreTask(callerID, taskID string, req dto.TaskScore) (*dto.UserTaskItem, error) {
	caller, err := s.userRepo.FindByID(callerID)
	if err != nil {
		return nil, errors.New(errUserNotFound)
	}
	if caller.Role != model.RoleMom {
		return nil, fmt.Errorf("只有妈妈角色可以验收任务")
	}
	if caller.PartnerID == nil {
		return nil, errors.New(errPartnerRequired)
	}

	ut, err := s.taskRepo.FindUserTaskByID(taskID)
	if err != nil {
		return nil, errors.New(errTaskNotFound)
	}
	if ut.UserID != *caller.PartnerID {
		return nil, fmt.Errorf("只能验收伴侣的任务")
	}
	if ut.Status != model.TaskCompleted {
		return nil, fmt.Errorf("只能验收已完成的任务")
	}

	now := time.Now()
	ut.Status = model.TaskVerified
	ut.Score = &req.Score
	if req.Comment != "" {
		ut.Comment = &req.Comment
	}
	ut.ScoredByID = &callerID
	ut.ScoredAt = &now

	if err := s.taskRepo.UpdateUserTask(ut); err != nil {
		return nil, err
	}

	item := toTaskItem(*ut)
	return &item, nil
}

// RejectTask allows Mom to reject a completed task back to pending.
func (s *TaskService) RejectTask(callerID, taskID string, comment string) (*dto.UserTaskItem, error) {
	caller, err := s.userRepo.FindByID(callerID)
	if err != nil {
		return nil, errors.New(errUserNotFound)
	}
	if caller.Role != model.RoleMom {
		return nil, fmt.Errorf("只有妈妈角色可以验收任务")
	}
	if caller.PartnerID == nil {
		return nil, errors.New(errPartnerRequired)
	}

	ut, err := s.taskRepo.FindUserTaskByID(taskID)
	if err != nil {
		return nil, errors.New(errTaskNotFound)
	}
	if ut.UserID != *caller.PartnerID {
		return nil, fmt.Errorf("只能验收伴侣的任务")
	}
	if ut.Status != model.TaskCompleted {
		return nil, fmt.Errorf("只能驳回已完成的任务")
	}

	ut.Status = model.TaskPending
	ut.CompletedAt = nil
	if comment != "" {
		ut.Comment = &comment
	}

	if err := s.taskRepo.ResetUserTaskToPending(ut); err != nil {
		return nil, err
	}

	item := toTaskItem(*ut)
	return &item, nil
}

// GetTaskStats returns XP and level for a user (Dad).
func (s *TaskService) GetTaskStats(userID string) (*dto.TaskStats, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New(errUserNotFound)
	}
	if user.PartnerID == nil {
		return &dto.TaskStats{XP: 0, Level: 1}, nil
	}

	// For Mom, show partner's stats
	targetID := userID
	if user.Role == model.RoleMom {
		targetID = *user.PartnerID
	}

	xp, err := s.taskRepo.SumScoreByUserID(targetID)
	if err != nil {
		return nil, err
	}

	// Level formula: level = floor(sqrt(xp / 10)) + 1
	level := int(math.Floor(math.Sqrt(float64(xp)/10))) + 1

	return &dto.TaskStats{XP: xp, Level: level}, nil
}

func toTaskItem(ut model.UserTask) dto.UserTaskItem {
	return dto.UserTaskItem{
		ID:          ut.ID,
		Title:       ut.Task.Title,
		Description: ut.Task.Description,
		Category:    string(ut.Task.Category),
		Difficulty:  ut.Task.Difficulty,
		Status:      string(ut.Status),
		Score:       ut.Score,
		Comment:     ut.Comment,
		CompletedAt: ut.CompletedAt,
		ScoredAt:    ut.ScoredAt,
		Date:        ut.Date,
	}
}

func toTaskItems(tasks []model.UserTask) []dto.UserTaskItem {
	items := make([]dto.UserTaskItem, len(tasks))
	for i, t := range tasks {
		items[i] = toTaskItem(t)
	}
	return items
}
