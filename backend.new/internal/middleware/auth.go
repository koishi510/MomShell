package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/config"
	pkgjwt "github.com/momshell/backend/pkg/jwt"
)

const (
	ContextUserID = "user_id"
)

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

// AdminRequired requires a valid JWT token and admin role
// Note: actual role check is done in handler with user lookup
func AdminRequired(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := extractUserID(c, cfg)
		if err != nil || userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权，请先登录"})
			return
		}
		c.Set(ContextUserID, userID)
		// Admin role check will be done in the handler after fetching the user
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

	// 3. Cookie
	if tokenStr == "" {
		if cookie, err := c.Cookie("access_token"); err == nil {
			tokenStr = cookie
		}
	}

	if tokenStr == "" {
		return "", nil
	}

	claims, err := pkgjwt.ParseToken(tokenStr, cfg.JWTSecretKey)
	if err != nil {
		return "", err
	}

	if claims.Type != "access" {
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
