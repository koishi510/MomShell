package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/service"
)

type InteractionHandler struct {
	communityService *service.CommunityService
}

func NewInteractionHandler(communityService *service.CommunityService) *InteractionHandler {
	return &InteractionHandler{communityService: communityService}
}

// toggleLike is the shared handler for both CreateLike and DeleteLike.
// Since the service layer uses ToggleLike, both endpoints use the same logic.
func (h *InteractionHandler) toggleLike(c *gin.Context) {
	var req dto.LikeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	isLiked, newCount, err := h.communityService.ToggleLike(userID, req.TargetType, req.TargetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.LikeResponse{IsLiked: isLiked, NewCount: newCount})
}

// POST /api/v1/community/likes
func (h *InteractionHandler) CreateLike(c *gin.Context) {
	h.toggleLike(c)
}

// DELETE /api/v1/community/likes
func (h *InteractionHandler) DeleteLike(c *gin.Context) {
	h.toggleLike(c)
}

// POST /api/v1/community/collections
func (h *InteractionHandler) CreateCollection(c *gin.Context) {
	var req dto.CollectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	isCollected, newCount, err := h.communityService.ToggleCollection(userID, req.QuestionID, req.FolderName, req.Note)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.CollectionResponse{IsCollected: isCollected, NewCount: newCount})
}

// DELETE /api/v1/community/collections/:id
func (h *InteractionHandler) DeleteCollection(c *gin.Context) {
	questionID := c.Param("id")
	userID := middleware.GetUserID(c)

	isCollected, newCount, err := h.communityService.ToggleCollection(userID, questionID, nil, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.CollectionResponse{IsCollected: isCollected, NewCount: newCount})
}

// GET /api/v1/community/collections/my
func (h *InteractionHandler) GetMyCollections(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var params dto.PaginationParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.communityService.GetUserCollections(userID, params.GetPage(), params.GetPageSize())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
