package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"leave-management/internal/database"
	"leave-management/internal/models"
)

func GetLeaveRequests(c *gin.Context) {
	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	query := `
		SELECT lr.id, lr.user_id, u.name as user_name, u.email as user_email, u.department,
		       lr.leave_type, lr.start_date, lr.end_date, lr.total_days, lr.reason,
		       lr.status, lr.reviewer_id, COALESCE(r.name,'') as reviewer_name,
		       COALESCE(lr.review_comment,'') as review_comment, lr.reviewed_at,
		       lr.created_at, lr.updated_at
		FROM leave_requests lr
		JOIN users u ON u.id = lr.user_id
		LEFT JOIN users r ON r.id = lr.reviewer_id
	`

	var args []interface{}
	where := " WHERE 1=1"

	if role == "employee" {
		where += " AND lr.user_id = $1"
		args = append(args, userID)
	} else if role == "manager" {
		where += " AND (lr.user_id = $1 OR u.manager_id = $1)"
		args = append(args, userID)
	}

	if status := c.Query("status"); status != "" {
		args = append(args, status)
		where += " AND lr.status = $" + strconv.Itoa(len(args))
	}

	if empID := c.Query("user_id"); empID != "" && role != "employee" {
		args = append(args, empID)
		where += " AND lr.user_id = $" + strconv.Itoa(len(args))
	}

	query += where + " ORDER BY lr.created_at DESC"

	var requests []models.LeaveRequest
	err := database.DB.Select(&requests, query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, requests)
}

func GetLeaveRequest(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	var req models.LeaveRequest
	err := database.DB.Get(&req, `
		SELECT lr.id, lr.user_id, u.name as user_name, u.email as user_email, u.department,
		       lr.leave_type, lr.start_date, lr.end_date, lr.total_days, lr.reason,
		       lr.status, lr.reviewer_id, COALESCE(r.name,'') as reviewer_name,
		       COALESCE(lr.review_comment,'') as review_comment, lr.reviewed_at,
		       lr.created_at, lr.updated_at
		FROM leave_requests lr
		JOIN users u ON u.id = lr.user_id
		LEFT JOIN users r ON r.id = lr.reviewer_id
		WHERE lr.id = $1`, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Leave request not found"})
		return
	}

	if role == "employee" && req.UserID != userID.(int) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	c.JSON(http.StatusOK, req)
}

func CreateLeaveRequest(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var body models.CreateLeaveRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", body.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format (YYYY-MM-DD)"})
		return
	}
	endDate, err := time.Parse("2006-01-02", body.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format (YYYY-MM-DD)"})
		return
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be after start_date"})
		return
	}

	totalDays := workingDays(startDate, endDate)
	if totalDays <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Leave must include at least one working day"})
		return
	}

	// Auto-initialize balances for this user+year if they don't exist yet
	// This ensures admin and manager can also apply for leave
	year := startDate.Year()
	database.InitBalancesForUser(userID.(int), year)

	// Check balance
	var balance models.LeaveBalance
	err = database.DB.Get(&balance,
		"SELECT * FROM leave_balances WHERE user_id=$1 AND year=$2 AND leave_type=$3",
		userID, year, string(body.LeaveType))
	if err != nil || balance.Remaining < totalDays {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient leave balance"})
		return
	}

	// Check for overlapping requests
	var overlap int
	database.DB.Get(&overlap,
		`SELECT COUNT(*) FROM leave_requests 
		 WHERE user_id=$1 AND status != 'rejected' 
		 AND NOT (end_date < $2 OR start_date > $3)`,
		userID, startDate, endDate)
	if overlap > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "You have an overlapping leave request"})
		return
	}

	var reqID int
	err = database.DB.QueryRow(
		`INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, total_days, reason, status, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,'pending',NOW()) RETURNING id`,
		userID, body.LeaveType, startDate, endDate, totalDays, body.Reason,
	).Scan(&reqID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update pending days in balance
	database.DB.Exec(
		"UPDATE leave_balances SET pending_days = pending_days + $1 WHERE user_id=$2 AND year=$3 AND leave_type=$4",
		totalDays, userID, year, string(body.LeaveType),
	)

	var created models.LeaveRequest
	database.DB.Get(&created, `
		SELECT lr.id, lr.user_id, u.name as user_name, u.email as user_email, u.department,
		       lr.leave_type, lr.start_date, lr.end_date, lr.total_days, lr.reason,
		       lr.status, lr.reviewer_id, COALESCE(r.name,'') as reviewer_name,
		       COALESCE(lr.review_comment,'') as review_comment, lr.reviewed_at,
		       lr.created_at, lr.updated_at
		FROM leave_requests lr
		JOIN users u ON u.id = lr.user_id
		LEFT JOIN users r ON r.id = lr.reviewer_id
		WHERE lr.id = $1`, reqID)

	c.JSON(http.StatusCreated, created)
}

func ReviewLeaveRequest(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	reviewerID, _ := c.Get("user_id")

	var body models.ReviewLeaveRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Status != models.LeaveStatusApproved && body.Status != models.LeaveStatusRejected {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be 'approved' or 'rejected'"})
		return
	}

	var req models.LeaveRequest
	err := database.DB.Get(&req, "SELECT * FROM leave_requests WHERE id=$1 AND status='pending'", id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pending leave request not found"})
		return
	}

	now := time.Now()
	_, err = database.DB.Exec(
		`UPDATE leave_requests SET status=$1, reviewer_id=$2, review_comment=$3, reviewed_at=$4, updated_at=$4
		 WHERE id=$5`,
		body.Status, reviewerID, body.Comment, now, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	year := req.StartDate.Year()
	leaveType := string(req.LeaveType)

	if body.Status == models.LeaveStatusApproved {
		database.DB.Exec(
			`UPDATE leave_balances 
			 SET pending_days = GREATEST(0, pending_days - $1), used_days = used_days + $1
			 WHERE user_id=$2 AND year=$3 AND leave_type=$4`,
			req.TotalDays, req.UserID, year, leaveType,
		)
	} else {
		database.DB.Exec(
			"UPDATE leave_balances SET pending_days = GREATEST(0, pending_days - $1) WHERE user_id=$2 AND year=$3 AND leave_type=$4",
			req.TotalDays, req.UserID, year, leaveType,
		)
	}

	var updated models.LeaveRequest
	database.DB.Get(&updated, `
		SELECT lr.id, lr.user_id, u.name as user_name, u.email as user_email, u.department,
		       lr.leave_type, lr.start_date, lr.end_date, lr.total_days, lr.reason,
		       lr.status, lr.reviewer_id, COALESCE(r.name,'') as reviewer_name,
		       COALESCE(lr.review_comment,'') as review_comment, lr.reviewed_at,
		       lr.created_at, lr.updated_at
		FROM leave_requests lr
		JOIN users u ON u.id = lr.user_id
		LEFT JOIN users r ON r.id = lr.reviewer_id
		WHERE lr.id = $1`, id)

	c.JSON(http.StatusOK, updated)
}

func CancelLeaveRequest(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("user_id")

	var req models.LeaveRequest
	err := database.DB.Get(&req, "SELECT * FROM leave_requests WHERE id=$1 AND user_id=$2 AND status='pending'", id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pending leave request not found"})
		return
	}

	database.DB.Exec("UPDATE leave_requests SET status='rejected', review_comment='Cancelled by employee', updated_at=NOW() WHERE id=$1", id)
	database.DB.Exec(
		"UPDATE leave_balances SET pending_days = GREATEST(0, pending_days - $1) WHERE user_id=$2 AND year=$3 AND leave_type=$4",
		req.TotalDays, req.UserID, req.StartDate.Year(), string(req.LeaveType),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Leave request cancelled"})
}

func GetDashboard(c *gin.Context) {
	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	var stats models.DashboardStats

	switch role {
	case "admin":
		database.DB.Get(&stats.TotalEmployees, "SELECT COUNT(*) FROM users WHERE is_active=true AND role='employee'")
		database.DB.Get(&stats.OnLeaveToday,
			"SELECT COUNT(DISTINCT user_id) FROM leave_requests WHERE status='approved' AND $1 BETWEEN start_date AND end_date",
			time.Now())
		database.DB.Get(&stats.PendingRequests, "SELECT COUNT(*) FROM leave_requests WHERE status='pending'")
		database.DB.Get(&stats.ApprovedThisMonth,
			"SELECT COUNT(*) FROM leave_requests WHERE status='approved' AND DATE_TRUNC('month',reviewed_at)=DATE_TRUNC('month',NOW())")
	case "manager":
		database.DB.Get(&stats.TotalEmployees, "SELECT COUNT(*) FROM users WHERE manager_id=$1 AND is_active=true", userID)
		database.DB.Get(&stats.OnLeaveToday,
			"SELECT COUNT(DISTINCT lr.user_id) FROM leave_requests lr JOIN users u ON u.id=lr.user_id WHERE u.manager_id=$1 AND lr.status='approved' AND $2 BETWEEN lr.start_date AND lr.end_date",
			userID, time.Now())
		database.DB.Get(&stats.PendingRequests,
			"SELECT COUNT(*) FROM leave_requests lr JOIN users u ON u.id=lr.user_id WHERE u.manager_id=$1 AND lr.status='pending'", userID)
		database.DB.Get(&stats.ApprovedThisMonth,
			"SELECT COUNT(*) FROM leave_requests lr JOIN users u ON u.id=lr.user_id WHERE u.manager_id=$1 AND lr.status='approved' AND DATE_TRUNC('month',lr.reviewed_at)=DATE_TRUNC('month',NOW())", userID)
	default:
		database.DB.Get(&stats.PendingRequests, "SELECT COUNT(*) FROM leave_requests WHERE user_id=$1 AND status='pending'", userID)
		database.DB.Get(&stats.ApprovedThisMonth, "SELECT COUNT(*) FROM leave_requests WHERE user_id=$1 AND status='approved'", userID)
	}

	// Department breakdown
	var deptLeave []map[string]interface{}
	rows, _ := database.DB.Queryx(`
		SELECT u.department, COUNT(DISTINCT lr.user_id) as count
		FROM leave_requests lr
		JOIN users u ON u.id = lr.user_id
		WHERE lr.status='approved' AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
		GROUP BY u.department`)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			row := make(map[string]interface{})
			rows.MapScan(row)
			deptLeave = append(deptLeave, row)
		}
	}

	// Monthly trend (last 6 months)
	var monthlyTrend []map[string]interface{}
	trendRows, _ := database.DB.Queryx(`
		SELECT TO_CHAR(start_date,'Mon') as month, COUNT(*) as count
		FROM leave_requests
		WHERE status IN ('approved','pending') AND start_date >= NOW() - INTERVAL '6 months'
		GROUP BY DATE_TRUNC('month',start_date), TO_CHAR(start_date,'Mon')
		ORDER BY DATE_TRUNC('month',start_date)`)
	if trendRows != nil {
		defer trendRows.Close()
		for trendRows.Next() {
			row := make(map[string]interface{})
			trendRows.MapScan(row)
			monthlyTrend = append(monthlyTrend, row)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":        stats,
		"dept_leave":   deptLeave,
		"monthly_trend": monthlyTrend,
	})
}

func workingDays(start, end time.Time) float64 {
	days := 0.0
	current := start
	for !current.After(end) {
		wd := current.Weekday()
		if wd != time.Saturday && wd != time.Sunday {
			days++
		}
		current = current.AddDate(0, 0, 1)
	}
	return days
}