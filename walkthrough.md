# Walkthrough - HEA DMV/EMIS Platform

I have successfully initialized the **HEA DMV/EMIS Platform** with an enterprise-grade architecture and implemented the core "standalone" functional feature (Data Import & Cleaning) alongside a premium UI/UX.

## Architecture Highlights
- **Backend**: Django REST Framework with JWT Authentication and a modular app structure (`imports`, `cleaning`).
- **Frontend**: Next.js 14+ with Tailwind CSS 4.0, incorporating a custom brand palette and premium glassmorphism effects.
- **Data Engine**: A rule-based cleaning system for normalizing national education data.

## Features Implemented

### 1. National Intelligence Dashboard (UI/UX)
A "wow" factor dashboard for HEA Executives featuring:
- **National KPI Cards**: Real-time tracking of student totals, graduation rates, and compliance.
- **Enrollment Trends**: Interactive Area Charts with custom gradients.
- **Regional Share**: Provincial distribution analysis using Bar Charts.
- **Premium Aesthetics**: Utilizing the provided brand colors and modern UI patterns.

### 2. Historical Data Import (Functional Standalone Feature)
A dedicated module for data ingestion:
- **Drag-and-Drop Uploader**: A modern interface for uploading `.csv` and `.xlsx` files with real-time feedback.
- **Backend API**: Endpoints for file handling and import history tracking.
- **Process Simulation**: Visual progress tracking and success/error state handling.

### 3. Data Cleaning Engine (Functional Logic)
- **CleaningRule Model**: Database-driven rules for data normalization.
- **Normalization Utility**: A regex-powered engine that transforms inconsistent values (e.g., "UNZA" -> "University of Zambia").
- **Seed Script**: Ready-to-use script to populate initial normalization rules.

## How to Run

### Backend
1. `cd backend/django-api`
2. `pip install -r requirements.txt`
3. `python manage.py migrate`
4. `python seed_rules.py` (optional: to seed cleaning rules)
5. `python manage.py runserver`

### Frontend
1. `cd frontend/nextjs-react-app`
2. `npm install`
3. `npm run dev`

Navigate to `http://localhost:3000/dashboard` to see the live platform.
