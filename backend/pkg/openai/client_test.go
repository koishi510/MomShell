package openai

import (
	"testing"
)

func TestExtractImagesFromTaskStatus_NotSucceed(t *testing.T) {
	statuses := []string{"PENDING", "RUNNING", "FAILED", "failed", ""}
	for _, s := range statuses {
		resp := extractImagesFromTaskStatus(&taskStatusResponse{TaskStatus: s})
		if resp != nil {
			t.Errorf("expected nil for status %q, got %+v", s, resp)
		}
	}
}

func TestExtractImagesFromTaskStatus_CaseInsensitive(t *testing.T) {
	cases := []string{"SUCCEED", "Succeed", "succeed", "SUCCEEDED", "succeeded"}
	for _, s := range cases {
		resp := extractImagesFromTaskStatus(&taskStatusResponse{
			TaskStatus:   s,
			OutputImages: []string{"https://example.com/img.png"},
		})
		if resp == nil {
			t.Fatalf("expected non-nil for status %q", s)
		}
		if len(resp.Data) != 1 || resp.Data[0].URL != "https://example.com/img.png" {
			t.Errorf("unexpected data for status %q: %+v", s, resp.Data)
		}
	}
}

func TestExtractImagesFromTaskStatus_OutputResults(t *testing.T) {
	resp := extractImagesFromTaskStatus(&taskStatusResponse{
		TaskStatus: "SUCCEED",
		Output: &struct {
			TaskID  string `json:"task_id"`
			Results []struct {
				URL     string `json:"url,omitempty"`
				B64JSON string `json:"b64_json,omitempty"`
			} `json:"results"`
		}{
			Results: []struct {
				URL     string `json:"url,omitempty"`
				B64JSON string `json:"b64_json,omitempty"`
			}{
				{URL: "https://example.com/a.png"},
				{B64JSON: "base64data"},
			},
		},
	})
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
	if len(resp.Data) != 2 {
		t.Fatalf("expected 2 results, got %d", len(resp.Data))
	}
	if resp.Data[0].URL != "https://example.com/a.png" {
		t.Errorf("unexpected URL: %s", resp.Data[0].URL)
	}
	if resp.Data[1].B64JSON != "base64data" {
		t.Errorf("unexpected B64JSON: %s", resp.Data[1].B64JSON)
	}
}

func TestExtractImagesFromTaskStatus_SucceedNoImages(t *testing.T) {
	resp := extractImagesFromTaskStatus(&taskStatusResponse{TaskStatus: "SUCCEED"})
	if resp != nil {
		t.Errorf("expected nil when SUCCEED but no images, got %+v", resp)
	}
}

func TestHandlePollStatus_Error(t *testing.T) {
	_, err := handlePollStatus(&taskStatusResponse{
		Error: &struct {
			Message string `json:"message"`
		}{Message: "out of quota"},
	})
	if err == nil {
		t.Fatal("expected error")
	}
	if got := err.Error(); got != "image task failed: out of quota" {
		t.Errorf("unexpected error: %s", got)
	}
}

func TestHandlePollStatus_SucceedWithImages(t *testing.T) {
	resp, err := handlePollStatus(&taskStatusResponse{
		TaskStatus:   "SUCCEED",
		OutputImages: []string{"https://example.com/img.png"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp == nil || len(resp.Data) != 1 {
		t.Fatalf("expected 1 image, got %+v", resp)
	}
}

func TestHandlePollStatus_SucceedNoImages(t *testing.T) {
	_, err := handlePollStatus(&taskStatusResponse{TaskStatus: "SUCCEEDED"})
	if err == nil {
		t.Fatal("expected error for succeeded with no results")
	}
}

func TestHandlePollStatus_Failed(t *testing.T) {
	_, err := handlePollStatus(&taskStatusResponse{
		TaskStatus: "failed",
		Message:    "content policy violation",
	})
	if err == nil {
		t.Fatal("expected error")
	}
	if got := err.Error(); got != "content policy violation" {
		t.Errorf("unexpected error: %s", got)
	}
}

func TestHandlePollStatus_FailedNoMessage(t *testing.T) {
	_, err := handlePollStatus(&taskStatusResponse{TaskStatus: "FAILED"})
	if err == nil {
		t.Fatal("expected error")
	}
	if got := err.Error(); got != "image generation task failed" {
		t.Errorf("unexpected error: %s", got)
	}
}

func TestHandlePollStatus_Pending(t *testing.T) {
	resp, err := handlePollStatus(&taskStatusResponse{TaskStatus: "PENDING"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp != nil {
		t.Errorf("expected nil response for PENDING, got %+v", resp)
	}
}

func TestHandlePollStatus_Running(t *testing.T) {
	resp, err := handlePollStatus(&taskStatusResponse{TaskStatus: "RUNNING"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp != nil {
		t.Errorf("expected nil response for RUNNING, got %+v", resp)
	}
}
