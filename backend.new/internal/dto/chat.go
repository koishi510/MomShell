package dto

// UserMessage is the request body for chat
type UserMessage struct {
	Content   string  `json:"content" binding:"required,min=1"`
	SessionID *string `json:"session_id"`
}

// VisualMetadata holds visual effect info
type VisualMetadata struct {
	EffectType string  `json:"effect_type"` // ripple, sunlight, calm, warm_glow, gentle_wave
	Intensity  float64 `json:"intensity"`   // 0.0 ~ 1.0
	ColorTone  string  `json:"color_tone"`  // soft_pink, warm_gold, gentle_blue, lavender, neutral_white, coral, sage
}

// VisualResponse is the response body for chat
type VisualResponse struct {
	Text           string         `json:"text"`
	VisualMetadata VisualMetadata `json:"visual_metadata"`
	MemoryUpdated  bool           `json:"memory_updated"`
}

// ChatProfile is the response body for chat profile
type ChatProfile struct {
	PreferredName        *string  `json:"preferred_name"`
	HasPets              bool     `json:"has_pets"`
	PetDetails           *string  `json:"pet_details"`
	Interests            []string `json:"interests"`
	Concerns             []string `json:"concerns"`
	ImportantDates       []string `json:"important_dates"`
	BabyAgeWeeks         *int     `json:"baby_age_weeks"`
	CommunityInteractions []string `json:"community_interactions"`
}
