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

func TestTrimContextBullet(t *testing.T) {
	tests := []struct {
		input, want string
	}{
		{"- item", "item"},
		{"  - item  ", "item"},
		{"no bullet", "no bullet"},
		{"  ", ""},
		{"", ""},
	}
	for _, tc := range tests {
		if got := trimContextBullet(tc.input); got != tc.want {
			t.Errorf("trimContextBullet(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestFirstNonEmptyLine(t *testing.T) {
	tests := []struct {
		input, want string
	}{
		{"first\nsecond", "first"},
		{"\n\nsecond\nthird", "second"},
		{"  \n  line  ", "line"},
		{"only", "only"},
		{"", ""},
	}
	for _, tc := range tests {
		if got := firstNonEmptyLine(tc.input); got != tc.want {
			t.Errorf("firstNonEmptyLine(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestTruncateRunes(t *testing.T) {
	tests := []struct {
		input string
		limit int
		want  string
	}{
		{"hello", 10, "hello"},
		{"hello", 3, "hel..."},
		{"你好世界", 2, "你好..."},
		{"你好", 5, "你好"},
		{"", 5, ""},
		{"hello", 0, ""},
		{"  spaces  ", 6, "spaces"},
	}
	for _, tc := range tests {
		if got := truncateRunes(tc.input, tc.limit); got != tc.want {
			t.Errorf("truncateRunes(%q, %d) = %q, want %q", tc.input, tc.limit, got, tc.want)
		}
	}
}

func TestNormalizeDadAdviceItems(t *testing.T) {
	items := []dadAdviceItemDef{
		{Title: "avoid title", Description: "desc", Kind: "avoid"},
		{Title: "decode title", Description: "desc", Kind: "decode"},
		{Title: "", Description: "no title", Kind: "decode"},
		{Title: "opening title", Description: "desc", Kind: "opening"},
		{Title: "observe title", Description: "desc", Kind: "OBSERVE"},
		{Title: "unknown kind", Description: "desc", Kind: "bad"},
	}
	result := normalizeDadAdviceItems(items)
	// Should reorder to decode, opening, observe, avoid
	if len(result) != 4 {
		t.Fatalf("expected 4 items, got %d", len(result))
	}
	wantOrder := []string{"decode", "opening", "observe", "avoid"}
	for i, want := range wantOrder {
		if result[i].Kind != want {
			t.Errorf("item[%d].Kind = %q, want %q", i, result[i].Kind, want)
		}
	}
}

func TestNormalizeDadAdviceSources(t *testing.T) {
	sources := []dadAdviceSourceDef{
		{Label: "src1", Detail: "detail1"},
		{Label: "", Detail: "no label"},
		{Label: "src2", Detail: ""},
		{Label: "src3", Detail: "detail3"},
	}
	result := normalizeDadAdviceSources(sources)
	if len(result) != 2 {
		t.Fatalf("expected 2 valid sources, got %d", len(result))
	}
	if result[0].Label != "src1" || result[1].Label != "src3" {
		t.Errorf("unexpected sources: %+v", result)
	}
}

func TestNormalizeDadAdviceSources_MaxFour(t *testing.T) {
	sources := make([]dadAdviceSourceDef, 10)
	for i := range sources {
		sources[i] = dadAdviceSourceDef{Label: "s", Detail: "d"}
	}
	result := normalizeDadAdviceSources(sources)
	if len(result) != 4 {
		t.Fatalf("expected max 4 sources, got %d", len(result))
	}
}

func TestReorderDadAdviceItems(t *testing.T) {
	items := []dadAdviceItemDef{
		{Kind: "avoid", Title: "a", Description: "d"},
		{Kind: "opening", Title: "b", Description: "d"},
		{Kind: "decode", Title: "c", Description: "d"},
		{Kind: "observe", Title: "e", Description: "d"},
	}
	result := reorderDadAdviceItems(items)
	if len(result) != 4 {
		t.Fatalf("expected 4 items, got %d", len(result))
	}
	expected := []string{"decode", "opening", "observe", "avoid"}
	for i, want := range expected {
		if result[i].Kind != want {
			t.Errorf("result[%d].Kind = %q, want %q", i, result[i].Kind, want)
		}
	}
}

func TestFallbackAdviceHeadline(t *testing.T) {
	tests := []struct {
		tag  string
		want string
	}{
		{"PHYSICAL_PAIN", "她现在更需要被轻一点地对待，而不是再多解释一次自己的难受。"},
		{"EXHAUSTED", "她眼下最缺的不是安排，而是一段不用继续撑着运转的缓冲。"},
		{"MENTAL_SPACE", "她并不是想退开你，而是想先从持续被需要的状态里松一口气。"},
		{"UNKNOWN", "先别急着解决问题，先让她感觉到你真的看见了她今天的状态。"},
	}
	for _, tc := range tests {
		if got := fallbackAdviceHeadline(tc.tag); got != tc.want {
			t.Errorf("fallbackAdviceHeadline(%q) mismatch", tc.tag)
		}
	}
}

func TestDeriveAgeStageFromBirthDate(t *testing.T) {
	if got := deriveAgeStageFromBirthDate(nil); got != "" {
		t.Errorf("nil birthDate should return empty, got %q", got)
	}

	future := time.Now().Add(24 * time.Hour)
	if got := deriveAgeStageFromBirthDate(&future); got != "" {
		t.Errorf("future birthDate should return empty, got %q", got)
	}

	recent := time.Now().Add(-30 * 24 * time.Hour)
	if got := deriveAgeStageFromBirthDate(&recent); got != "0-3m" {
		t.Errorf("30-day-old should be 0-3m, got %q", got)
	}

	sixMonths := time.Now().Add(-150 * 24 * time.Hour)
	if got := deriveAgeStageFromBirthDate(&sixMonths); got != "3-6m" {
		t.Errorf("150-day-old should be 3-6m, got %q", got)
	}

	oneYear := time.Now().Add(-400 * 24 * time.Hour)
	if got := deriveAgeStageFromBirthDate(&oneYear); got != "1-2y" {
		t.Errorf("400-day-old should be 1-2y, got %q", got)
	}

	threeYears := time.Now().Add(-1200 * 24 * time.Hour)
	if got := deriveAgeStageFromBirthDate(&threeYears); got != "3-4y" {
		t.Errorf("1200-day-old should be 3-4y, got %q", got)
	}

	fiveYears := time.Now().Add(-2000 * 24 * time.Hour)
	if got := deriveAgeStageFromBirthDate(&fiveYears); got != "4-5y" {
		t.Errorf("2000-day-old should be 4-5y, got %q", got)
	}
}
