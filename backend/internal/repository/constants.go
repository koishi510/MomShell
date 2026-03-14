package repository

// Query clause constants to avoid duplicating string literals (SonarCloud go:S1192).

const (
	// WHERE clauses
	whereID                  = "id = ?"
	whereUserID              = "user_id = ?"
	whereIDAndUserID         = "id = ? AND user_id = ?"
	whereUserIDAndIsOnWall   = "user_id = ? AND is_on_wall = ?"
	whereUserIDIn            = "user_id IN ?"
	whereUserIDInAndIsOnWall = "user_id IN ? AND is_on_wall = ?"
	whereIDAndUserIDIn       = "id = ? AND user_id IN ?"
	whereQuestionID          = "question_id = ?"
	whereUserIDAndQuestionID = "user_id = ? AND question_id = ?"
	whereIsOnWall            = "is_on_wall = ?"
	whereIsActive            = "is_active = ?"
	whereAuthorID            = "author_id = ?"

	// ORDER clauses
	orderCreatedAtDesc = "created_at desc"

	// Preload associations
	preloadCertification = "Certification"
)
