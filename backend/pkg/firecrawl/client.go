package firecrawl

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Client struct {
	apiKey string
	http   *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		http:   &http.Client{},
	}
}

type SearchResult struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Markdown    string `json:"markdown"`
}

type searchRequest struct {
	Query string `json:"query"`
	Limit int    `json:"limit"`
}

type searchResponse struct {
	Success bool           `json:"success"`
	Data    []SearchResult `json:"data"`
}

func (c *Client) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	if c.apiKey == "" {
		return nil, nil
	}

	body, err := json.Marshal(searchRequest{Query: query, Limit: limit})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.firecrawl.dev/v1/search", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("firecrawl search failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("firecrawl search failed: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	var searchResp searchResponse
	if err := json.Unmarshal(respBody, &searchResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return searchResp.Data, nil
}
