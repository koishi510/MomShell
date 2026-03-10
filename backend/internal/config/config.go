package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database
	DatabaseURL string

	// JWT
	JWTSecretKey              string
	JWTAlgorithm              string
	JWTAccessTokenExpireMin   int
	JWTRefreshTokenExpireDays int

	// OpenAI compatible API
	OpenAIAPIKey  string
	OpenAIBaseURL string
	OpenAIModel   string
	ImageModel    string

	// Firecrawl (web search)
	FirecrawlAPIKey string

	// Server
	Port string

	// CORS
	CORSOrigins string

	// Proxy
	TrustProxy bool

	// Logging
	DBLogLevel string

	// Admin
	AdminUsername string
	AdminEmail    string
	AdminPassword string
}

func Load() *Config {
	// Load .env file from project root and backend dir (project root takes precedence)
	_ = godotenv.Overload()
	_ = godotenv.Overload("../.env")

	cfg := &Config{
		DatabaseURL:               getEnv("DATABASE_URL", "postgres://user:password@localhost:5432/momshell?sslmode=disable"),
		JWTSecretKey:              getEnv("JWT_SECRET_KEY", "change-me-in-production"),
		JWTAlgorithm:              "HS256",
		JWTAccessTokenExpireMin:   getEnvInt("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30),
		JWTRefreshTokenExpireDays: getEnvInt("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7),
		OpenAIAPIKey:              getEnv("OPENAI_API_KEY", ""),
		OpenAIBaseURL:             getEnv("OPENAI_BASE_URL", "https://api-inference.modelscope.cn/v1"),
		OpenAIModel:               getEnv("OPENAI_MODEL", "Qwen/Qwen3-235B-A22B"),
		FirecrawlAPIKey:           getEnv("FIRECRAWL_API_KEY", ""),
		ImageModel:                getEnv("IMAGE_MODEL", "Tongyi-MAI/Z-Image-Turbo"),
		Port:                      getEnv("PORT", "8000"),
		CORSOrigins:               getEnv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8000,http://localhost:3000"),
		TrustProxy:                getEnvBool("TRUST_PROXY", false),
		DBLogLevel:                getEnv("DB_LOG_LEVEL", "warn"),
		AdminUsername:             getEnv("ADMIN_USERNAME", ""),
		AdminEmail:                getEnv("ADMIN_EMAIL", ""),
		AdminPassword:             getEnv("ADMIN_PASSWORD", ""),
	}

	if cfg.JWTSecretKey == "change-me-in-production" {
		fmt.Println("[WARN] Using default JWT secret key. Set JWT_SECRET_KEY in production!")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return i
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}
