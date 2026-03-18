package service

import (
	"testing"
	"time"

	"github.com/momshell/backend/internal/model"
)

func TestMapFutureLetterStageToAge(t *testing.T) {
	tests := []struct {
		name    string
		stage   string
		current *string
		want    string
	}{
		{
			name:  "pregnancy always resolves to pregnancy",
			stage: "PREGNANCY",
			want:  "pregnancy",
		},
		{
			name:    "infant keeps current infant band",
			stage:   "INFANT_0_12M",
			current: ptr("6-12m"),
			want:    "6-12m",
		},
		{
			name:    "infant falls back to first infant band",
			stage:   "INFANT_0_12M",
			current: ptr("pregnancy"),
			want:    "0-3m",
		},
		{
			name:    "toddler keeps current toddler band",
			stage:   "TODDLER_2Y",
			current: ptr("3-4y"),
			want:    "3-4y",
		},
		{
			name:  "toddler falls back to 2-3y",
			stage: "TODDLER_2Y",
			want:  "2-3y",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := mapFutureLetterStageToAge(tc.stage, tc.current); got != tc.want {
				t.Fatalf("mapFutureLetterStageToAge(%q, %v) = %q, want %q", tc.stage, tc.current, got, tc.want)
			}
		})
	}
}

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

func ptr(value string) *string {
	return &value
}
