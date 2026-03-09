package router

import (
	"github.com/gin-gonic/gin"
	"github.com/momshell/backend/internal/config"
	"github.com/momshell/backend/internal/handler"
	"github.com/momshell/backend/internal/middleware"
)

func Setup(
	r *gin.Engine,
	cfg *config.Config,
	authHandler *handler.AuthHandler,
	questionHandler *handler.QuestionHandler,
	answerHandler *handler.AnswerHandler,
	commentHandler *handler.CommentHandler,
	interactionHandler *handler.InteractionHandler,
	tagHandler *handler.TagHandler,
	chatHandler *handler.ChatHandler,
	echoHandler *handler.EchoHandler,
	userHandler *handler.UserHandler,
	adminHandler *handler.AdminHandler,
	photoHandler *handler.PhotoHandler,
	whisperHandler *handler.WhisperHandler,
	taskHandler *handler.TaskHandler,
) {
	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Serve uploaded files
	r.Static("/uploads", "./uploads")

	// Admin panel (HTML page, no auth required for serving the page)
	r.GET("/admin", adminHandler.ServeAdminPage)

	api := r.Group("/api/v1")

	// ==================== Auth ====================
	auth := api.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
		auth.POST("/forgot-password", authHandler.ForgotPassword)
		auth.POST("/reset-password", authHandler.ResetPassword)

		authRequired := auth.Group("", middleware.AuthRequired(cfg))
		{
			authRequired.POST("/change-password", authHandler.ChangePassword)
			authRequired.GET("/me", authHandler.GetMe)
			authRequired.PATCH("/me/role", authHandler.UpdateRole)
		}
	}

	// ==================== Community ====================
	community := api.Group("/community")
	{
		// Questions (optional auth for read, required for write)
		questions := community.Group("/questions")
		{
			questions.GET("", middleware.AuthOptional(cfg), questionHandler.List)
			questions.GET("/hot", middleware.AuthOptional(cfg), questionHandler.ListHot)
			questions.GET("/channel/:channel", middleware.AuthOptional(cfg), questionHandler.ListByChannel)
			questions.GET("/:id", middleware.AuthOptional(cfg), questionHandler.Get)

			questionsAuth := questions.Group("", middleware.AuthRequired(cfg))
			{
				questionsAuth.POST("", questionHandler.Create)
				questionsAuth.PUT("/:id", questionHandler.Update)
				questionsAuth.DELETE("/:id", questionHandler.Delete)
			}

			// Answers under questions
			questions.GET("/:id/answers", middleware.AuthOptional(cfg), answerHandler.List)
			questions.POST("/:id/answers", middleware.AuthRequired(cfg), answerHandler.Create)
		}

		// Answers (update/delete by answer ID)
		answers := community.Group("/answers")
		{
			answers.PUT("/:id", middleware.AuthRequired(cfg), answerHandler.Update)
			answers.DELETE("/:id", middleware.AuthRequired(cfg), answerHandler.Delete)

			// Comments under answers
			answers.GET("/:id/comments", middleware.AuthOptional(cfg), commentHandler.List)
			answers.POST("/:id/comments", middleware.AuthRequired(cfg), commentHandler.Create)
		}

		// Comments (delete by comment ID)
		comments := community.Group("/comments")
		{
			comments.DELETE("/:id", middleware.AuthRequired(cfg), commentHandler.Delete)
		}

		// Likes
		likes := community.Group("/likes", middleware.AuthRequired(cfg))
		{
			likes.POST("", interactionHandler.CreateLike)
			likes.DELETE("", interactionHandler.DeleteLike)
		}

		// Collections
		collections := community.Group("/collections", middleware.AuthRequired(cfg))
		{
			collections.POST("", interactionHandler.CreateCollection)
			collections.DELETE("/:id", interactionHandler.DeleteCollection)
			collections.GET("/my", interactionHandler.GetMyCollections)
		}

		// Tags
		tags := community.Group("/tags")
		{
			tags.GET("", tagHandler.List)
			tags.GET("/hot", tagHandler.ListHot)
			tags.POST("", middleware.AdminRequired(cfg), tagHandler.Create)
		}

		// User profile (community context)
		users := community.Group("/users", middleware.AuthRequired(cfg))
		{
			users.GET("/me", userHandler.GetMe)
			users.PUT("/me", userHandler.UpdateMe)
			users.POST("/me/avatar", userHandler.UploadAvatar)
			users.POST("/me/shell-code", userHandler.GenerateShellCode)
			users.POST("/me/bind", userHandler.BindPartner)
			users.DELETE("/me/bind", userHandler.UnbindPartner)
			users.GET("/me/questions", userHandler.GetMyQuestions)
			users.GET("/me/answers", userHandler.GetMyAnswers)
		}
	}

	// ==================== Companion (AI Chat) ====================
	companion := api.Group("/companion")
	{
		companion.POST("/chat", middleware.AuthOptional(cfg), chatHandler.Chat)
		companion.GET("/profile", middleware.AuthOptional(cfg), chatHandler.GetProfile)
	}

	echo := api.Group("/echo", middleware.AuthRequired(cfg))
	{
		echo.GET("/identity-tags", echoHandler.GetIdentityTags)
		echo.POST("/identity-tags", echoHandler.CreateIdentityTag)
		echo.DELETE("/identity-tags/:id", echoHandler.DeleteIdentityTag)

		echo.GET("/memoirs", echoHandler.GetMemoirs)
		echo.POST("/memoirs/generate", echoHandler.GenerateMemoir)
		echo.POST("/memoirs/:id/rate", echoHandler.RateMemoir)
	}

	// ==================== Photos ====================
	photos := api.Group("/photos", middleware.AuthRequired(cfg))
	{
		photos.GET("", photoHandler.List)
		photos.POST("/upload", photoHandler.Upload)
		photos.POST("/generate", photoHandler.Generate)
		photos.PUT("/wall", photoHandler.BatchUpdateWall)
		photos.PUT("/:id", photoHandler.Update)
		photos.DELETE("/:id", photoHandler.Delete)
		photos.PUT("/:id/wall", photoHandler.ToggleWall)
	}

	// ==================== Whisper (Heart Words) ====================
	whisper := api.Group("/whisper", middleware.AuthRequired(cfg))
	{
		whisper.POST("", whisperHandler.Create)
		whisper.GET("", whisperHandler.List)
		whisper.GET("/tips", whisperHandler.Tips)
	}

	// ==================== Tasks ====================
	tasks := api.Group("/tasks", middleware.AuthRequired(cfg))
	{
		tasks.GET("/daily", taskHandler.DailyTasks)
		tasks.POST("/:id/complete", taskHandler.Complete)
		tasks.GET("/partner", taskHandler.PartnerTasks)
		tasks.POST("/:id/score", taskHandler.Score)
		tasks.POST("/:id/reject", taskHandler.Reject)
		tasks.GET("/stats", taskHandler.Stats)
	}

	// ==================== Admin ====================
	adminAPI := api.Group("/admin", middleware.AdminRequired(cfg))
	{
		adminAPI.GET("/stats", adminHandler.GetStats)
		adminAPI.GET("/users", adminHandler.ListUsers)
		adminAPI.GET("/users/:id", adminHandler.GetUser)
		adminAPI.POST("/users", adminHandler.CreateUser)
		adminAPI.PATCH("/users/:id", adminHandler.UpdateUser)
		adminAPI.DELETE("/users/:id", adminHandler.DeleteUser)
		adminAPI.GET("/config", adminHandler.GetConfig)
		adminAPI.PATCH("/config", adminHandler.UpdateConfig)
	}
}
