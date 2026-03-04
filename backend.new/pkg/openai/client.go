package openai

import (
	"context"
	"fmt"

	oai "github.com/sashabaranov/go-openai"
)

type Client struct {
	client *oai.Client
	model  string
}

func NewClient(apiKey, baseURL, model string) *Client {
	cfg := oai.DefaultConfig(apiKey)
	if baseURL != "" {
		cfg.BaseURL = baseURL
	}
	return &Client{
		client: oai.NewClientWithConfig(cfg),
		model:  model,
	}
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func (c *Client) Chat(ctx context.Context, messages []Message) (string, error) {
	var msgs []oai.ChatCompletionMessage
	for _, m := range messages {
		msgs = append(msgs, oai.ChatCompletionMessage{
			Role:    m.Role,
			Content: m.Content,
		})
	}

	resp, err := c.client.CreateChatCompletion(ctx, oai.ChatCompletionRequest{
		Model:       c.model,
		Messages:    msgs,
		Temperature: 0.7,
		MaxTokens:   1024,
	})
	if err != nil {
		return "", fmt.Errorf("openai chat completion failed: %w", err)
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("openai returned no choices")
	}
	return resp.Choices[0].Message.Content, nil
}
