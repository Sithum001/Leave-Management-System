package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var DB *sqlx.DB

func Connect() {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", "123456789"),
		getEnv("DB_NAME", "leave_management"),
	)

	var err error
	DB, err = sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	log.Println("Database connected successfully")
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func Migrate() {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		employee_id VARCHAR(20) UNIQUE NOT NULL,
		name VARCHAR(100) NOT NULL,
		email VARCHAR(100) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		role VARCHAR(20) NOT NULL DEFAULT 'employee',
		department VARCHAR(100) NOT NULL,
		position VARCHAR(100) NOT NULL,
		manager_id INTEGER REFERENCES users(id),
		avatar_url VARCHAR(500) DEFAULT '',
		join_date DATE NOT NULL DEFAULT CURRENT_DATE,
		is_active BOOLEAN NOT NULL DEFAULT true,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS leave_balances (
		id SERIAL PRIMARY KEY,
		user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		year INTEGER NOT NULL,
		leave_type VARCHAR(30) NOT NULL,
		total_days NUMERIC(5,1) NOT NULL DEFAULT 0,
		used_days NUMERIC(5,1) NOT NULL DEFAULT 0,
		pending_days NUMERIC(5,1) NOT NULL DEFAULT 0,
		remaining_days NUMERIC(5,1) GENERATED ALWAYS AS (total_days - used_days - pending_days) STORED,
		UNIQUE(user_id, year, leave_type)
	);

	CREATE TABLE IF NOT EXISTS leave_requests (
		id SERIAL PRIMARY KEY,
		user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		leave_type VARCHAR(30) NOT NULL,
		start_date DATE NOT NULL,
		end_date DATE NOT NULL,
		total_days NUMERIC(5,1) NOT NULL,
		reason TEXT NOT NULL,
		status VARCHAR(20) NOT NULL DEFAULT 'pending',
		reviewer_id INTEGER REFERENCES users(id),
		review_comment TEXT DEFAULT '',
		reviewed_at TIMESTAMPTZ,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
	CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
	CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
	`

	_, err := DB.Exec(schema)
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Migrations applied successfully")
}

// InitBalancesForUser creates leave balance rows for a user for the given year.
// Called both from Seed() and from CreateUser handler.
func InitBalancesForUser(userID int, year int) {
	leaveTypes := []struct {
		lt   string
		days float64
	}{
		{"annual", 15},
		{"sick", 10},
		{"personal", 3},
		{"maternity", 90},
		{"paternity", 7},
		{"unpaid", 0},
	}
	for _, lt := range leaveTypes {
		DB.Exec(
			`INSERT INTO leave_balances (user_id, year, leave_type, total_days, used_days, pending_days)
			 VALUES ($1, $2, $3, $4, 0, 0) ON CONFLICT DO NOTHING`,
			userID, year, lt.lt, lt.days,
		)
	}
}

func Seed() {
	// Check if already seeded
	var count int
	DB.Get(&count, "SELECT COUNT(*) FROM users")
	if count > 0 {
		return
	}

	// Generate a real bcrypt hash for "admin123" at runtime
	hashBytes, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to generate password hash: %v", err)
	}
	hash := string(hashBytes)

	seed := fmt.Sprintf(`
	INSERT INTO users (employee_id, name, email, password_hash, role, department, position, join_date) VALUES
	('EMP001', 'Piumini Tishani',   'admin@abc.com',   '%s', 'admin',    'Administration', 'System Administrator', '2020-01-15'),
	('EMP002', 'Malidu Kavishka',   'manager@abc.com', '%s', 'manager',  'Engineering',    'Engineering Manager',  '2019-03-10'),
	('EMP003', 'Dilshan Hansaka',   'dilshan@abc.com', '%s', 'employee', 'Engineering',    'Senior Developer',     '2021-06-01'),
	('EMP004', 'Shamith De Silva',  'shamith@abc.com', '%s', 'employee', 'Engineering',    'Frontend Developer',   '2022-02-14'),
	('EMP005', 'Malisha Sandalika', 'malisha@abc.com', '%s', 'employee', 'Marketing',      'Marketing Specialist', '2021-09-20');

	UPDATE users SET manager_id = 2 WHERE employee_id IN ('EMP003', 'EMP004');
	`, hash, hash, hash, hash, hash)

	_, err = DB.Exec(seed)
	if err != nil {
		log.Printf("Seed warning: %v", err)
		return
	}

	// Initialize leave balances for ALL users for both current and next year
	currentYear := time.Now().Year()
	for userID := 1; userID <= 5; userID++ {
		InitBalancesForUser(userID, currentYear)
		InitBalancesForUser(userID, currentYear-1)
	}

	// Add some sample used/pending days for employees (ids 3,4,5) for current year
	DB.Exec(`
		UPDATE leave_balances SET used_days = 5 WHERE user_id = 3 AND year = $1 AND leave_type = 'annual';
		UPDATE leave_balances SET used_days = 2 WHERE user_id = 3 AND year = $1 AND leave_type = 'sick';
		UPDATE leave_balances SET used_days = 1 WHERE user_id = 3 AND year = $1 AND leave_type = 'personal';
		UPDATE leave_balances SET used_days = 3, pending_days = 2 WHERE user_id = 4 AND year = $1 AND leave_type = 'annual';
		UPDATE leave_balances SET used_days = 8 WHERE user_id = 5 AND year = $1 AND leave_type = 'annual';
		UPDATE leave_balances SET used_days = 1 WHERE user_id = 5 AND year = $1 AND leave_type = 'sick';
		UPDATE leave_balances SET used_days = 2 WHERE user_id = 5 AND year = $1 AND leave_type = 'personal';
	`, currentYear)

	// Sample leave requests
	DB.Exec(`
		INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, total_days, reason, status, reviewer_id, review_comment, reviewed_at, updated_at) VALUES
		(3, 'annual',   '2025-07-14', '2025-07-18', 5, 'Family vacation to Bali',              'approved', 2, 'Approved. Enjoy your vacation!',         NOW() - INTERVAL '20 days', NOW()),
		(3, 'sick',     '2025-08-05', '2025-08-06', 2, 'Flu and fever',                        'approved', 2, 'Get well soon.',                         NOW() - INTERVAL '10 days', NOW()),
		(4, 'annual',   '2025-09-01', '2025-09-03', 3, 'Personal errands',                     'pending',  NULL, '', NULL, NOW()),
		(4, 'annual',   '2025-10-20', '2025-10-21', 2, 'Attending a wedding',                  'pending',  NULL, '', NULL, NOW()),
		(5, 'annual',   '2025-06-02', '2025-06-09', 8, 'Extended holiday trip',                'approved', 1, 'Approved.',                              NOW() - INTERVAL '30 days', NOW()),
		(5, 'sick',     '2025-08-12', '2025-08-12', 1, 'Doctor appointment',                   'approved', 1, 'Approved.',                              NOW() - INTERVAL '5 days',  NOW()),
		(5, 'personal', '2025-09-15', '2025-09-16', 2, 'Moving house',                         'rejected', 1, 'Too many employees on leave that week.', NOW() - INTERVAL '2 days',  NOW());
	`)

	log.Println("Database seeded successfully")
}