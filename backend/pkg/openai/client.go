package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
		http:    &http.Client{},
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
		MaxTokens:      1024,
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
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("openai chat request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("openai chat completion failed: error, status code: %d, status: %s, message: %s",
			resp.StatusCode, resp.Status, string(respBody))
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
