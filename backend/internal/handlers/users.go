package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"leave-management/internal/database"
	"leave-management/internal/models"
)

func GetUsers(c *gin.Context) {
	var users []models.User
	err := database.DB.Select(&users,
		`SELECT id, employee_id, name, email, password_hash, role, department, position, manager_id, avatar_url, join_date, is_active, created_at 
		 FROM users WHERE is_active = true ORDER BY name`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

func GetUser(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var user models.User
	err := database.DB.Get(&user,
		"SELECT id, employee_id, name, email, password_hash, role, department, position, manager_id, avatar_url, join_date, is_active, created_at FROM users WHERE id = $1",
		id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Password hashing failed"})
		return
	}

	joinDate := time.Now()
	if req.JoinDate != "" {
		parsedJoinDate, err := parseJoinDate(req.JoinDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		joinDate = parsedJoinDate
	}

	var userID int
	err = database.DB.QueryRow(
		`INSERT INTO users (employee_id, name, email, password_hash, role, department, position, manager_id, join_date)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
		req.EmployeeID, req.Name, req.Email, string(hash), req.Role,
		req.Department, req.Position, req.ManagerID, joinDate,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Employee ID or email already exists"})
		return
	}

	// Initialize leave balances for current year
	year := time.Now().Year()
	leaveTypes := []struct {
		lt   string
		days float64
	}{
		{"annual", 15}, {"sick", 10}, {"personal", 3},
		{"maternity", 90}, {"paternity", 7}, {"unpaid", 0},
	}
	for _, lt := range leaveTypes {
		database.DB.Exec(
			`INSERT INTO leave_balances (user_id, year, leave_type, total_days, used_days, pending_days)
			 VALUES ($1,$2,$3,$4,0,0) ON CONFLICT DO NOTHING`,
			userID, year, lt.lt, lt.days,
		)
	}

	var user models.User
	database.DB.Get(&user, "SELECT id, employee_id, name, email, password_hash, role, department, position, manager_id, avatar_url, join_date, is_active, created_at FROM users WHERE id = $1", userID)
	c.JSON(http.StatusCreated, user)
}

func parseJoinDate(raw string) (time.Time, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return time.Time{}, nil
	}

	if t, err := time.Parse("2006-01-02", value); err == nil {
		return t, nil
	}

	if t, err := time.Parse(time.RFC3339, value); err == nil {
		return t, nil
	}

	return time.Time{}, fmt.Errorf("join_date must be in YYYY-MM-DD or RFC3339 format")
}

func UpdateUser(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	requesterID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	// Only admin or self can update
	if role != "admin" && requesterID.(int) != id {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Safe fields to update
	if name, ok := body["name"].(string); ok {
		database.DB.Exec("UPDATE users SET name=$1 WHERE id=$2", name, id)
	}
	if dept, ok := body["department"].(string); ok {
		database.DB.Exec("UPDATE users SET department=$1 WHERE id=$2", dept, id)
	}
	if pos, ok := body["position"].(string); ok {
		database.DB.Exec("UPDATE users SET position=$1 WHERE id=$2", pos, id)
	}
	if userRole, ok := body["role"].(string); ok && role == "admin" {
		database.DB.Exec("UPDATE users SET role=$1 WHERE id=$2", userRole, id)
	}
	if isActive, ok := body["is_active"].(bool); ok && role == "admin" {
		database.DB.Exec("UPDATE users SET is_active=$1 WHERE id=$2", isActive, id)
	}

	var user models.User
	database.DB.Get(&user, "SELECT id, employee_id, name, email, password_hash, role, department, position, manager_id, avatar_url, join_date, is_active, created_at FROM users WHERE id = $1", id)
	c.JSON(http.StatusOK, user)
}

func DeleteUser(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	database.DB.Exec("UPDATE users SET is_active=false WHERE id=$1", id)
	c.JSON(http.StatusOK, gin.H{"message": "User deactivated"})
}

func GetLeaveBalances(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	requesterID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	if role != "admin" && role != "manager" && requesterID.(int) != id {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	year := time.Now().Year()
	if y := c.Query("year"); y != "" {
		year, _ = strconv.Atoi(y)
	}

	var balances []models.LeaveBalance
	err := database.DB.Select(&balances,
		"SELECT * FROM leave_balances WHERE user_id=$1 AND year=$2 ORDER BY leave_type", id, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, balances)
}
