package service

import (
	"context"
	"fmt"
	"time"

	"github.com/momshell/backend/internal/model"
)

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

	imageURL, err := saveGeneratedImage(imgResp)
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
