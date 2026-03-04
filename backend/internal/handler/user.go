package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/service"
)

type UserHandler struct {
	userService *service.UserService
}

func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// GET /api/v1/community/users/me
func (h *UserHandler) GetMe(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profile, err := h.userService.GetProfile(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// PUT /api/v1/community/users/me
func (h *UserHandler) UpdateMe(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req dto.UserProfileUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	profile, err := h.userService.UpdateProfile(userID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// GET /api/v1/community/users/me/questions
func (h *UserHandler) GetMyQuestions(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var params dto.PaginationParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.userService.GetUserQuestions(userID, params.GetPage(), params.GetPageSize())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GET /api/v1/community/users/me/answers
func (h *UserHandler) GetMyAnswers(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var params dto.PaginationParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.userService.GetUserAnswers(userID, params.GetPage(), params.GetPageSize())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
