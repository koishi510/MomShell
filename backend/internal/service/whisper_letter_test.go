package service

import (
	"testing"
	"time"

	"github.com/momshell/backend/internal/model"
)

func TestSelectFutureLetterCode(t *testing.T) {
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name     string
		items    []model.FutureLetterResponse
		ageStage string
		want     string
	}{
		{name: "first response always gets overview letter", ageStage: "0-3m", want: futureLetterCodeOverview},
		{
			name:     "pregnancy switches to prenatal topic after overview",
			items:    []model.FutureLetterResponse{{LetterCode: futureLetterCodeOverview, CreatedAt: now.Add(-24 * time.Hour)}},
			ageStage: "pregnancy",
			want:     futureLetterCodePrenatal,
		},
		{
			name:     "infant switches to vaccine topic after overview",
			items:    []model.FutureLetterResponse{{LetterCode: futureLetterCodeOverview, CreatedAt: now.Add(-24 * time.Hour)}},
			ageStage: "0-3m",
			want:     futureLetterCodeVaccine,
		},
		{
			name:     "toddler switches to safety seat topic after overview",
			items:    []model.FutureLetterResponse{{LetterCode: futureLetterCodeOverview, CreatedAt: now.Add(-24 * time.Hour)}},
			ageStage: "2-3y",
			want:     futureLetterCodeSafetySeat,
		},
		{
			name:     "monthly recheck returns to overview",
			items:    []model.FutureLetterResponse{{LetterCode: futureLetterCodeOverview, CreatedAt: now.Add(-31 * 24 * time.Hour)}},
			ageStage: "0-3m",
			want:     futureLetterCodeOverview,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := selectFutureLetterCode(tc.items, tc.ageStage, now); got != tc.want {
				t.Fatalf("selectFutureLetterCode(%q) = %q, want %q", tc.ageStage, got, tc.want)
			}
		})
	}
}

func TestNeedsStageRecheck(t *testing.T) {
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)

	if !needsStageRecheck(nil, now) {
		t.Fatal("expected empty history to require stage recheck")
	}

	recent := []model.FutureLetterResponse{
		{LetterCode: futureLetterCodeOverview, CreatedAt: now.Add(-7 * 24 * time.Hour)},
	}
	if needsStageRecheck(recent, now) {
		t.Fatal("expected recent overview response to skip stage recheck")
	}

	stale := []model.FutureLetterResponse{
		{LetterCode: futureLetterCodeOverview, CreatedAt: now.Add(-45 * 24 * time.Hour)},
	}
	if !needsStageRecheck(stale, now) {
		t.Fatal("expected stale overview response to require stage recheck")
	}
}

func TestBuildFallbackDadAdvice(t *testing.T) {
	ctx := futureLetterAdviceContext{
		Template:       buildFutureLetterTemplate(futureLetterCodeOverview),
		PrimaryLabel:   "还在“合体”中，数着 TA 的胎动",
		SecondaryLabel: "整体还行，但想舒展下筋骨，喘口气",
		SecondaryTag:   "EXHAUSTED",
		Wish:           "今晚想早点安静下来",
		MemorySummary:  "她最近总说自己白天和晚上都没有完整喘气的时间。",
	}

	advice := buildFallbackDadAdvice(ctx)
	if advice.Title == "" || advice.Headline == "" || advice.Summary == "" {
		t.Fatal("expected fallback advice to include title, headline and summary")
	}
	if len(advice.Sources) < 3 {
		t.Fatalf("expected at least 3 advice sources, got %d", len(advice.Sources))
	}
	if len(advice.Items) != 4 {
		t.Fatalf("expected 4 fallback advice items, got %d", len(advice.Items))
	}

	wantKinds := []string{"decode", "opening", "observe", "avoid"}
	for i, kind := range wantKinds {
		if advice.Items[i].Kind != kind {
			t.Fatalf("expected advice item %d kind %q, got %q", i, kind, advice.Items[i].Kind)
		}
	}

	if advice.Sources[0].Label != "问卷信号" {
		t.Fatalf("expected first source to be questionnaire, got %q", advice.Sources[0].Label)
	}
}
