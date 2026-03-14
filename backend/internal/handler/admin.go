package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/admin"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/service"
)

const errParamPrefix = "参数错误: "

type AdminHandler struct {
	adminService *service.AdminService
	authService  *service.AuthService
}

func NewAdminHandler(adminService *service.AdminService, authService *service.AuthService) *AdminHandler {
	return &AdminHandler{
		adminService: adminService,
		authService:  authService,
	}
}

// IsAdmin checks if the given user is an admin. Used as middleware.AdminChecker.
func (h *AdminHandler) IsAdmin(userID string) bool {
	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		return false
	}
	return user.IsAdmin
}

// ServeAdminPage returns the embedded admin HTML page
func (h *AdminHandler) ServeAdminPage(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", admin.HTML)
}

// GetStats returns dashboard statistics
func (h *AdminHandler) GetStats(c *gin.Context) {
	stats, err := h.adminService.GetDashboardStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ListUsers returns paginated user list
func (h *AdminHandler) ListUsers(c *gin.Context) {
	var params dto.AdminUserListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	resp, err := h.adminService.ListUsers(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetUser returns a single user's detail
func (h *AdminHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.adminService.GetUser(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, detail)
}

// CreateUser creates a new user
func (h *AdminHandler) CreateUser(c *gin.Context) {
	var req dto.AdminCreateUser
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errParamPrefix + err.Error()})
		return
	}

	detail, err := h.adminService.CreateUser(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, detail)
}

// UpdateUser updates user fields
func (h *AdminHandler) UpdateUser(c *gin.Context) {
	adminID := middleware.GetUserID(c)

	id := c.Param("id")
	var req dto.AdminUserUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errParamPrefix + err.Error()})
		return
	}

	detail, err := h.adminService.UpdateUser(id, adminID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, detail)
}

// DeleteUser deletes a user
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	adminID := middleware.GetUserID(c)

	id := c.Param("id")
	if err := h.adminService.DeleteUser(id, adminID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "用户已删除"})
}

// GetConfig returns configuration items
func (h *AdminHandler) GetConfig(c *gin.Context) {
	items := h.adminService.GetConfig()
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// UpdateConfig updates editable configuration items
func (h *AdminHandler) UpdateConfig(c *gin.Context) {
	var req dto.ConfigUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errParamPrefix + err.Error()})
		return
	}

	if err := h.adminService.UpdateConfig(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "配置已更新"})
}

// ListPhotos returns paginated photo list for admin
func (h *AdminHandler) ListPhotos(c *gin.Context) {
	var params dto.AdminPhotoListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	resp, err := h.adminService.ListPhotos(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// DeletePhoto deletes a photo by ID (admin)
func (h *AdminHandler) DeletePhoto(c *gin.Context) {
	id := c.Param("id")
	if err := h.adminService.DeletePhoto(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "照片已删除"})
}
