package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/service"
)

type WhisperHandler struct {
	whisperService *service.WhisperService
}

func NewWhisperHandler(whisperService *service.WhisperService) *WhisperHandler {
	return &WhisperHandler{whisperService: whisperService}
}

// POST /api/v1/whisper
func (h *WhisperHandler) Create(c *gin.Context) {
	var req dto.WhisperCreate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	item, err := h.whisperService.CreateWhisper(userID, req.Content)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "用户不存在" {
			status = http.StatusUnauthorized
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

// GET /api/v1/whisper
func (h *WhisperHandler) List(c *gin.Context) {
	userID := middleware.GetUserID(c)
	items, err := h.whisperService.GetWhispers(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, items)
}

// GET /api/v1/whisper/tips
func (h *WhisperHandler) Tips(c *gin.Context) {
	userID := middleware.GetUserID(c)
	tips, err := h.whisperService.GetWhisperTips(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tips)
}

// GET /api/v1/whisper/future-letter
func (h *WhisperHandler) FutureLetter(c *gin.Context) {
	userID := middleware.GetUserID(c)
	view, err := h.whisperService.GetFutureLetterView(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, view)
}

// POST /api/v1/whisper/future-letter/respond
func (h *WhisperHandler) RespondFutureLetter(c *gin.Context) {
	var req dto.FutureLetterRespondRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	item, err := h.whisperService.RespondFutureLetter(userID, req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "用户不存在" {
			status = http.StatusUnauthorized
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}
