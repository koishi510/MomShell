package service

import (
	"strings"

	"github.com/momshell/backend/internal/model"
)

// SensitiveCategory represents categories of sensitive content
type SensitiveCategory string

const (
	CatPseudoscience     SensitiveCategory = "pseudoscience"
	CatDepressionTrigger SensitiveCategory = "depression_trigger"
	CatSoftPornography   SensitiveCategory = "soft_pornography"
	CatViolence          SensitiveCategory = "violence"
	CatSpam              SensitiveCategory = "spam"
	CatMisinformation    SensitiveCategory = "misinformation"
	CatSelfHarm          SensitiveCategory = "self_harm"
	CatPolitical         SensitiveCategory = "political"
	CatHarassment        SensitiveCategory = "harassment"
)

var autoRejectCategories = map[SensitiveCategory]bool{
	CatPseudoscience:   true,
	CatSoftPornography: true,
	CatViolence:        true,
	CatSpam:            true,
	CatHarassment:      true,
}

var crisisCategories = map[SensitiveCategory]bool{
	CatDepressionTrigger: true,
	CatSelfHarm:          true,
}

var manualReviewCategories = map[SensitiveCategory]bool{
	CatMisinformation: true,
	CatPolitical:      true,
}

// keyword => category mapping
var sensitiveKeywords = map[string]SensitiveCategory{
	// Pseudoscience
	"包治百病": CatPseudoscience,
	"神奇疗法": CatPseudoscience,
	"祖传秘方": CatPseudoscience,
	// Spam
	"加微信": CatSpam,
	"免费领": CatSpam,
	"点击链接": CatSpam,
	// Violence
	"打死": CatViolence,
	"杀了": CatViolence,
	// Self harm
	"不想活":  CatSelfHarm,
	"自杀":   CatSelfHarm,
	"自残":   CatSelfHarm,
	"活着没意思": CatSelfHarm,
	// Harassment
	"废物": CatHarassment,
	"垃圾人": CatHarassment,
}

// ModerationDecision holds the result of content moderation
type ModerationDecision struct {
	Result     model.ModerationResult
	Categories []SensitiveCategory
	Confidence float64
	Reason     *string
}

// ModerationService handles content moderation
type ModerationService struct{}

func NewModerationService() *ModerationService {
	return &ModerationService{}
}

func (s *ModerationService) ModerateText(content string) ModerationDecision {
	detected := s.scanKeywords(content)

	if len(detected) == 0 {
		return ModerationDecision{
			Result:     model.ModerationPassed,
			Confidence: 1.0,
		}
	}

	// Check crisis categories
	for _, cat := range detected {
		if crisisCategories[cat] {
			reason := "检测到可能存在心理危机，已推送帮助资源。如需发布，请修改内容后重试。"
			return ModerationDecision{
				Result:     model.ModerationRejected,
				Categories: detected,
				Confidence: 0.95,
				Reason:     &reason,
			}
		}
	}

	// Check auto-reject
	for _, cat := range detected {
		if autoRejectCategories[cat] {
			reasons := map[SensitiveCategory]string{
				CatPseudoscience:   "内容可能包含未经证实的医疗信息",
				CatSoftPornography: "内容包含不适当信息",
				CatViolence:        "内容包含暴力相关信息",
				CatSpam:            "内容疑似广告或垃圾信息",
				CatHarassment:      "内容包含不友善言论",
			}
			reason := reasons[cat]
			return ModerationDecision{
				Result:     model.ModerationRejected,
				Categories: detected,
				Confidence: 0.9,
				Reason:     &reason,
			}
		}
	}

	// Check manual review
	for _, cat := range detected {
		if manualReviewCategories[cat] {
			reason := "内容需要人工审核"
			return ModerationDecision{
				Result:     model.ModerationNeedManualReview,
				Categories: detected,
				Confidence: 0.7,
				Reason:     &reason,
			}
		}
	}

	return ModerationDecision{
		Result:     model.ModerationPassed,
		Categories: detected,
		Confidence: 0.8,
	}
}

func (s *ModerationService) scanKeywords(content string) []SensitiveCategory {
	lower := strings.ToLower(content)
	seen := make(map[SensitiveCategory]bool)
	var result []SensitiveCategory

	for keyword, category := range sensitiveKeywords {
		if strings.Contains(lower, keyword) {
			if !seen[category] {
				seen[category] = true
				result = append(result, category)
			}
		}
	}

	return result
}
