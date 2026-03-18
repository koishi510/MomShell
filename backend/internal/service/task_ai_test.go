package service

import "testing"

func TestInferAgeStageFromMemory(t *testing.T) {
	tests := []struct {
		name    string
		content string
		want    string
	}{
		{
			name:    "pregnancy keywords map to pregnancy",
			content: "最近怀孕 28 周，晚上有点睡不好。",
			want:    "pregnancy",
		},
		{
			name:    "newborn keywords map to 0-3m",
			content: "宝宝刚出生两个月，夜里还是要频繁喂奶。",
			want:    "0-3m",
		},
		{
			name:    "toddler keywords map to 2-3y",
			content: "孩子两岁了，最近特别爱跑跳。",
			want:    "2-3y",
		},
		{
			name:    "unknown content returns empty",
			content: "今天心情一般，但海边风很舒服。",
			want:    "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := inferAgeStageFromMemory(tc.content); got != tc.want {
				t.Fatalf("inferAgeStageFromMemory(%q) = %q, want %q", tc.content, got, tc.want)
			}
		})
	}
}
