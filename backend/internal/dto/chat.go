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
	PreferredName         *string  `json:"preferred_name"`
	HasPets               bool     `json:"has_pets"`
	PetDetails            *string  `json:"pet_details"`
	Interests             []string `json:"interests"`
	Concerns              []string `json:"concerns"`
	Facts                 []string `json:"facts"`
	ImportantDates        []string `json:"important_dates"`
	BabyAgeWeeks          *int     `json:"baby_age_weeks"`
	CommunityInteractions []string `json:"community_interactions"`
}

// ChatMemoryFactDTO is the response body for a single memory fact
type ChatMemoryFactDTO struct {
	ID               string  `json:"id"`
	Content          string  `json:"content"`
	Category         string  `json:"category"`
	OwnerUserID      string  `json:"owner_user_id"`
	OwnerNickname    string  `json:"owner_nickname"`
	CreatedAt        string  `json:"created_at"`
	LastReferencedAt *string `json:"last_referenced_at"`
}

// ChatMemoryFactsResponse wraps the list of memory facts
type ChatMemoryFactsResponse struct {
	Facts []ChatMemoryFactDTO `json:"facts"`
	Total int                 `json:"total"`
}

// ConversationTurn represents a single user-assistant exchange
type ConversationTurn struct {
	UserInput         string `json:"user_input"`
	AssistantResponse string `json:"assistant_response"`
}

// ConversationHistoryResponse wraps conversation turns and summary
type ConversationHistoryResponse struct {
	Turns   []ConversationTurn `json:"turns"`
	Summary string             `json:"summary"`
}
