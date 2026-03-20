package llmvalidate

import (
	"regexp"
	"strings"
)

var (
	thinkTagRe   = regexp.MustCompile(`(?s)<think>.*?</think>`)
	codeFenceRe  = regexp.MustCompile("(?s)```(?:json)?\\s*(.*?)\\s*```")
	jsonObjectRe = regexp.MustCompile(`(?s)\{.*\}`)
)

// Sanitize performs local text cleanup on raw LLM output before parsing.
// It strips <think> tags (Qwen3), residual markdown code fences, and
// leading/trailing whitespace. This is zero-cost (no network calls).
func Sanitize(raw string) string {
	// Strip Qwen3 <think>...</think> blocks
	s := thinkTagRe.ReplaceAllString(raw, "")
	s = strings.TrimSpace(s)
	return s
}

// ExtractJSON attempts to extract a JSON object string from raw LLM output.
// It tries: direct content → code fence extraction → brace matching.
// Returns the extracted JSON string and true if found, or the sanitized
// original and false if no JSON object was detected.
func ExtractJSON(raw string) (string, bool) {
	s := Sanitize(raw)

	// Strategy 1: already valid JSON (starts with {)
	trimmed := strings.TrimSpace(s)
	if strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}") {
		return trimmed, true
	}

	// Strategy 2: extract from ```json ... ``` code fence
	if matches := codeFenceRe.FindStringSubmatch(s); len(matches) > 1 {
		inner := strings.TrimSpace(matches[1])
		if inner != "" {
			return inner, true
		}
	}

	// Strategy 3: find any JSON object via brace matching
	if match := jsonObjectRe.FindString(s); match != "" {
		return match, true
	}

	return s, false
}

// StripCodeFence removes markdown code fences from around content.
// This consolidates the TrimPrefix/TrimSuffix patterns scattered across
// whisper_letter.go and echo.go.
func StripCodeFence(s string) string {
	s = strings.TrimSpace(s)

	// Handle ```json\n...\n``` or ```\n...\n```
	if after, found := strings.CutPrefix(s, "```"); found {
		// Find end of first line (skip ```json or ``` marker)
		if _, rest, ok := strings.Cut(after, "\n"); ok {
			s = rest
		} else {
			s = strings.TrimPrefix(after, "json")
		}
		s = strings.TrimSuffix(s, "```")
		s = strings.TrimSpace(s)
	}

	return s
}
