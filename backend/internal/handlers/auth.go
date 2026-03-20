package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"leave-management/internal/database"
	"leave-management/internal/models"
)

func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	err := database.DB.Get(&user,
		"SELECT id, employee_id, name, email, password_hash, role, department, position, manager_id, avatar_url, join_date, is_active, created_at FROM users WHERE email = $1 AND is_active = true",
		req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token, err := generateToken(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token generation failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

func GetMe(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var user models.User
	err := database.DB.Get(&user,
		"SELECT id, employee_id, name, email, password_hash, role, department, position, manager_id, avatar_url, join_date, is_active, created_at FROM users WHERE id = $1",
		userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func generateToken(userID int, email string, role models.Role) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "leave-management-secret-key-2025"
	}

	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"role":    string(role),
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}