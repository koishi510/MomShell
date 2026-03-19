package service

import (
	"testing"
	"time"

	"github.com/momshell/backend/internal/model"
)

func TestToTaskItem_AISource(t *testing.T) {
	score := 4
	comment := "good job"
	ut := model.UserTask{
		ID:            "ut-1",
		UserID:        "u-1",
		Source:        model.TaskSourceAI,
		Status:        model.TaskCompleted,
		Priority:      model.PriorityT1,
		AITitle:       "洗碗",
		AIDescription: "把碗洗干净",
		AICategory:    "housework",
		AIDifficulty:  3,
		Score:         &score,
		Comment:       &comment,
		Date:          time.Date(2026, 3, 19, 0, 0, 0, 0, time.UTC),
	}

	item := toTaskItem(ut)

	if item.ID != "ut-1" {
		t.Errorf("ID = %q, want ut-1", item.ID)
	}
	if item.Title != "洗碗" {
		t.Errorf("Title = %q, want 洗碗", item.Title)
	}
	if item.Description != "把碗洗干净" {
		t.Errorf("Description = %q", item.Description)
	}
	if item.Category != "housework" {
		t.Errorf("Category = %q", item.Category)
	}
	if item.Difficulty != 3 {
		t.Errorf("Difficulty = %d", item.Difficulty)
	}
	if item.Priority != "T1" {
		t.Errorf("Priority = %q", item.Priority)
	}
	if item.Status != "completed" {
		t.Errorf("Status = %q", item.Status)
	}
	if item.Source != "ai" {
		t.Errorf("Source = %q", item.Source)
	}
	if item.Score == nil || *item.Score != 4 {
		t.Errorf("Score = %v", item.Score)
	}
}

func TestToTaskItem_TemplateSource(t *testing.T) {
	task := &model.DailyTask{
		Title:       "做饭",
		Description: "做一顿晚饭",
		Category:    model.TaskCategoryHousework,
		Difficulty:  2,
		Priority:    model.PriorityT2,
	}
	ut := model.UserTask{
		ID:     "ut-2",
		UserID: "u-2",
		Source: model.TaskSourceTemplate,
		Status: model.TaskPending,
		Task:   task,
	}

	item := toTaskItem(ut)

	if item.Title != "做饭" {
		t.Errorf("Title = %q, want 做饭", item.Title)
	}
	if item.Category != "housework" {
		t.Errorf("Category = %q", item.Category)
	}
	if item.Priority != "T2" {
		t.Errorf("Priority = %q, want T2", item.Priority)
	}
	if item.Source != "template" {
		t.Errorf("Source = %q", item.Source)
	}
}

func TestToTaskItem_EmptyPriorityFallback(t *testing.T) {
	ut := model.UserTask{
		Source: model.TaskSourceAI,
		Status: model.TaskPending,
	}
	item := toTaskItem(ut)
	if item.Priority != "T2" {
		t.Errorf("default priority = %q, want T2", item.Priority)
	}
}

func TestToTaskItem_EmptySourceFallback(t *testing.T) {
	ut := model.UserTask{}
	item := toTaskItem(ut)
	if item.Source != "template" {
		t.Errorf("default source = %q, want template", item.Source)
	}
}

func TestToTaskItems(t *testing.T) {
	tasks := []model.UserTask{
		{ID: "a", Source: model.TaskSourceAI, AITitle: "A"},
		{ID: "b", Source: model.TaskSourceAI, AITitle: "B"},
	}
	items := toTaskItems(tasks)
	if len(items) != 2 {
		t.Fatalf("len = %d, want 2", len(items))
	}
	if items[0].ID != "a" || items[1].ID != "b" {
		t.Errorf("IDs = %q, %q", items[0].ID, items[1].ID)
	}
}

func TestToTaskItems_Empty(t *testing.T) {
	items := toTaskItems(nil)
	if len(items) != 0 {
		t.Errorf("expected empty, got %d", len(items))
	}
}

func TestFilterWhisperDrivenTasks(t *testing.T) {
	tasks := []model.UserTask{
		{ID: "1", Source: model.TaskSourceWhisper},
		{ID: "2", Source: model.TaskSourceTemplate},
		{ID: "3", Source: model.TaskSourceAI},
		{ID: "4", Source: model.TaskSourceWhisper},
	}
	result := filterWhisperDrivenTasks(tasks)
	if len(result) != 2 {
		t.Fatalf("len = %d, want 2", len(result))
	}
	if result[0].ID != "1" || result[1].ID != "4" {
		t.Errorf("IDs = %q, %q", result[0].ID, result[1].ID)
	}
}

func TestFilterWhisperDrivenTasks_Empty(t *testing.T) {
	result := filterWhisperDrivenTasks(nil)
	if len(result) != 0 {
		t.Errorf("expected empty, got %d", len(result))
	}
}

func TestResolveTaskContent_AI(t *testing.T) {
	ut := model.UserTask{
		Source:        model.TaskSourceAI,
		AITitle:       "AI任务",
		AIDescription: "AI描述",
		AICategory:    "health",
		AIDifficulty:  4,
	}
	title, desc, cat, diff := resolveTaskContent(ut)
	if title != "AI任务" || desc != "AI描述" || cat != "health" || diff != 4 {
		t.Errorf("got (%q,%q,%q,%d)", title, desc, cat, diff)
	}
}

func TestResolveTaskContent_Template(t *testing.T) {
	ut := model.UserTask{
		Source: model.TaskSourceTemplate,
		Task: &model.DailyTask{
			Title:       "模板任务",
			Description: "模板描述",
			Category:    model.TaskCategoryParenting,
			Difficulty:  2,
		},
	}
	title, desc, cat, diff := resolveTaskContent(ut)
	if title != "模板任务" || desc != "模板描述" || cat != "parenting" || diff != 2 {
		t.Errorf("got (%q,%q,%q,%d)", title, desc, cat, diff)
	}
}

func TestResolveTaskContent_TemplateNoTask(t *testing.T) {
	ut := model.UserTask{Source: model.TaskSourceTemplate}
	title, desc, cat, diff := resolveTaskContent(ut)
	if title != "" || desc != "" || cat != "" || diff != 0 {
		t.Errorf("expected empty, got (%q,%q,%q,%d)", title, desc, cat, diff)
	}
}
