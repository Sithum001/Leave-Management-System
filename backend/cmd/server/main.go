package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"leave-management/internal/database"
	"leave-management/internal/handlers"
	"leave-management/internal/middleware"
	"leave-management/internal/models"
)

func main() {
	database.Connect()
	database.Migrate()
	database.Seed()

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Public routes
	api := r.Group("/api")
	api.POST("/auth/login", handlers.Login)

	// Protected routes
	auth := api.Group("/")
	auth.Use(middleware.AuthMiddleware())

	auth.GET("/auth/me", handlers.GetMe)

	// Dashboard
	auth.GET("/dashboard", handlers.GetDashboard)

	// Users
	auth.GET("/users", middleware.RequireRole(models.RoleAdmin, models.RoleManager), handlers.GetUsers)
	auth.POST("/users", middleware.RequireRole(models.RoleAdmin), handlers.CreateUser)
	auth.GET("/users/:id", handlers.GetUser)
	auth.PUT("/users/:id", handlers.UpdateUser)
	auth.DELETE("/users/:id", middleware.RequireRole(models.RoleAdmin), handlers.DeleteUser)
	auth.GET("/users/:id/balances", handlers.GetLeaveBalances)

	// Leave requests
	auth.GET("/leaves", handlers.GetLeaveRequests)
	auth.POST("/leaves", handlers.CreateLeaveRequest)
	auth.GET("/leaves/:id", handlers.GetLeaveRequest)
	auth.POST("/leaves/:id/review", middleware.RequireRole(models.RoleAdmin, models.RoleManager), handlers.ReviewLeaveRequest)
	auth.DELETE("/leaves/:id", handlers.CancelLeaveRequest)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on :%s", port)
	r.Run(":" + port)
}