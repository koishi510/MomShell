package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/service"
)

const maxAvatarSize = 2 << 20 // 2 MB

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
	"image/webp": true,
}

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

// POST /api/v1/community/users/me/avatar
func (h *UserHandler) UploadAvatar(c *gin.Context) {
	userID := middleware.GetUserID(c)

	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请选择要上传的图片"})
		return
	}
	defer file.Close()

	if header.Size > maxAvatarSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "图片大小不能超过 2MB"})
		return
	}

	contentType := header.Header.Get("Content-Type")
	if !allowedImageTypes[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "仅支持 JPG、PNG、GIF、WebP 格式"})
		return
	}

	ext := ".jpg"
	switch contentType {
	case "image/png":
		ext = ".png"
	case "image/gif":
		ext = ".gif"
	case "image/webp":
		ext = ".webp"
	}

	uploadDir := "uploads/avatars"
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "上传失败"})
		return
	}

	filename := userID + ext
	savePath := filepath.Join(uploadDir, filename)

	// Remove old avatar files with different extensions
	for _, e := range []string{".jpg", ".png", ".gif", ".webp"} {
		if e != ext {
			os.Remove(filepath.Join(uploadDir, userID+e))
		}
	}

	if err := c.SaveUploadedFile(header, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "上传失败"})
		return
	}

	avatarURL := fmt.Sprintf("/uploads/avatars/%s", filename)
	// Add cache-busting query param so browser refreshes the image
	avatarURLWithBust := fmt.Sprintf("%s?v=%d", avatarURL, header.Size)

	profile, err := h.userService.UpdateProfile(userID, dto.UserProfileUpdate{
		AvatarURL: &avatarURLWithBust,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// POST /api/v1/community/users/me/shell-code
func (h *UserHandler) GenerateShellCode(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profile, err := h.userService.GenerateShellCode(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, profile)
}

// POST /api/v1/community/users/me/bind
func (h *UserHandler) BindPartner(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req dto.BindPartnerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	profile, err := h.userService.BindPartner(userID, req.ShellCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, profile)
}

// DELETE /api/v1/community/users/me/bind
func (h *UserHandler) UnbindPartner(c *gin.Context) {
	userID := middleware.GetUserID(c)
	profile, err := h.userService.UnbindPartner(userID)
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
