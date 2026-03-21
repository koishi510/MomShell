package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

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
	OpenAIAPIKey   string
	OpenAIBaseURL  string
	OpenAIModel    string
	ImageModel     string
	EmbeddingModel string

	// Firecrawl (web search)
	FirecrawlAPIKey string

	// Server
	Port string

	// CORS
	CORSOrigins string

	// Logging
	DBLogLevel string

	// Admin
	AdminUsername string
	AdminEmail    string
	AdminPassword string

	// RAG
	RAGSimilarityThreshold float64
	RAGTopK                int
	RAGRerankEnabled       bool
}

func Load() *Config {
	// Load .env file from project root and backend dir (project root takes precedence)
	_ = godotenv.Overload()
	_ = godotenv.Overload("../.env")

	cfg := &Config{
		DatabaseURL:               getEnv("DATABASE_URL", ""),
		JWTSecretKey:              getEnv("JWT_SECRET_KEY", "change-me-in-production"),
		JWTAlgorithm:              "HS256",
		JWTAccessTokenExpireMin:   getEnvInt("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30),
		JWTRefreshTokenExpireDays: getEnvInt("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7),
		OpenAIAPIKey:              getEnv("OPENAI_API_KEY", ""),
		OpenAIBaseURL:             getEnv("OPENAI_BASE_URL", "https://api-inference.modelscope.cn/v1"),
		OpenAIModel:               getEnv("OPENAI_MODEL", "Qwen/Qwen3-235B-A22B"),
		FirecrawlAPIKey:           getEnv("FIRECRAWL_API_KEY", ""),
		ImageModel:                getEnv("IMAGE_MODEL", "Tongyi-MAI/Z-Image-Turbo"),
		EmbeddingModel:            getEnv("EMBEDDING_MODEL", "iic/nlp_gte_sentence-embedding_chinese-base"),
		Port:                      getEnv("PORT", "8000"),
		CORSOrigins:               getEnv("CORS_ORIGINS", "*"),
		DBLogLevel:                getEnv("DB_LOG_LEVEL", "warn"),
		AdminUsername:             getEnv("ADMIN_USERNAME", ""),
		AdminEmail:                getEnv("ADMIN_EMAIL", ""),
		AdminPassword:             getEnv("ADMIN_PASSWORD", ""),
		RAGSimilarityThreshold:    getEnvFloat64("RAG_SIMILARITY_THRESHOLD", 0.8),
		RAGTopK:                   getEnvInt("RAG_TOP_K", 5),
		RAGRerankEnabled:          getEnvBool("RAG_RERANK_ENABLED", true),
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

func getEnvFloat64(key string, fallback float64) float64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return f
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	switch strings.ToLower(v) {
	case "true", "1", "yes":
		return true
	case "false", "0", "no":
		return false
	default:
		return fallback
	}
}
