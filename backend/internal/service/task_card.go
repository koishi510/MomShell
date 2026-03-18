package service

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
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

func buildVerifiedTaskCardPrompt(title, description string, score *int, comment *string) string {
	prompt := buildTaskCardPrompt(title, description)
	if score == nil && (comment == nil || *comment == "") {
		return prompt + " 这是一张妈妈验收通过后存入照片库的纪念卡片。"
	}

	var details string
	if score != nil {
		details = fmt.Sprintf(" 妈妈已经验收通过，评分 %d/5。", *score)
	}
	if comment != nil && *comment != "" {
		details += fmt.Sprintf(" 她留下的话是：%s。", *comment)
	}
	return prompt + details + " 整体像家庭任务完成后的温暖纪念卡。"
}

func (s *TaskService) generateVerifiedTaskCardPhoto(momID string, ut model.UserTask) error {
	if s.openaiClient == nil || s.imageModel == "" || s.photoRepo == nil {
		return nil
	}

	title, desc, _, _ := resolveTaskContent(ut)
	if title == "" {
		title = "任务纪念卡"
	}
	prompt := buildVerifiedTaskCardPrompt(title, desc, ut.Score, ut.Comment)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	imgResp, err := s.openaiClient.GenerateImage(ctx, s.imageModel, prompt)
	if err != nil {
		return fmt.Errorf("image generation failed: %w", err)
	}

	imageURL, err := downloadTaskCardImage(imgResp)
	if err != nil {
		return fmt.Errorf("image download failed: %w", err)
	}

	description := "妈妈已验收通过的任务纪念卡"
	if ut.Comment != nil && *ut.Comment != "" {
		description = *ut.Comment
	}

	return s.photoRepo.Create(&model.Photo{
		UserID:      momID,
		Title:       title,
		Description: description,
		ImageURL:    imageURL,
		Source:      "task_card",
	})
}
