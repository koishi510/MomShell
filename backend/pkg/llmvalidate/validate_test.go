package llmvalidate

import (
	"testing"
)

func TestParseCrossValidateResult_ValidJSON(t *testing.T) {
	input := `{"valid": true, "safe": true, "flags": [], "appendix": "", "struct_errors": []}`
	result, err := parseCrossValidateResult(input)
	if err != nil {
		t.Fatalf("parseCrossValidateResult() error = %v", err)
	}
	if !result.Valid {
		t.Error("Valid = false, want true")
	}
	if !result.Safe {
		t.Error("Safe = false, want true")
	}
}

func TestParseCrossValidateResult_WithFlags(t *testing.T) {
	input := `{"valid": true, "safe": false, "flags": ["medical_advice"], "appendix": "请咨询医生", "struct_errors": []}`
	result, err := parseCrossValidateResult(input)
	if err != nil {
		t.Fatalf("parseCrossValidateResult() error = %v", err)
	}
	if !result.Valid {
		t.Error("Valid = false, want true")
	}
	if result.Safe {
		t.Error("Safe = true, want false")
	}
	if len(result.Flags) != 1 || result.Flags[0] != "medical_advice" {
		t.Errorf("Flags = %v, want [medical_advice]", result.Flags)
	}
	if result.Appendix != "请咨询医生" {
		t.Errorf("Appendix = %q, want %q", result.Appendix, "请咨询医生")
	}
}

func TestParseCrossValidateResult_StructInvalid(t *testing.T) {
	input := `{"valid": false, "safe": true, "flags": [], "appendix": "", "struct_errors": ["missing field: title"]}`
	result, err := parseCrossValidateResult(input)
	if err != nil {
		t.Fatalf("parseCrossValidateResult() error = %v", err)
	}
	if result.Valid {
		t.Error("Valid = true, want false")
	}
	if len(result.StructErrors) != 1 {
		t.Errorf("StructErrors length = %d, want 1", len(result.StructErrors))
	}
}

func TestParseCrossValidateResult_WrappedInText(t *testing.T) {
	input := `Here is the result: {"valid": true, "safe": true, "flags": [], "appendix": "", "struct_errors": []} done.`
	result, err := parseCrossValidateResult(input)
	if err != nil {
		t.Fatalf("parseCrossValidateResult() error = %v", err)
	}
	if !result.Valid {
		t.Error("Valid = false, want true")
	}
}

func TestParseCrossValidateResult_Garbage(t *testing.T) {
	input := "this is not json at all"
	result, err := parseCrossValidateResult(input)
	if err != nil {
		t.Fatalf("parseCrossValidateResult() error = %v", err)
	}
	// Should return permissive default
	if !result.Valid {
		t.Error("Valid = false, want true (permissive default)")
	}
	if !result.Safe {
		t.Error("Safe = false, want true (permissive default)")
	}
}

func TestApplyAppendix_WithAppendix(t *testing.T) {
	vr := &CrossValidateResult{Appendix: "免责声明"}
	got := ApplyAppendix("原始文本", vr)
	want := "原始文本\n\n免责声明"
	if got != want {
		t.Errorf("ApplyAppendix() = %q, want %q", got, want)
	}
}

func TestApplyAppendix_NoAppendix(t *testing.T) {
	vr := &CrossValidateResult{}
	got := ApplyAppendix("原始文本", vr)
	if got != "原始文本" {
		t.Errorf("ApplyAppendix() = %q, want %q", got, "原始文本")
	}
}

func TestApplyAppendix_NilResult(t *testing.T) {
	got := ApplyAppendix("原始文本", nil)
	if got != "原始文本" {
		t.Errorf("ApplyAppendix() = %q, want %q", got, "原始文本")
	}
}
