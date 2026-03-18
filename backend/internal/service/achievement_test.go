package service

import (
	"testing"

	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/model"
)

func TestParseAchievementCondition(t *testing.T) {
	tests := []struct {
		name  string
		raw   string
		valid bool
		cType string
		min   int
	}{
		{name: "empty string", raw: "", valid: false},
		{name: "invalid json", raw: "not json", valid: false},
		{name: "zero min", raw: `{"type":"task_count","min":0}`, valid: false},
		{name: "negative min", raw: `{"type":"task_count","min":-1}`, valid: false},
		{name: "missing type", raw: `{"min":5}`, valid: false},
		{name: "valid task_count", raw: `{"type":"task_count","min":5}`, valid: true, cType: "task_count", min: 5},
		{name: "valid dimension_min", raw: `{"type":"dimension_min","min":10,"dimension":"health"}`, valid: true, cType: "dimension_min", min: 10},
		{name: "whitespace trimmed", raw: `  {"type":" task_count ","min":3}  `, valid: true, cType: "task_count", min: 3},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cond, ok := parseAchievementCondition(tc.raw)
			if ok != tc.valid {
				t.Fatalf("parseAchievementCondition(%q) ok = %v, want %v", tc.raw, ok, tc.valid)
			}
			if ok {
				if cond.Type != tc.cType {
					t.Errorf("type = %q, want %q", cond.Type, tc.cType)
				}
				if cond.Min != tc.min {
					t.Errorf("min = %d, want %d", cond.Min, tc.min)
				}
			}
		})
	}
}

func TestIsConditionSatisfied(t *testing.T) {
	radar := dto.SkillRadar{
		Nutrition: 10, Cleaning: 5, Emotional: 8,
		Logistics: 3, Health: 12, Playtime: 7,
	}

	tests := []struct {
		name  string
		cond  achievementCondition
		count int
		want  bool
	}{
		{name: "task_count met", cond: achievementCondition{Type: "task_count", Min: 5}, count: 5, want: true},
		{name: "task_count not met", cond: achievementCondition{Type: "task_count", Min: 5}, count: 4, want: false},
		{name: "dimension health met", cond: achievementCondition{Type: "dimension_min", Min: 10, Dimension: "health"}, want: true},
		{name: "dimension health not met", cond: achievementCondition{Type: "dimension_min", Min: 15, Dimension: "health"}, want: false},
		{name: "dimension emotional", cond: achievementCondition{Type: "dimension_min", Min: 8, Dimension: "emotional"}, want: true},
		{name: "unknown dimension", cond: achievementCondition{Type: "dimension_min", Min: 1, Dimension: "unknown"}, want: false},
		{name: "unknown type", cond: achievementCondition{Type: "streak", Min: 1}, want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := isConditionSatisfied(tc.cond, tc.count, radar); got != tc.want {
				t.Errorf("isConditionSatisfied() = %v, want %v", got, tc.want)
			}
		})
	}
}

func intPtr(v int) *int { return &v }

func TestComputeSkillRadar(t *testing.T) {
	tasks := []model.UserTask{
		{AICategory: "housework", Source: model.TaskSourceAI, Score: intPtr(3)},
		{AICategory: "parenting", Source: model.TaskSourceAI, Score: intPtr(5)},
		{AICategory: "health", Source: model.TaskSourceAI, Score: intPtr(4)},
		{AICategory: "emotional", Source: model.TaskSourceAI, Score: intPtr(2)},
		{AICategory: "health", Source: model.TaskSourceAI, Score: nil}, // skipped
	}

	radar := computeSkillRadar(tasks)

	if radar.Cleaning != 3 || radar.Logistics != 3 {
		t.Errorf("housework: cleaning=%d logistics=%d, want 3,3", radar.Cleaning, radar.Logistics)
	}
	if radar.Nutrition != 5 || radar.Playtime != 5 {
		t.Errorf("parenting: nutrition=%d playtime=%d, want 5,5", radar.Nutrition, radar.Playtime)
	}
	if radar.Health != 4 {
		t.Errorf("health=%d, want 4", radar.Health)
	}
	if radar.Emotional != 2 {
		t.Errorf("emotional=%d, want 2", radar.Emotional)
	}
}

func TestResolveUserTaskCategory(t *testing.T) {
	tests := []struct {
		name string
		ut   model.UserTask
		want string
	}{
		{name: "AI source uses AICategory", ut: model.UserTask{Source: model.TaskSourceAI, AICategory: " Health "}, want: "health"},
		{name: "template with task", ut: model.UserTask{Source: model.TaskSourceTemplate, Task: &model.DailyTask{Category: model.TaskCategoryHousework}}, want: string(model.TaskCategoryHousework)},
		{name: "template without task", ut: model.UserTask{Source: model.TaskSourceTemplate}, want: ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := resolveUserTaskCategory(tc.ut); got != tc.want {
				t.Errorf("resolveUserTaskCategory() = %q, want %q", got, tc.want)
			}
		})
	}
}
