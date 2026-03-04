package dto

// LikeRequest is the request body for liking content
type LikeRequest struct {
	TargetType string `json:"target_type" binding:"required,oneof=question answer comment"`
	TargetID   string `json:"target_id" binding:"required"`
}

// LikeResponse is the response for like operations
type LikeResponse struct {
	IsLiked  bool `json:"is_liked"`
	NewCount int  `json:"new_count"`
}

// CollectionRequest is the request body for collecting a question
type CollectionRequest struct {
	QuestionID string  `json:"question_id" binding:"required"`
	FolderName *string `json:"folder_name"`
	Note       *string `json:"note"`
}

// CollectionResponse is the response for collection operations
type CollectionResponse struct {
	IsCollected bool `json:"is_collected"`
	NewCount    int  `json:"new_count"`
}

// CollectionItem is a single collection item
type CollectionItem struct {
	ID         string           `json:"id"`
	Question   QuestionListItem `json:"question"`
	FolderName *string          `json:"folder_name"`
	Note       *string          `json:"note"`
	CreatedAt  interface{}      `json:"created_at"`
}

// InteractionStatus is the response for interaction status check
type InteractionStatus struct {
	IsLiked     bool `json:"is_liked"`
	IsCollected bool `json:"is_collected"`
}
