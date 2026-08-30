# Database Schema Documentation

## Database Technology
- **Engine**: PostgreSQL (Production), SQLite (Local MVP)
- **ORM**: SQLAlchemy

## Core Entities

### 1. Users
Manages students and reviewers.
- `id`: Integer (PK)
- `name`: String
- `role`: String (e.g., student, reviewer)

### 2. Cases
Represents a troubleshooting session.
- `id`: String (PK)
- `title`: String
- `symptom`: Text
- `status`: String
- `created_at`: DateTime

### 3. Evidence
Raw data supplied by the student.
- `id`: Integer (PK)
- `case_id`: String (FK -> Cases)
- `device`: String
- `command`: String
- `raw_output`: Text

### 4. Diagnoses
AI-generated analysis.
- `id`: Integer (PK)
- `case_id`: String (FK -> Cases)
- `root_cause`: Text
- `osi_layer`: String
- `confidence`: Integer
- `explanation`: Text
- `next_command`: String
- `suggested_fix`: Text

*(More tables such as `ParsedEvidence`, `RuleFindings`, and `Reviews` will be added in Phase 2)*
