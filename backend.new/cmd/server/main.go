package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/config"
	"github.com/momshell/backend/internal/database"
	"github.com/momshell/backend/internal/handler"
	"github.com/momshell/backend/internal/middleware"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"github.com/momshell/backend/internal/router"
	"github.com/momshell/backend/internal/service"
	"github.com/momshell/backend/pkg/openai"
	"github.com/momshell/backend/pkg/password"
)

func main() {
	// Load config
	cfg := config.Load()

	// Connect to database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("Connected to database")

	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Database migrations completed")

	// Create initial admin if configured
	createInitialAdmin(cfg, repository.NewUserRepo(db))

	// Initialize repositories
	userRepo := repository.NewUserRepo(db)
	questionRepo := repository.NewQuestionRepo(db)
	answerRepo := repository.NewAnswerRepo(db)
	commentRepo := repository.NewCommentRepo(db)
	interactionRepo := repository.NewInteractionRepo(db)
	tagRepo := repository.NewTagRepo(db)
	chatRepo := repository.NewChatRepo(db)

	// Initialize services
	moderationService := service.NewModerationService()
	authService := service.NewAuthService(cfg, userRepo)
	communityService := service.NewCommunityService(
		questionRepo, answerRepo, commentRepo,
		interactionRepo, tagRepo, userRepo,
		moderationService,
	)

	var chatClient *openai.Client
	if cfg.OpenAIAPIKey != "" {
		chatClient = openai.NewClient(cfg.OpenAIAPIKey, cfg.OpenAIBaseURL, cfg.OpenAIModel)
	} else {
		log.Println("[WARN] OPENAI_API_KEY not set, chat service will not work")
		chatClient = openai.NewClient("dummy", cfg.OpenAIBaseURL, cfg.OpenAIModel)
	}
	chatService := service.NewChatService(chatClient, chatRepo)

	userService := service.NewUserService(
		db, userRepo, questionRepo, answerRepo,
		interactionRepo, communityService,
	)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	questionHandler := handler.NewQuestionHandler(communityService, authService)
	answerHandler := handler.NewAnswerHandler(communityService, authService)
	commentHandler := handler.NewCommentHandler(communityService, authService)
	interactionHandler := handler.NewInteractionHandler(communityService)
	tagHandler := handler.NewTagHandler(communityService)
	chatHandler := handler.NewChatHandler(chatService)
	userHandler := handler.NewUserHandler(userService)

	// Setup Gin
	r := gin.New()
	r.Use(middleware.Recovery())
	r.Use(middleware.CORS())
	r.Use(gin.Logger())

	// Register routes
	router.Setup(
		r, cfg,
		authHandler, questionHandler, answerHandler,
		commentHandler, interactionHandler, tagHandler,
		chatHandler, userHandler,
	)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Starting server on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func createInitialAdmin(cfg *config.Config, userRepo *repository.UserRepo) {
	if cfg.AdminUsername == "" || cfg.AdminEmail == "" || cfg.AdminPassword == "" {
		return
	}

	exists, _ := userRepo.ExistsByUsernameOrEmail(cfg.AdminUsername, cfg.AdminEmail)
	if exists {
		log.Println("Admin user already exists, skipping creation")
		return
	}

	hash, err := password.Hash(cfg.AdminPassword)
	if err != nil {
		log.Printf("Failed to hash admin password: %v", err)
		return
	}

	admin := &model.User{
		Username:     cfg.AdminUsername,
		Email:        cfg.AdminEmail,
		PasswordHash: hash,
		Nickname:     "Admin",
		Role:         model.RoleAdmin,
		IsActive:     true,
	}

	if err := userRepo.Create(admin); err != nil {
		log.Printf("Failed to create admin user: %v", err)
		return
	}

	log.Printf("Admin user created: %s", cfg.AdminUsername)
}
