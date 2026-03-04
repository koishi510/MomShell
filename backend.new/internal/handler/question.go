package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/service"
)

type QuestionHandler struct {
	communityService *service.CommunityService
	authService      *service.AuthService
}

func NewQuestionHandler(communityService *service.CommunityService, authService *service.AuthService) *QuestionHandler {
	return &QuestionHandler{communityService: communityService, authService: authService}
}

// GET /api/v1/community/questions
func (h *QuestionHandler) List(c *gin.Context) {
	var params dto.QuestionListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	resp, err := h.communityService.GetQuestions(params, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GET /api/v1/community/questions/hot
func (h *QuestionHandler) ListHot(c *gin.Context) {
	params := dto.QuestionListParams{}
	params.SortBy = "view_count"
	params.Order = "desc"
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	params.SortBy = "view_count"
	params.Order = "desc"

	userID := middleware.GetUserID(c)
	resp, err := h.communityService.GetQuestions(params, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GET /api/v1/community/questions/channel/:channel
func (h *QuestionHandler) ListByChannel(c *gin.Context) {
	channel := c.Param("channel")
	if channel != "professional" && channel != "experience" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的频道"})
		return
	}

	var params dto.QuestionListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	params.Channel = channel

	userID := middleware.GetUserID(c)
	resp, err := h.communityService.GetQuestions(params, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GET /api/v1/community/questions/:id
func (h *QuestionHandler) Get(c *gin.Context) {
	id := c.Param("id")
	userID := middleware.GetUserID(c)

	resp, err := h.communityService.GetQuestion(id, userID)
	if err != nil {
		if err.Error() == "问题不存在" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// POST /api/v1/community/questions
func (h *QuestionHandler) Create(c *gin.Context) {
	var req dto.QuestionCreate
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

	question, err := h.communityService.CreateQuestion(req, user)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": question.ID, "status": string(question.Status)})
}

// PUT /api/v1/community/questions/:id
func (h *QuestionHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req dto.QuestionUpdate
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

	question, err := h.communityService.UpdateQuestion(id, req, user)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "问题不存在" {
			status = http.StatusNotFound
		} else if err.Error() == "无权修改此问题" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": question.ID, "status": string(question.Status)})
}

// DELETE /api/v1/community/questions/:id
func (h *QuestionHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	userID := middleware.GetUserID(c)
	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在"})
		return
	}

	if err := h.communityService.DeleteQuestion(id, user); err != nil {
		status := http.StatusBadRequest
		if err.Error() == "问题不存在" {
			status = http.StatusNotFound
		} else if err.Error() == "无权删除此问题" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
