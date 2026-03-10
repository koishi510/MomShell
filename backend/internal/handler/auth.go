package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/config"
	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/service"
	pkgjwt "github.com/momshell/backend/pkg/jwt"
)

const (
	refreshTokenCookie = "momshell_refresh_token"
	refreshCookiePath  = "/api/v1/auth"
)

type AuthHandler struct {
	authService *service.AuthService
	cfg         *config.Config
}

func NewAuthHandler(authService *service.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{authService: authService, cfg: cfg}
}

// isSecureRequest determines whether the current HTTP request should be treated
// as secure for setting the Secure flag on cookies. It checks actual TLS first,
// then falls back to X-Forwarded-Proto only when cfg.TrustProxy is enabled
// (i.e. the app runs behind a known reverse proxy that sets this header).
func (h *AuthHandler) isSecureRequest(c *gin.Context) bool {
	if c.Request.TLS != nil {
		return true
	}
	if h.cfg.TrustProxy {
		return strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
	}
	return false
}

func (h *AuthHandler) setRefreshCookie(c *gin.Context, refreshToken string, maxAge int) {
	secure := h.isSecureRequest(c)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(refreshTokenCookie, refreshToken, maxAge, refreshCookiePath, "", secure, true)
}

func (h *AuthHandler) clearRefreshCookie(c *gin.Context) {
	secure := h.isSecureRequest(c)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(refreshTokenCookie, "", -1, refreshCookiePath, "", secure, true)
}

// POST /api/v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Register(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Login(req)
	if err != nil {
		status := http.StatusUnauthorized
		if err.Error() == "账号已禁用" || err.Error() == "账号已被封禁" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	// Set refresh token as httpOnly cookie
	maxAge := h.cfg.JWTRefreshTokenExpireDays * 86400
	h.setRefreshCookie(c, resp.RefreshToken, maxAge)

	// Return only access token in response body
	c.JSON(http.StatusOK, dto.AccessTokenResponse{
		AccessToken: resp.AccessToken,
		ExpiresIn:   resp.ExpiresIn,
	})
}

// POST /api/v1/auth/refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	// Read refresh token from httpOnly cookie first, fall back to JSON body
	refreshToken, _ := c.Cookie(refreshTokenCookie)
	if refreshToken == "" {
		var req dto.RefreshRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing refresh token"})
			return
		}
		refreshToken = req.RefreshToken
	}

	resp, err := h.authService.RefreshToken(refreshToken)
	if err != nil {
		h.clearRefreshCookie(c)
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Rotate refresh token cookie
	maxAge := h.cfg.JWTRefreshTokenExpireDays * 86400
	h.setRefreshCookie(c, resp.RefreshToken, maxAge)

	c.JSON(http.StatusOK, dto.AccessTokenResponse{
		AccessToken: resp.AccessToken,
		ExpiresIn:   resp.ExpiresIn,
	})
}

// GET /api/v1/auth/me
func (h *AuthHandler) GetMe(c *gin.Context) {
	userID := middleware.GetUserID(c)
	resp, err := h.authService.GetCurrentUser(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// POST /api/v1/auth/change-password
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req dto.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.authService.ChangePassword(userID, req.OldPassword, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "密码修改成功"})
}

// POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	tokenStr := ""
	auth := c.GetHeader("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		tokenStr = strings.TrimPrefix(auth, "Bearer ")
	}
	if tokenStr == "" {
		tokenStr = c.GetHeader("X-Access-Token")
	}

	if tokenStr != "" {
		claims, err := pkgjwt.ParseToken(tokenStr, h.authService.GetJWTSecret())
		if err == nil && claims.ExpiresAt != nil {
			middleware.TokenBlacklist.Add(tokenStr, claims.ExpiresAt.Time)
		}
	}

	h.clearRefreshCookie(c)
	c.JSON(http.StatusOK, gin.H{"message": "已退出登录"})
}

// POST /api/v1/auth/forgot-password
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req dto.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := h.authService.ForgotPassword(req.Email)
	if err != nil {
		// Don't reveal if user doesn't exist
		c.JSON(http.StatusOK, gin.H{"message": "如果该邮箱已注册，将收到重置密码邮件"})
		return
	}

	// TODO: In production, send email with reset link instead of logging
	_ = token // token would be sent via email
	c.JSON(http.StatusOK, gin.H{
		"message": "如果该邮箱已注册，将收到重置密码邮件",
	})
}

// POST /api/v1/auth/reset-password
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req dto.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.authService.ResetPassword(req.Token, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "密码重置成功"})
}

// PATCH /api/v1/auth/me/role
func (h *AuthHandler) UpdateRole(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req dto.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.UpdateRole(userID, req.Role)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "认证专业人员不能修改角色" || err.Error() == "管理员不能通过此接口修改角色" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
