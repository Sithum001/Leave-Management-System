package models

import "time"

type Role string

const (
	RoleEmployee Role = "employee"
	RoleManager  Role = "manager"
	RoleAdmin    Role = "admin"
)

type LeaveStatus string

const (
	LeaveStatusPending  LeaveStatus = "pending"
	LeaveStatusApproved LeaveStatus = "approved"
	LeaveStatusRejected LeaveStatus = "rejected"
)

type LeaveType string

const (
	LeaveTypeAnnual    LeaveType = "annual"
	LeaveTypeSick      LeaveType = "sick"
	LeaveTypePersonal  LeaveType = "personal"
	LeaveTypeMaternity LeaveType = "maternity"
	LeaveTypePaternity LeaveType = "paternity"
	LeaveTypeUnpaid    LeaveType = "unpaid"
)

type User struct {
	ID         int       `db:"id" json:"id"`
	EmployeeID string    `db:"employee_id" json:"employee_id"`
	Name       string    `db:"name" json:"name"`
	Email      string    `db:"email" json:"email"`
	Password   string    `db:"password_hash" json:"-"`
	Role       Role      `db:"role" json:"role"`
	Department string    `db:"department" json:"department"`
	Position   string    `db:"position" json:"position"`
	ManagerID  *int      `db:"manager_id" json:"manager_id,omitempty"`
	AvatarURL  string    `db:"avatar_url" json:"avatar_url"`
	JoinDate   time.Time `db:"join_date" json:"join_date"`
	IsActive   bool      `db:"is_active" json:"is_active"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}

type LeaveBalance struct {
	ID        int       `db:"id" json:"id"`
	UserID    int       `db:"user_id" json:"user_id"`
	Year      int       `db:"year" json:"year"`
	LeaveType LeaveType `db:"leave_type" json:"leave_type"`
	Total     float64   `db:"total_days" json:"total_days"`
	Used      float64   `db:"used_days" json:"used_days"`
	Pending   float64   `db:"pending_days" json:"pending_days"`
	Remaining float64   `db:"remaining_days" json:"remaining_days"`
}

type LeaveRequest struct {
	ID            int         `db:"id" json:"id"`
	UserID        int         `db:"user_id" json:"user_id"`
	UserName      string      `db:"user_name" json:"user_name"`
	UserEmail     string      `db:"user_email" json:"user_email"`
	Department    string      `db:"department" json:"department"`
	LeaveType     LeaveType   `db:"leave_type" json:"leave_type"`
	StartDate     time.Time   `db:"start_date" json:"start_date"`
	EndDate       time.Time   `db:"end_date" json:"end_date"`
	TotalDays     float64     `db:"total_days" json:"total_days"`
	Reason        string      `db:"reason" json:"reason"`
	Status        LeaveStatus `db:"status" json:"status"`
	ReviewerID    *int        `db:"reviewer_id" json:"reviewer_id,omitempty"`
	ReviewerName  string      `db:"reviewer_name" json:"reviewer_name"`
	ReviewComment string      `db:"review_comment" json:"review_comment"`
	ReviewedAt    *time.Time  `db:"reviewed_at" json:"reviewed_at,omitempty"`
	CreatedAt     time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time   `db:"updated_at" json:"updated_at"`
}

type DashboardStats struct {
	TotalEmployees    int `json:"total_employees"`
	OnLeaveToday      int `json:"on_leave_today"`
	PendingRequests   int `json:"pending_requests"`
	ApprovedThisMonth int `json:"approved_this_month"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type CreateUserRequest struct {
	EmployeeID string `json:"employee_id" binding:"required"`
	Name       string `json:"name" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=6"`
	Role       Role   `json:"role" binding:"required"`
	Department string `json:"department" binding:"required"`
	Position   string `json:"position" binding:"required"`
	ManagerID  *int   `json:"manager_id"`
	JoinDate   string `json:"join_date"`
}

type CreateLeaveRequest struct {
	LeaveType LeaveType `json:"leave_type" binding:"required"`
	StartDate string    `json:"start_date" binding:"required"`
	EndDate   string    `json:"end_date" binding:"required"`
	Reason    string    `json:"reason" binding:"required"`
}

type ReviewLeaveRequest struct {
	Status  LeaveStatus `json:"status" binding:"required"`
	Comment string      `json:"comment"`
}

type Claims struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
	Role   Role   `json:"role"`
}
