package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/admin"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/service"
)

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

// requireAdmin checks if the current user is an admin
func (h *AdminHandler) requireAdmin(c *gin.Context) (string, bool) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return "", false
	}

	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在"})
		return "", false
	}

	if !user.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "需要管理员权限"})
		return "", false
	}

	return userID, true
}

// ServeAdminPage returns the embedded admin HTML page
func (h *AdminHandler) ServeAdminPage(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", admin.HTML)
}

// GetStats returns dashboard statistics
func (h *AdminHandler) GetStats(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	stats, err := h.adminService.GetDashboardStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ListUsers returns paginated user list
func (h *AdminHandler) ListUsers(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

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
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

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
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	var req dto.AdminCreateUser
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误: " + err.Error()})
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
	adminID, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var req dto.AdminUserUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误: " + err.Error()})
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
	adminID, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id := c.Param("id")
	if err := h.adminService.DeleteUser(id, adminID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "用户已删除"})
}

// GetConfig returns configuration items
func (h *AdminHandler) GetConfig(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	items := h.adminService.GetConfig()
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// UpdateConfig updates editable configuration items
func (h *AdminHandler) UpdateConfig(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	var req dto.ConfigUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误: " + err.Error()})
		return
	}

	if err := h.adminService.UpdateConfig(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "配置已更新"})
}
