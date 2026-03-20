Leave Management System
A full-stack Leave Management System with a Go (Gin + PostgreSQL) backend and a React (Vite + Tailwind) frontend.

Tech Stack
Backend: Go, Gin, PostgreSQL, sqlx, JWT
Frontend: React, Vite, Tailwind CSS, Axios, React Router
Project Structure
Backend: backend
Frontend: Frontend
Prerequisites
Install these first:

Go (version from go.mod:3: go 1.26.1)
Node.js 18+ and npm
PostgreSQL 13+
1. Database Setup (PostgreSQL)
Create the database first (the app does not create the database itself):
CREATE DATABASE leave_management;

Default database connection values are defined in database.go:18:

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456789
DB_NAME=leave_management
You can override them with environment variables.

2. Run Backend
From the backend folder:
cd backend
go mod tidy
go run ./cmd/server

Backend starts on port 8080 by default (see main.go:58).

What happens on startup:

Connects to PostgreSQL
Runs migrations
Seeds demo data if users table is empty
Reference: main.go:13

3. Run Frontend
Open a new terminal, then:

Frontend runs on:
cd Frontend
npm install
npm run dev

http://localhost:3000
Vite proxy sends /api calls to backend at http://localhost:8080 (see vite.config.js:9).

4. Login Credentials (Seeded Demo Accounts)
All seeded accounts use this password:

Password: admin123
Accounts (from database.go:108):

Admin
Email: admin@abc.com
Role: admin
Manager
Email: manager@abc.com
Role: manager
Employee
Email: dilshan@abc.com
Role: employee
Employee
Email: shamith@abc.com
Role: employee
Employee
Email: malisha@abc.com
Role: employee
Important:

Seed runs only when users table is empty (see database.go:92).
If your database already has users, these demo credentials may not exist.
5. API Base and Auth
Frontend API base URL is /api (see api.js:4).
JWT is stored in localStorage key token and sent as Bearer token (see api.js:9).
JWT secret can be overridden with JWT_SECRET; fallback is set in auth.go:62.
6. Common Troubleshooting
Frontend says it cannot reach server
Ensure backend is running on port 8080.
Check frontend proxy in vite.config.js:9.
Login fails with valid-seeming credentials
Confirm you are using seeded emails listed above.
Confirm password is admin123.
If DB already had data, seed may have been skipped.
Database connection error on backend startup
Verify PostgreSQL is running.
Verify DB credentials/environment variables.
Ensure leave_management database exists.
7. Useful Commands
Backend:
cd backend
go mod tidy
go run ./cmd/server

Frontend:
cd Frontend
npm install
npm run dev
npm run build
npm run lint
