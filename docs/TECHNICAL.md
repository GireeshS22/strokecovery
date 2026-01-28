# Strokecovery - Technical Documentation

## Tech Stack Overview

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Mobile App** | Expo (React Native) | JS skills transfer, single codebase for iOS + Android + Web |
| **Backend** | FastAPI (Python) | Python familiarity, fast, modern, auto-generates API docs |
| **Database** | PostgreSQL | Robust relational DB, handles user-therapy-medicine relationships well |
| **Version Control** | GitHub | Industry standard, integrates with CI/CD |
| **CI/CD** | GitHub Actions + EAS Build | Automated testing, deployment, app store builds |
| **Cloud Hosting** | Railway or Render | Simple deployment, managed PostgreSQL, Python-friendly |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│    │   iOS    │    │ Android  │    │   Web    │            │
│    │   App    │    │   App    │    │   App    │            │
│    └────┬─────┘    └────┬─────┘    └────┬─────┘            │
│         │               │               │                   │
│         └───────────────┼───────────────┘                   │
│                         │                                    │
│              ┌──────────▼──────────┐                        │
│              │   Expo (React Native)│                        │
│              │   Single Codebase    │                        │
│              └──────────┬──────────┘                        │
│                         │                                    │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTPS / REST API
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                    BACKEND                                   │
├─────────────────────────┼───────────────────────────────────┤
│              ┌──────────▼──────────┐                        │
│              │   FastAPI (Python)   │                        │
│              │   REST API Server    │                        │
│              └──────────┬──────────┘                        │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         │               │               │                   │
│    ┌────▼────┐    ┌─────▼─────┐   ┌────▼────┐             │
│    │PostgreSQL│    │   Redis   │   │  S3/R2  │             │
│    │  (Data)  │    │  (Cache)  │   │ (Files) │             │
│    └─────────┘    └───────────┘   └─────────┘             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│               EXTERNAL SERVICES                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│    │  Expo    │    │  Push    │    │ OpenFDA  │            │
│    │  EAS     │    │ Notif.   │    │   API    │            │
│    └──────────┘    └──────────┘    └──────────┘            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
strokecovery/
├── docs/                    # Documentation (you are here)
│   ├── OVERVIEW.md
│   ├── FEATURES.md
│   ├── TECHNICAL.md
│   ├── ROADMAP.md
│   ├── DATA_REQUIREMENTS.md
│   ├── MARKET.md
│   └── ACCESSIBILITY.md
│
├── mobile/                  # Expo React Native app
│   ├── app/                 # App screens (file-based routing)
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API client, storage
│   ├── utils/               # Helper functions
│   ├── constants/           # Colors, config
│   ├── assets/              # Images, fonts
│   ├── app.json             # Expo config
│   └── package.json
│
├── server/                  # FastAPI backend
│   ├── app/
│   │   ├── main.py          # FastAPI app entry
│   │   ├── api/             # Route handlers
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── medicines.py
│   │   │   ├── therapy.py
│   │   │   ├── journal.py
│   │   │   └── community.py
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── core/            # Config, security, database
│   ├── tests/               # pytest tests
│   ├── requirements.txt
│   └── Dockerfile
│
├── .github/
│   └── workflows/           # GitHub Actions
│       ├── backend.yml      # Test & deploy backend
│       └── mobile.yml       # EAS build trigger
│
├── README.md
└── .gitignore
```

---

## Database Schema (Core Tables)

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'patient',  -- patient, caregiver
    created_at TIMESTAMP DEFAULT NOW()
);

-- Patient Profiles
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    stroke_date DATE,
    stroke_type VARCHAR(50),           -- ischemic, hemorrhagic, tbi
    affected_side VARCHAR(20),         -- left, right, both
    current_therapies TEXT[],          -- ['PT', 'OT', 'Speech']
    created_at TIMESTAMP DEFAULT NOW()
);

-- Medicines
CREATE TABLE medicines (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),            -- 'twice daily', 'every 8 hours'
    reminder_times TIME[],             -- [08:00, 20:00]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Medicine Logs
CREATE TABLE medicine_logs (
    id UUID PRIMARY KEY,
    medicine_id UUID REFERENCES medicines(id),
    scheduled_time TIMESTAMP,
    taken_time TIMESTAMP,
    status VARCHAR(20),                -- taken, missed, skipped
    created_at TIMESTAMP DEFAULT NOW()
);

-- Therapy Sessions
CREATE TABLE therapy_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    therapy_type VARCHAR(50),          -- PT, OT, Speech
    session_date DATE,
    duration_minutes INT,
    notes TEXT,
    mood_rating INT,                   -- 1-5
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ailment Journal
CREATE TABLE ailments (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    symptom VARCHAR(100),              -- pain, fatigue, dizziness
    body_location VARCHAR(100),        -- shoulder, head, leg
    severity INT,                      -- 1-10
    notes TEXT,
    logged_at TIMESTAMP DEFAULT NOW()
);

-- Mood Entries
CREATE TABLE mood_entries (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    mood_level INT,                    -- 1-5
    notes TEXT,
    logged_at TIMESTAMP DEFAULT NOW()
);

-- Stroke Bites (Content)
CREATE TABLE stroke_bites (
    id UUID PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    category VARCHAR(50),              -- fact, tip, motivation
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Community Posts (Phase 3)
CREATE TABLE community_posts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    content TEXT,
    post_type VARCHAR(20),             -- story, question, update
    likes_count INT DEFAULT 0,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints (Core)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new user |
| POST | `/api/auth/login` | Login, get JWT token |
| POST | `/api/auth/refresh` | Refresh JWT token |
| GET | `/api/auth/me` | Get current user |

### User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get patient profile |
| PUT | `/api/profile` | Update profile |
| POST | `/api/profile/onboarding` | Complete onboarding |

### Medicines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medicines` | List user's medicines |
| POST | `/api/medicines` | Add new medicine |
| PUT | `/api/medicines/{id}` | Update medicine |
| DELETE | `/api/medicines/{id}` | Remove medicine |
| POST | `/api/medicines/{id}/log` | Log medicine taken/missed |

### Therapy
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/therapy/sessions` | List therapy sessions |
| POST | `/api/therapy/sessions` | Log new session |
| GET | `/api/therapy/calendar` | Get calendar view |

### Journal
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/journal/ailments` | List ailment entries |
| POST | `/api/journal/ailments` | Log new ailment |
| GET | `/api/journal/mood` | List mood entries |
| POST | `/api/journal/mood` | Log mood |

### Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content/stroke-bites` | Get daily stroke bites |
| GET | `/api/content/stroke-bites/today` | Get today's bite |

---

## Push Notification Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Mobile    │     │   Server    │     │    Expo     │
│    App      │     │  (FastAPI)  │     │    Push     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  1. Register      │                   │
       │  Push Token       │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │  2. Store token   │
       │                   │  with user        │
       │                   │                   │
       │                   │  3. Scheduled job │
       │                   │  checks reminders │
       │                   │                   │
       │                   │  4. Send push     │
       │                   │──────────────────>│
       │                   │                   │
       │                   │                   │  5. Deliver
       │<──────────────────────────────────────│
       │                   │                   │
```

### Push Implementation Notes

- Use `expo-notifications` for unified iOS/Android handling
- Store Expo push tokens in user record
- Backend scheduled job (cron) checks medicine reminders
- Use Expo Push API to send notifications
- Handle token refresh on app restart

---

## Security Considerations

| Concern | Solution |
|---------|----------|
| Authentication | JWT tokens with refresh rotation |
| Password storage | bcrypt hashing |
| API security | HTTPS only, rate limiting |
| Data privacy | User can export/delete all data (GDPR) |
| Health data | Consider HIPAA compliance for US market |
| Input validation | Pydantic schemas on all endpoints |

---

## Development Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Expo CLI (`npm install -g expo-cli`)

### Backend Setup
```bash
cd server
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env      # Configure database URL
uvicorn app.main:app --reload
```

### Mobile Setup
```bash
cd mobile
npm install
npx expo start
```

### Running Tests
```bash
# Backend
cd server && pytest

# Mobile
cd mobile && npm test
```

---

## Deployment

### Backend (Railway/Render)
1. Connect GitHub repo
2. Set environment variables (DATABASE_URL, JWT_SECRET)
3. Deploy on push to main

### Mobile (EAS Build)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for stores
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Monitoring & Observability

| Tool | Purpose | Cost |
|------|---------|------|
| Sentry | Error tracking (mobile + backend) | Free tier |
| Railway/Render metrics | Server health | Included |
| Expo analytics | App usage | Free |
| PostgreSQL logs | Query performance | Included |
