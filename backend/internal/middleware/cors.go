package middleware

import (
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/config"
)

func CORS(cfg *config.Config) gin.HandlerFunc {
	corsConfig := cors.Config{
		AllowMethods:  []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:  []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Access-Token"},
		ExposeHeaders: []string{"Content-Length"},
		MaxAge:        12 * time.Hour,
	}

	trimmed := strings.TrimSpace(cfg.CORSOrigins)
	if trimmed == "" || trimmed == "*" {
		// Allow all origins but disable credentials to prevent CSRF-like attacks
		corsConfig.AllowOriginFunc = func(origin string) bool { return true }
		corsConfig.AllowCredentials = false
	} else {
		origins := strings.Split(trimmed, ",")
		for i := range origins {
			origins[i] = strings.TrimSpace(origins[i])
		}
		corsConfig.AllowOrigins = origins
		corsConfig.AllowCredentials = true
	}

	return cors.New(corsConfig)
}
