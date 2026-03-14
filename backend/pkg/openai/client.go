package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const (
	maxChatResponseSize  = 1 << 20  // 1 MB
	maxImageResponseSize = 10 << 20 // 10 MB
	headerAuthorization  = "Authorization"
	bearerPrefix         = "Bearer "
)

type Client struct {
	apiKey  string
	baseURL string
	model   string
	http    *http.Client
}

func NewClient(apiKey, baseURL, model string) *Client {
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	return &Client{
		apiKey:  apiKey,
		baseURL: baseURL,
		model:   model,
		http:    &http.Client{Timeout: 60 * time.Second},
	}
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model          string    `json:"model"`
	Messages       []Message `json:"messages"`
	Temperature    float64   `json:"temperature"`
	MaxTokens      int       `json:"max_tokens"`
	EnableThinking bool      `json:"enable_thinking"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *Client) Chat(ctx context.Context, messages []Message) (string, error) {
	reqBody := chatRequest{
		Model:          c.model,
		Messages:       messages,
		Temperature:    0.7,
		MaxTokens:      4096,
		EnableThinking: false,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(headerAuthorization, bearerPrefix+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("openai chat request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, maxChatResponseSize))
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("openai chat completion failed: status %d, body_len: %d",
			resp.StatusCode, len(respBody))
	}

	var chatResp chatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if chatResp.Error != nil {
		return "", fmt.Errorf("openai error: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("openai returned no choices")
	}

	return chatResp.Choices[0].Message.Content, nil
}

type imageRequest struct {
	Model             string  `json:"model"`
	Prompt            string  `json:"prompt"`
	N                 int     `json:"n,omitempty"`
	Size              string  `json:"size,omitempty"`
	Width             int     `json:"width,omitempty"`
	Height            int     `json:"height,omitempty"`
	NumInferenceSteps int     `json:"num_inference_steps,omitempty"`
	GuidanceScale     float64 `json:"guidance_scale"`
}

type ImageResponse struct {
	Data []struct {
		URL     string `json:"url,omitempty"`
		B64JSON string `json:"b64_json,omitempty"`
	} `json:"data"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// handleAsyncTask detects and handles async task responses from ModelScope.
// Returns an ImageResponse if the task completed synchronously or after polling.
// Returns nil, nil if the response is not an async task.
func (c *Client) handleAsyncTask(ctx context.Context, respBody []byte) (*ImageResponse, error) {
	var taskResp taskStatusResponse
	if err := json.Unmarshal(respBody, &taskResp); err != nil {
		return nil, nil
	}
	// If already SUCCEED with images, return directly
	if imgResp := extractImagesFromTaskStatus(&taskResp); imgResp != nil {
		return imgResp, nil
	}
	// Has task_id - poll with it (ModelScope uses task_id, NOT request_id)
	if taskResp.TaskID != "" {
		log.Printf("[ImageGen] async task, task_id=%s, status=%s, polling...", taskResp.TaskID, taskResp.TaskStatus)
		return c.pollImageTask(ctx, taskResp.TaskID)
	}
	// Fallback: try request_id if no task_id
	if taskResp.RequestID != "" {
		log.Printf("[ImageGen] async task (fallback), request_id=%s, status=%s, polling...", taskResp.RequestID, taskResp.TaskStatus)
		return c.pollImageTask(ctx, taskResp.RequestID)
	}
	return nil, nil
}

func (c *Client) GenerateImage(ctx context.Context, model, prompt string) (*ImageResponse, error) {
	reqBody := imageRequest{
		Model:             model,
		Prompt:            prompt,
		Width:             1024,
		Height:            1024,
		NumInferenceSteps: 9,
		GuidanceScale:     0.0,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal image request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/images/generations", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create image request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(headerAuthorization, bearerPrefix+c.apiKey)
	req.Header.Set("X-ModelScope-Async-Mode", "true")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("image generation request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, maxImageResponseSize))
	if err != nil {
		return nil, fmt.Errorf("failed to read image response: %w", err)
	}

	log.Printf("[ImageGen] model=%s POST status=%d body_len=%d", model, resp.StatusCode, len(respBody))

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("image generation failed: status code: %d, body_len: %d",
			resp.StatusCode, len(respBody))
	}

	// Try parsing as an async task response (ModelScope returns task_id for polling)
	if asyncResp, err := c.handleAsyncTask(ctx, respBody); asyncResp != nil || err != nil {
		return asyncResp, err
	}

	// Synchronous response (standard OpenAI format)
	var imgResp ImageResponse
	if err := json.Unmarshal(respBody, &imgResp); err != nil {
		return nil, fmt.Errorf("failed to parse image response: %w", err)
	}

	if imgResp.Error != nil {
		return nil, fmt.Errorf("openai image error: %s", imgResp.Error.Message)
	}

	if len(imgResp.Data) == 0 {
		return nil, fmt.Errorf("image generation returned no results")
	}

	return &imgResp, nil
}

func extractImagesFromTaskStatus(status *taskStatusResponse) *ImageResponse {
	if status.TaskStatus != "SUCCEED" && status.TaskStatus != "SUCCEEDED" {
		return nil
	}

	imgResp := &ImageResponse{}

	if len(status.OutputImages) > 0 {
		imgResp.Data = make([]struct {
			URL     string `json:"url,omitempty"`
			B64JSON string `json:"b64_json,omitempty"`
		}, len(status.OutputImages))
		for i, u := range status.OutputImages {
			imgResp.Data[i].URL = u
		}
		return imgResp
	}

	if status.Output != nil && len(status.Output.Results) > 0 {
		imgResp.Data = make([]struct {
			URL     string `json:"url,omitempty"`
			B64JSON string `json:"b64_json,omitempty"`
		}, len(status.Output.Results))
		for i, r := range status.Output.Results {
			imgResp.Data[i].URL = r.URL
			imgResp.Data[i].B64JSON = r.B64JSON
		}
		return imgResp
	}

	return nil // Status is SUCCEED but no images found
}

type taskStatusResponse struct {
	RequestID    string   `json:"request_id"`
	TaskID       string   `json:"task_id"`
	TaskStatus   string   `json:"task_status"`
	OutputImages []string `json:"output_images,omitempty"`
	Output       *struct {
		TaskID  string `json:"task_id"`
		Results []struct {
			URL     string `json:"url,omitempty"`
			B64JSON string `json:"b64_json,omitempty"`
		} `json:"results"`
	} `json:"output,omitempty"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
	Message string `json:"message,omitempty"`
}

// handlePollStatus evaluates a poll response and returns a result, an error, or (nil, nil) to continue polling.
func handlePollStatus(status *taskStatusResponse) (*ImageResponse, error) {
	if status.Error != nil {
		return nil, fmt.Errorf("image task failed: %s", status.Error.Message)
	}
	if imgResp := extractImagesFromTaskStatus(status); imgResp != nil {
		return imgResp, nil
	}
	switch status.TaskStatus {
	case "SUCCEED", "SUCCEEDED", "succeeded":
		return nil, fmt.Errorf("image task succeeded but no results in response")
	case "FAILED", "failed":
		msg := status.Message
		if msg == "" {
			msg = "image generation task failed"
		}
		return nil, fmt.Errorf("%s", msg)
	}
	// PENDING, RUNNING - continue polling
	return nil, nil
}

func (c *Client) pollImageTask(ctx context.Context, taskID string) (*ImageResponse, error) {
	pollURL := c.baseURL + "/tasks/" + taskID

	for i := 0; i < 40; i++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(10 * time.Second):
		}

		req, err := http.NewRequestWithContext(ctx, "GET", pollURL, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create poll request: %w", err)
		}
		req.Header.Set(headerAuthorization, bearerPrefix+c.apiKey)
		req.Header.Set("X-ModelScope-Task-Type", "image_generation")

		resp, err := c.http.Do(req)
		if err != nil {
			log.Printf("[ImageGen] poll error: %v", err)
			continue
		}

		respBody, err := io.ReadAll(io.LimitReader(resp.Body, maxImageResponseSize))
		_ = resp.Body.Close()
		if err != nil {
			continue
		}

		log.Printf("[ImageGen] poll #%d status=%d body_len=%d", i+1, resp.StatusCode, len(respBody))

		var status taskStatusResponse
		if err := json.Unmarshal(respBody, &status); err != nil {
			log.Printf("[ImageGen] poll parse error: %v", err)
			continue
		}

		if imgResp, err := handlePollStatus(&status); imgResp != nil || err != nil {
			return imgResp, err
		}
	}

	return nil, fmt.Errorf("image generation timed out after polling")
}
