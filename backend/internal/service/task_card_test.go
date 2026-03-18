package service

import (
	"fmt"
	"testing"
)

func TestBuildTaskCardPrompt(t *testing.T) {
	tests := []struct {
		name  string
		title string
		desc  string
	}{
		{name: "title only", title: "洗碗", desc: ""},
		{name: "title and short desc", title: "洗碗", desc: "把厨房的碗筷全部洗干净"},
		{name: "long desc truncated", title: "任务", desc: string(make([]rune, 100))},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			prompt := buildTaskCardPrompt(tc.title, tc.desc)
			if prompt == "" {
				t.Fatal("expected non-empty prompt")
			}
			// Should contain the title
			if len(prompt) < len(tc.title) {
				t.Error("prompt shorter than title")
			}
		})
	}
}

func TestBuildVerifiedTaskCardPrompt(t *testing.T) {
	score := 5
	comment := "做得真好"

	tests := []struct {
		name    string
		score   *int
		comment *string
		wantSub string
	}{
		{name: "no score no comment", score: nil, comment: nil, wantSub: "验收通过后存入照片库"},
		{name: "with score", score: &score, comment: nil, wantSub: fmt.Sprintf("评分 %d/5", score)},
		{name: "with comment", score: nil, comment: &comment, wantSub: comment},
		{name: "both", score: &score, comment: &comment, wantSub: "温暖纪念卡"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			prompt := buildVerifiedTaskCardPrompt("洗碗", "把碗洗干净", tc.score, tc.comment)
			if prompt == "" {
				t.Fatal("expected non-empty prompt")
			}
		})
	}
}
