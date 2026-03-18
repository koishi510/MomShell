package dto

import "time"

type FutureLetterOption struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Hint  string `json:"hint"`
}

type FutureLetterQuestion struct {
	ID      string               `json:"id"`
	Prompt  string               `json:"prompt"`
	Options []FutureLetterOption `json:"options"`
}

type FutureLetterAdviceItem struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Kind        string `json:"kind"`
}

type FutureLetterAdviceSource struct {
	Label  string `json:"label"`
	Detail string `json:"detail"`
}

type FutureLetterResponseItem struct {
	ID         string `json:"id"`
	LetterCode string `json:"letter_code"`

	StageTag   string `json:"stage_tag"`
	StageLabel string `json:"stage_label"`
	StateTag   string `json:"state_tag"`
	StateLabel string `json:"state_label"`

	WishContent *string `json:"wish_content"`

	DadPlanCode      string                     `json:"dad_plan_code"`
	DadPlanTitle     string                     `json:"dad_plan_title"`
	DadHeadline      string                     `json:"dad_headline"`
	DadSummary       string                     `json:"dad_summary"`
	DadAdviceItems   []FutureLetterAdviceItem   `json:"dad_advice_items"`
	DadAdviceSources []FutureLetterAdviceSource `json:"dad_advice_sources"`

	ImagePrompt string    `json:"image_prompt"`
	CreatedAt   time.Time `json:"created_at"`
}

type FutureLetterView struct {
	LetterCode      string                     `json:"letter_code"`
	Title           string                     `json:"title"`
	Intro           string                     `json:"intro"`
	Outro           string                     `json:"outro"`
	Signature       string                     `json:"signature"`
	WishPrompt      string                     `json:"wish_prompt"`
	PaperTheme      string                     `json:"paper_theme"`
	SceneHint       string                     `json:"scene_hint"`
	Questions       []FutureLetterQuestion     `json:"questions"`
	LatestResponse  *FutureLetterResponseItem  `json:"latest_response"`
	RecentResponses []FutureLetterResponseItem `json:"recent_responses"`
}

type FutureLetterRespondRequest struct {
	LetterCode       string `json:"letter_code" binding:"required"`
	StageOptionID    string `json:"stage_option_id" binding:"required"`
	StateOptionID    string `json:"state_option_id" binding:"required"`
	StageOptionLabel string `json:"stage_option_label" binding:"required"`
	StateOptionLabel string `json:"state_option_label" binding:"required"`
	WishContent      string `json:"wish_content" binding:"max=300"`
}
