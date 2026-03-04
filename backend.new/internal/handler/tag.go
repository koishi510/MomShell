package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/service"
)

type TagHandler struct {
	communityService *service.CommunityService
}

func NewTagHandler(communityService *service.CommunityService) *TagHandler {
	return &TagHandler{communityService: communityService}
}

// GET /api/v1/community/tags
func (h *TagHandler) List(c *gin.Context) {
	tags, err := h.communityService.GetTags()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tags)
}

// GET /api/v1/community/tags/hot
func (h *TagHandler) ListHot(c *gin.Context) {
	tags, err := h.communityService.GetHotTags(20)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tags)
}

// POST /api/v1/community/tags (admin only)
func (h *TagHandler) Create(c *gin.Context) {
	var req dto.TagCreate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tag, err := h.communityService.CreateTag(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": tag.ID, "name": tag.Name, "slug": tag.Slug})
}
