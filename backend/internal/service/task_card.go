package service

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/pkg/openai"
)

// downloadTaskCardImage saves the generated image to disk and returns its URL path.
func downloadTaskCardImage(imgResp *openai.ImageResponse) (string, error) {
	uploadDir := "uploads/photos"
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create upload dir: %w", err)
	}

	filename := fmt.Sprintf("%s_%d.png", uuid.New().String(), time.Now().Unix())
	savePath := filepath.Join(uploadDir, filename)

	data := imgResp.Data[0]

	if data.URL != "" {
		return downloadCardFromURL(data.URL, savePath)
	}

	if data.B64JSON != "" {
		decoded, err := base64.StdEncoding.DecodeString(data.B64JSON)
		if err != nil {
			return "", fmt.Errorf("failed to decode base64 image: %w", err)
		}
		if err := os.WriteFile(savePath, decoded, 0o644); err != nil {
			return "", fmt.Errorf("failed to write image file: %w", err)
		}
		return "/uploads/photos/" + filename, nil
	}

	return "", fmt.Errorf("no image data in response")
}

func downloadCardFromURL(imageURL, savePath string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", imageURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create download request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to download image: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download failed with status: %d", resp.StatusCode)
	}

	out, err := os.Create(savePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer func() { _ = out.Close() }()

	if _, err := io.Copy(out, io.LimitReader(resp.Body, 20<<20)); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	return "/uploads/photos/" + filepath.Base(savePath), nil
}

// buildTaskCardPrompt creates an image generation prompt for a task memory card.
func buildTaskCardPrompt(title, description string) string {
	scene := title
	if description != "" {
		runes := []rune(description)
		if len(runes) > 60 {
			runes = runes[:60]
		}
		scene = title + "，" + string(runes)
	}

	return fmt.Sprintf(
		"贴纸插画风格，场景：爸爸完成了一项家庭任务——%s。"+
			"根据任务内容自然呈现画面，可能出现的角色有爸爸、妈妈、宝宝，"+
			"按任务场景合理搭配，也可能只有物品没有人物。"+
			"可爱卡通风格，暖色调，白色边框，矢量风格，高质量。"+
			"不要文字，不要水印。",
		scene,
	)
}

// GenerateTaskCard generates an AI image card for a pending task.
func (s *TaskService) GenerateTaskCard(userID, taskID string) (string, error) {
	ut, err := s.taskRepo.FindUserTaskByID(taskID)
	if err != nil {
		return "", errors.New(errTaskNotFound)
	}
	if ut.UserID != userID {
		return "", fmt.Errorf("无权操作此任务")
	}
	if ut.Status != model.TaskPending {
		return "", fmt.Errorf("只有待完成的任务可以生成记忆卡片")
	}
	if s.openaiClient == nil {
		return "", fmt.Errorf("AI 服务不可用")
	}

	// Resolve task title/description
	title := ut.AITitle
	desc := ut.AIDescription
	if ut.Source != model.TaskSourceAI && ut.Task != nil {
		title = ut.Task.Title
		desc = ut.Task.Description
	}

	prompt := buildTaskCardPrompt(title, desc)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	imgResp, err := s.openaiClient.GenerateImage(ctx, s.imageModel, prompt)
	if err != nil {
		log.Printf("[TaskCard] image generation failed: %v", err)
		return "", fmt.Errorf("图片生成失败，请重试")
	}

	imageURL, err := downloadTaskCardImage(imgResp)
	if err != nil {
		log.Printf("[TaskCard] image download failed: %v", err)
		return "", fmt.Errorf("图片保存失败，请重试")
	}

	return imageURL, nil
}
