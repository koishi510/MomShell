package llmvalidate

import (
	"testing"
)

func TestSanitize_StripThinkTags(t *testing.T) {
	input := `<think>some reasoning here</think>Hello world`
	got := Sanitize(input)
	if got != "Hello world" {
		t.Errorf("Sanitize() = %q, want %q", got, "Hello world")
	}
}

func TestSanitize_MultipleThinkTags(t *testing.T) {
	input := `<think>first</think>A<think>second</think>B`
	got := Sanitize(input)
	if got != "AB" {
		t.Errorf("Sanitize() = %q, want %q", got, "AB")
	}
}

func TestSanitize_NoThinkTags(t *testing.T) {
	input := "  plain text  "
	got := Sanitize(input)
	if got != "plain text" {
		t.Errorf("Sanitize() = %q, want %q", got, "plain text")
	}
}

func TestSanitize_MultilineThink(t *testing.T) {
	input := "<think>\nline1\nline2\n</think>\nresult"
	got := Sanitize(input)
	if got != "result" {
		t.Errorf("Sanitize() = %q, want %q", got, "result")
	}
}

func TestExtractJSON_DirectJSON(t *testing.T) {
	input := `{"title": "hello", "content": "world"}`
	got, ok := ExtractJSON(input)
	if !ok {
		t.Error("ExtractJSON() ok = false, want true")
	}
	if got != input {
		t.Errorf("ExtractJSON() = %q, want %q", got, input)
	}
}

func TestExtractJSON_CodeFence(t *testing.T) {
	input := "```json\n{\"title\": \"hello\"}\n```"
	got, ok := ExtractJSON(input)
	if !ok {
		t.Error("ExtractJSON() ok = false, want true")
	}
	want := `{"title": "hello"}`
	if got != want {
		t.Errorf("ExtractJSON() = %q, want %q", got, want)
	}
}

func TestExtractJSON_EmbeddedJSON(t *testing.T) {
	input := "Here is the result: {\"key\": \"value\"} done."
	got, ok := ExtractJSON(input)
	if !ok {
		t.Error("ExtractJSON() ok = false, want true")
	}
	want := `{"key": "value"}`
	if got != want {
		t.Errorf("ExtractJSON() = %q, want %q", got, want)
	}
}

func TestExtractJSON_NoJSON(t *testing.T) {
	input := "just plain text"
	got, ok := ExtractJSON(input)
	if ok {
		t.Error("ExtractJSON() ok = true, want false")
	}
	if got != "just plain text" {
		t.Errorf("ExtractJSON() = %q, want %q", got, "just plain text")
	}
}

func TestExtractJSON_WithThinkTags(t *testing.T) {
	input := "<think>reasoning</think>\n```json\n{\"title\": \"test\"}\n```"
	got, ok := ExtractJSON(input)
	if !ok {
		t.Error("ExtractJSON() ok = false, want true")
	}
	want := `{"title": "test"}`
	if got != want {
		t.Errorf("ExtractJSON() = %q, want %q", got, want)
	}
}

func TestStripCodeFence_WithJsonMarker(t *testing.T) {
	input := "```json\n{\"a\": 1}\n```"
	got := StripCodeFence(input)
	want := `{"a": 1}`
	if got != want {
		t.Errorf("StripCodeFence() = %q, want %q", got, want)
	}
}

func TestStripCodeFence_WithoutMarker(t *testing.T) {
	input := "```\nsome content\n```"
	got := StripCodeFence(input)
	if got != "some content" {
		t.Errorf("StripCodeFence() = %q, want %q", got, "some content")
	}
}

func TestStripCodeFence_NoFence(t *testing.T) {
	input := "plain text"
	got := StripCodeFence(input)
	if got != "plain text" {
		t.Errorf("StripCodeFence() = %q, want %q", got, "plain text")
	}
}
