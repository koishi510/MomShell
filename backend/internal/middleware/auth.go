package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/config"
	pkgjwt "github.com/momshell/backend/pkg/jwt"
)

const (
	ContextUserID = "user_id"
)

// AdminChecker is a function that checks if a user is an admin.
type AdminChecker func(userID string) bool

// AuthRequired requires a valid JWT token
func AuthRequired(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := extractUserID(c, cfg)
		if err != nil || userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权，请先登录"})
			return
		}
		c.Set(ContextUserID, userID)
		c.Next()
	}
}

// AuthOptional extracts user ID if token is present, but does not require it
func AuthOptional(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := extractUserID(c, cfg)
		if userID != "" {
			c.Set(ContextUserID, userID)
		}
		c.Next()
	}
}

// AdminRequired requires a valid JWT token and verifies admin role via the checker function.
func AdminRequired(cfg *config.Config, isAdmin AdminChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := extractUserID(c, cfg)
		if err != nil || userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权，请先登录"})
			return
		}

		if !isAdmin(userID) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "需要管理员权限"})
			return
		}

		c.Set(ContextUserID, userID)
		c.Next()
	}
}

func extractUserID(c *gin.Context, cfg *config.Config) (string, error) {
	tokenStr := ""

	// 1. Authorization header
	auth := c.GetHeader("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		tokenStr = strings.TrimPrefix(auth, "Bearer ")
	}

	// 2. X-Access-Token header
	if tokenStr == "" {
		tokenStr = c.GetHeader("X-Access-Token")
	}

	// Note: Cookie-based auth removed to prevent CSRF attacks.
	// All auth must be via explicit headers.

	if tokenStr == "" {
		return "", nil
	}

	// Check token blacklist (revoked tokens)
	if TokenBlacklist.IsBlacklisted(tokenStr) {
		log.Printf("[SECURITY] jwt_validation_failed | ip=%s | user=unknown | detail=token is blacklisted", c.ClientIP())
		return "", pkgjwt.ErrInvalidToken
	}

	claims, err := pkgjwt.ParseToken(tokenStr, cfg.JWTSecretKey)
	if err != nil {
		log.Printf("[SECURITY] jwt_validation_failed | ip=%s | user=unknown | detail=%v", c.ClientIP(), err)
		return "", err
	}

	if claims.Type != "access" {
		log.Printf("[SECURITY] jwt_validation_failed | ip=%s | user=%s | detail=invalid token type: %s", c.ClientIP(), claims.Subject, claims.Type)
		return "", pkgjwt.ErrInvalidToken
	}

	return claims.Subject, nil
}

// GetUserID extracts user ID from context (set by auth middleware)
func GetUserID(c *gin.Context) string {
	id, _ := c.Get(ContextUserID)
	if id == nil {
		return ""
	}
	return id.(string)
}
