# Task List - HEA DMV/EMIS Platform

## ✅ Completed Features

### Core Platform
- [x] Project Scaffolding (Django + Next.js)
- [x] Modular microservices-ready architecture
- [x] Role-based access control (RBAC) — 8 roles
- [x] Audit logging and activity tracking
- [x] Health monitoring endpoint (`/api/v1/health/`)
- [x] API versioning under `/api/v1/`

### Authentication & User Management
- [x] JWT login/logout with token blacklisting
- [x] Token refresh support (auto-refresh on 401)
- [x] Current user profile management (GET + PATCH)
- [x] Password change endpoint
- [x] User list/create/update/deactivate (admin)
- [x] Admin password reset
- [x] User stats endpoint
- [x] Zustand-based token/state management (frontend)
- [x] Axios-powered API integration layer

### Institution Management
- [x] Institution registration and CRUD
- [x] Campus management model + API
- [x] Institution filtering (type, province, search)
- [x] Institution performance reporting endpoint
- [x] Institution stats endpoint
- [x] Institution type: PUBLIC, PRIVATE, COLLEGE, TECHNICAL

### Student Management
- [x] Student model (student_id, gender, status, year_of_entry)
- [x] Student CRUD API with filtering
- [x] Student data analytics via enrollment model

### Programme Management
- [x] Programme model (level, status, duration, accreditation)
- [x] Programme CRUD API with filtering
- [x] Programme-based reporting

### Enrollment Management
- [x] Enrollment aggregate model (total, male, female, graduates)
- [x] Enrollment CRUD API

### Data Import & Processing
- [x] CSV import support
- [x] XLSX import support
- [x] JSON import support
- [x] File validation before upload
- [x] Data preview before import (5-row preview endpoint)
- [x] Import type routing: AUTO, INSTITUTIONS, STUDENTS, PROGRAMMES, ENROLLMENTS, INDICATORS
- [x] Automated backend data processing
- [x] Import audit tracking (ImportHistory model)
- [x] Data cleaning engine integration during import

### Data Cleaning Engine
- [x] CleaningRule model (pattern/replacement/category)
- [x] Normalization utility (regex + exact match)
- [x] Cleaning rules CRUD API
- [x] Normalize value test endpoint
- [x] Admin registration

### Indicators & Intelligence
- [x] Indicator model (code, category, formula, target, unit)
- [x] IndicatorValue model (per institution per year)
- [x] Indicator CRUD API
- [x] Indicator values API
- [x] Indicator trend endpoint (year-over-year)
- [x] Indicator summary endpoint (national averages)

### Reporting & Analytics
- [x] Dynamic report generation engine (Report model)
- [x] Report templates endpoint (6 templates)
- [x] Report CRUD API
- [x] Report summary/data endpoint
- [x] Enrollment reports
- [x] Graduation reports
- [x] Institution reports
- [x] Programme reports
- [x] Executive dashboard reporting
- [x] Analytics overview dashboard
- [x] National dashboard endpoint
- [x] Executive dashboard endpoint
- [x] Analytics overview endpoint (multi-year series)

### Governance & Compliance
- [x] AuditLog model with log() helper
- [x] Audit log API (admin-only, filterable)
- [x] Audit log admin registration
- [x] Import actions logged to audit trail

### Admin
- [x] All models registered in Django admin
- [x] Custom admin classes with list_display, filters, search

### Frontend Pages
- [x] Login page (JWT auth, demo credentials)
- [x] National Dashboard (live data, charts, KPI cards)
- [x] Executive Dashboard (live data, top institutions, YoY growth)
- [x] Institutions page (live CRUD, register modal, filters)
- [x] Students page (live data, filters, pagination)
- [x] Programmes page (live CRUD, create modal, filters)
- [x] Data Import page (drag-drop, preview, import type selector, history)
- [x] Indicator Engine page (live CRUD, create modal, summary cards)
- [x] Reports page (live CRUD, templates, generate modal)
- [x] User Management page (live CRUD, create modal, stats)
- [x] Governance page (compliance overview, module links)
- [x] Audit Logs page (live data, filters, pagination)
- [x] Compliance Tracking page
- [x] Data Quality Alerts page
- [x] AI Insights page (UI with model health)
- [x] Admin Dashboard page (system health, user/institution stats)
- [x] Public Portal page (live institution search, stats)
- [x] Settings page (profile edit, password change, notifications)
- [x] Unauthorized page
- [x] 1. **Setup & Global Styles**
  - [x] Install `framer-motion`
  - [x] Update `globals.css` with glassmorphism and animation utilities
- [x] Sidebar with grouped navigation (all roles)
- [x] DashboardLayout shared component
- [x] ProtectedRoute + RoleGate components

### State Management
- [x] Zustand auth store with localStorage persistence
- [x] Axios instance with auto token refresh interceptor
- [x] AuthContext updated to use Zustand store

## How to Run

### Backend
```bash
cd backend/django-api
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # or: python create_admin.py
python manage.py runserver
```

### Frontend
```bash
cd frontend/nextjs-react-app
npm install
npm run dev
```

Navigate to `http://localhost:3000` — redirects to `/dashboard`.
Login with: `admin` / `adminpassword123`

### API Base URL
`http://127.0.0.1:8000/api/v1/`

### Key Endpoints
| Endpoint | Description |
|----------|-------------|
| POST `/auth/login/` | JWT login |
| GET `/auth/me/` | Current user |
| GET/POST `/auth/users/` | User management |
| GET/POST `/institutions/` | Institution CRUD |
| GET/POST `/academic/students/` | Student CRUD |
| GET/POST `/academic/programmes/` | Programme CRUD |
| GET/POST `/academic/enrollments/` | Enrollment CRUD |
| POST `/imports/upload/` | File import |
| POST `/imports/preview/` | File preview |
| GET `/imports/history/` | Import history |
| GET/POST `/indicators/` | Indicator CRUD |
| GET `/indicators/summary/` | National KPI summary |
| GET/POST `/cleaning/rules/` | Cleaning rules |
| POST `/cleaning/normalize/` | Test normalization |
| GET/POST `/reports/` | Report CRUD |
| GET `/reports/templates/` | Report templates |
| GET `/analytics/dashboard/` | National dashboard |
| GET `/analytics/executive/` | Executive summary |
| GET `/analytics/overview/` | Analytics overview |
| GET `/audit/` | Audit logs (admin) |
| GET `/api/v1/health/` | Health check |
