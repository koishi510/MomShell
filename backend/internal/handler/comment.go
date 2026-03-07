package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/service"
)

type CommentHandler struct {
	communityService *service.CommunityService
	authService      *service.AuthService
	communityAI      *service.CommunityAIService
}

func NewCommentHandler(communityService *service.CommunityService, authService *service.AuthService, communityAI *service.CommunityAIService) *CommentHandler {
	return &CommentHandler{communityService: communityService, authService: authService, communityAI: communityAI}
}

// GET /api/v1/community/answers/:id/comments
func (h *CommentHandler) List(c *gin.Context) {
	answerID := c.Param("id")
	userID := middleware.GetUserID(c)

	comments, err := h.communityService.GetComments(answerID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, comments)
}

// POST /api/v1/community/answers/:id/comments
func (h *CommentHandler) Create(c *gin.Context) {
	answerID := c.Param("id")

	var req dto.CommentCreate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在"})
		return
	}

	comment, err := h.communityService.CreateComment(answerID, req, user)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "回答不存在" || err.Error() == "回复目标不存在" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	// Trigger AI reply if commenting on AI's answer, replying to AI, or @mentioning AI
	if h.communityAI != nil && h.communityAI.ShouldReplyToComment(req.Content, answerID, req.ParentID) {
		go h.communityAI.HandleNewComment(answerID, comment.ID)
	}

	c.JSON(http.StatusCreated, comment)
}

// DELETE /api/v1/community/comments/:id
func (h *CommentHandler) Delete(c *gin.Context) {
	commentID := c.Param("id")

	userID := middleware.GetUserID(c)
	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在"})
		return
	}

	if err := h.communityService.DeleteComment(commentID, user); err != nil {
		status := http.StatusBadRequest
		if err.Error() == "评论不存在" {
			status = http.StatusNotFound
		} else if err.Error() == "无权删除此评论" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
