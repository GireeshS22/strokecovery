# Daily Stroke Bites - Implementation Plan

## Context

Daily Stroke Bites (Feature 2.1) is the next priority feature on the roadmap. It's an Instagram/WhatsApp Stories-like experience that delivers 7-10 personalized, swipeable cards daily to stroke survivors. Cards contain research-backed facts (from our paper_refinery insights table), motivational messages, and interactive Q&A questions that personalize future content. The LLM (Llama 3.3-70B via Together.ai) generates the cards on-demand using real research insights and the user's profile.

This feature is the primary engagement hook to bring users back daily.

---

## Architecture Overview

```
User taps "Daily Stroke Bites" on Home Screen
  │
  ├─ Mobile calls GET /api/stroke-bites/today
  │    ├─ If cached for today → return immediately
  │    └─ If 404 → Mobile calls POST /api/stroke-bites/generate
  │         │
  │         ├─ Load user profile (stroke_type, therapies, recovery_phase)
  │         ├─ Load past Q&A answers (last 30 days)
  │         ├─ Fetch insights (semantic search → random fallback)
  │         ├─ Build prompt → Call Together.ai Llama 3.3-70B
  │         ├─ Parse & validate card JSON
  │         ├─ Cache in stroke_bites table
  │         └─ Return card tree to mobile
  │
  └─ Mobile renders full-screen Stories UI
       ├─ Top segmented progress bar (Instagram style)
       ├─ Tap left/right to navigate
       ├─ Q&A cards show tappable options → branch to next card
       └─ On exit/completion → POST /api/stroke-bites/answers
```

---

## Card Data Model

Flat list with conditional routing (NOT a nested tree). Each card has an `id` and a `next_card_id`. Q&A cards map each option to a different `next_card_id`. Branches always rejoin the main sequence.

```json
{
  "id": "c3",
  "type": "qa",
  "body": "",
  "emoji": "🤔",
  "background_color": "#7C3AED",
  "question": "Do you currently do physiotherapy?",
  "options": [
    {"key": "a", "label": "Yes", "next_card_id": "c4a"},
    {"key": "b", "label": "No", "next_card_id": "c4b"}
  ],
  "next_card_id": null
}
```

Card types: `welcome`, `research_fact`, `motivation`, `qa`, `conditional_response`, `tip`

---

## Database Changes (2 new tables)

### Table: `stroke_bites`
```sql
CREATE TABLE stroke_bites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    generated_date DATE NOT NULL,
    cards_json JSONB NOT NULL,
    start_card_id VARCHAR(20) NOT NULL,
    card_sequence_length INTEGER NOT NULL DEFAULT 8,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, generated_date)
);
CREATE INDEX idx_stroke_bites_patient_date ON stroke_bites(patient_id, generated_date);
```

### Table: `stroke_bite_answers`
```sql
CREATE TABLE stroke_bite_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bite_id UUID NOT NULL REFERENCES stroke_bites(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    card_id VARCHAR(20) NOT NULL,
    selected_key VARCHAR(10) NOT NULL,
    question_text TEXT,
    selected_label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_stroke_bite_answers_patient ON stroke_bite_answers(patient_id, created_at);
```

---

## Server Implementation (5 new files, 2 edits)

### Step 1: Create `server/app/models/stroke_bite.py`
SQLAlchemy models for `StrokeBite` and `StrokeBiteAnswer`. Follow pattern from `server/app/models/game_result.py`.

### Step 2: Create `server/app/schemas/stroke_bite.py`
Pydantic schemas:
- `BiteOption` (key, label, next_card_id)
- `BiteCard` (id, type, title, body, emoji, background_color, source_insight_id, question, options, next_card_id)
- `StrokeBiteResponse` (id, generated_date, cards, start_card_id, total_cards, card_sequence_length)
- `StrokeBiteAnswerCreate` (bite_id, answers list)

### Step 3: Create `server/app/services/bite_generator.py`
Core business logic — the heart of the feature:

**`get_recovery_phase(stroke_date)`** — Compute from stroke_date:
- ≤7 days → "acute", ≤180 days → "subacute", else → "chronic"

**`fetch_insights(profile, exclude_ids, client)`** — Two-step strategy:
1. Try semantic search via `match_insights()` RPC using a query built from user's therapies (requires embedding call via OpenAI)
2. If <5 results, supplement with random selection: `SELECT * FROM insights WHERE stroke_types @> ARRAY[user_type] ... ORDER BY random() LIMIT N`
3. Exclude insight IDs already shown in last 14 days

**`build_prompt(profile, insights, past_answers)`** — Build system + user prompts:
- System prompt defines card types, JSON format, color palette, writing rules
- User prompt includes: stroke_type, recovery_phase, days_since_stroke, current_therapies, affected_side, past Q&A preferences, research insights (claim + evidence + intervention)

**`call_llm(system_prompt, user_prompt)`** — Call Together.ai:
- Reuse pattern from `server/paper_refinery/ingestion/extractor.py`
- `Together(api_key=...).chat.completions.create(model=..., messages=..., temperature=0.3, max_tokens=3000)`
- Parse JSON from response (handle markdown-wrapped JSON)

**`validate_card_graph(cards, start_id)`** — Validate all `next_card_id` references resolve, no orphans, no cycles

**`generate_bites(profile, db)`** — Orchestrator: fetch insights → build prompt → call LLM → validate → store → return

### Step 4: Create `server/app/services/fallback_bites.py`
8 static generic cards (motivation, general recovery tips) for when LLM fails. No research facts, no Q&A — just safe, encouraging content.

### Step 5: Create `server/app/api/stroke_bites.py`
Three endpoints following the pattern in `server/app/api/games.py`:
- `GET /today` — Query stroke_bites for patient + today's date. Return cached or 404.
- `POST /generate` — Call bite_generator.generate_bites(), cache result, return.
- `POST /answers` — Bulk insert into stroke_bite_answers.

Auth: Reuse `get_user_and_profile()` pattern from games.py.

### Step 6: Edit `server/app/api/__init__.py`
Add: `from .stroke_bites import router as stroke_bites_router`
Add: `api_router.include_router(stroke_bites_router, prefix="/stroke-bites", tags=["Stroke Bites"])`

### Step 7: Edit `server/app/core/config.py`
Add `together_api_key`, `together_model`, and `openai_api_key` fields to the app Settings class (currently only in paper_refinery config). These are needed by the bite generator service.

---

## Mobile Implementation (1 new file, 2 edits)

### Step 8: Edit `mobile/services/api.ts`
Add interfaces and `strokeBitesApi` module:
```typescript
export const strokeBitesApi = {
  getToday: () => request<StrokeBiteResponse>('/api/stroke-bites/today'),
  generate: () => request<StrokeBiteResponse>('/api/stroke-bites/generate', { method: 'POST' }),
  saveAnswers: (data) => request('/api/stroke-bites/answers', { method: 'POST', body: JSON.stringify(data) }),
};
```

### Step 9: Create `mobile/app/stroke-bites.tsx`
Full-screen Stories UI — the main new screen:

**Layout:**
- Hidden header (`Stack.Screen options={{ headerShown: false }}`)
- Full-screen colored background (card's `background_color`)
- Top: segmented progress bar (Instagram style) + close (X) button
- Center: card content (emoji, title, body text)
- For Q&A cards: option buttons styled as large tappable cards
- Tap left half → go back, tap right half → go forward (except on Q&A cards)

**State management:**
- `cards[]` — flat card list from API
- `currentCardId` — which card is displayed
- `cardHistory[]` — stack of visited card IDs (for back navigation)
- `answers{}` — map of cardId → selectedKey

**Loading state:**
1. Call `getToday()` first
2. If 404, call `generate()` (show loading animation — pulsing card placeholder, "Preparing your daily bites...")
3. On success, render cards starting from `start_card_id`

**Navigation logic:**
- Non-QA cards: tap right → follow `next_card_id`, tap left → pop from `cardHistory`
- QA cards: MUST tap an option button → follow that option's `next_card_id`
- When `next_card_id` is null → show completion screen ("You've finished today's bites!")
- On close/completion → save Q&A answers via `saveAnswers()`

**Progress bar:**
- Segments = `card_sequence_length` from API
- Filled segments = `cardHistory.length + 1`
- Active segment gets highlight color, past segments are filled, future are dimmed

### Step 10: Edit `mobile/app/(tabs)/home.tsx`
Add Stroke Bites card between Quick Stats and Quick Actions sections (after line 49):

```tsx
{/* Daily Stroke Bites */}
<TouchableOpacity
  style={[styles.bitesCard, { backgroundColor: '#7C3AED' }]}
  onPress={() => router.push('/stroke-bites')}
>
  <Text style={styles.bitesEmoji}>📰</Text>
  <View style={styles.bitesText}>
    <Text style={styles.bitesTitle}>Daily Stroke Bites</Text>
    <Text style={styles.bitesSubtitle}>Your personalized recovery insights</Text>
  </View>
  <Text style={styles.bitesArrow}>›</Text>
</TouchableOpacity>
```

Style: Purple (#7C3AED) background, white text, similar layout to Brain Games card but more prominent (this is the daily engagement hook).

---

## LLM Prompt Design

### System Prompt (key rules):
- Generate 8-10 cards as flat JSON with conditional routing
- Include: 1 welcome, 2-3 research facts, 1-2 Q&A with branching responses, 1-2 motivation/tips
- Research facts MUST be based only on provided insights — no invented medical claims
- Plain language, 1-3 short sentences per card, warm and encouraging tone
- Color palette: teal (#0D9488), blue (#2563EB), purple (#7C3AED), green (#059669), orange (#EA580C), pink (#EC4899)
- Card IDs: "c1", "c2", "c3", "c4a", "c4b", etc.
- Last card in main path has `next_card_id: null`

### User Prompt (includes):
- Patient profile: stroke_type, recovery_phase, days_since_stroke, current_therapies, affected_side
- Past Q&A preferences from stroke_bite_answers (last 30 days)
- 5-8 research insights with claim, evidence, intervention fields
- Instruction to generate Q&A questions that discover NEW preferences not already known

---

## Data Storage & Personalization Flow

### What gets saved:

| Data | Table | Retention | Purpose |
|------|-------|-----------|---------|
| Full card set (all 8-10 cards as JSON) | `stroke_bites` | Per user per day | **Caching** — instant reload if user re-opens same day. No LLM call needed. |
| Q&A answers (card_id, selected_key, question_text) | `stroke_bite_answers` | Permanent | **Personalization** — builds preference profile over time. |

### How personalization works day-over-day:

1. **Day 1**: User sees Q&A "Do you do physiotherapy?" → selects "Yes" → stored in `stroke_bite_answers`
2. **Day 2 generation**: Bite generator queries last 30 days of answers → builds preference dict:
   ```json
   {"does_physiotherapy": true, "has_caregiver": false, "exercises_daily": false}
   ```
3. **Injected into LLM prompt**: "Previous Q&A preferences: Patient does physiotherapy, does not have a caregiver, does not exercise daily"
4. **LLM tailors content**: Gives advanced PT tips (since user does PT), encourages daily exercise (since they don't), suggests self-care tips (no caregiver)
5. **LLM generates NEW Q&A questions**: About things not yet known — e.g., "How's your sleep quality?" — progressively building the profile
6. **Day 3+**: More answers → richer profile → more personalized bites

The key insight: Q&A questions are NOT just interactive — they're a data collection mechanism. Each day's Q&A discovers new preferences, making future bites increasingly relevant.

---

## Insight Selection Strategy

Two-step approach:
1. **Semantic search first**: Build a query string from user's therapies and recovery phase (e.g., "physiotherapy exercises for chronic ischemic stroke recovery"). Embed it via OpenAI, then call `match_insights()` RPC. Take top 5.
2. **Random fallback**: If semantic search returns <5 results, supplement with random insights filtered by stroke_type and recovery_phase, excluding already-shown IDs from the last 14 days.

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| LLM returns invalid JSON | Retry once with simplified prompt. If still fails, return fallback_bites. |
| LLM returns broken card graph | validate_card_graph catches it → return fallback_bites |
| No insights in database | Generate without research facts (motivation + Q&A only) |
| No stroke_date on profile | Use recovery_phase=None, tell LLM to generate phase-agnostic content |
| Network timeout (mobile) | 30s timeout on generate call, show retry button on failure |
| Race condition (double generate) | UNIQUE(patient_id, generated_date) constraint → catch violation, return existing |
| User closes mid-generation | Server finishes and caches. Next open loads from cache instantly. |

---

## Files Summary

| # | Action | File | Description |
|---|--------|------|-------------|
| 1 | CREATE | `server/app/models/stroke_bite.py` | SQLAlchemy models |
| 2 | CREATE | `server/app/schemas/stroke_bite.py` | Pydantic schemas |
| 3 | CREATE | `server/app/services/bite_generator.py` | LLM generation + insight fetching |
| 4 | CREATE | `server/app/services/fallback_bites.py` | Static fallback cards |
| 5 | CREATE | `server/app/api/stroke_bites.py` | API endpoints (GET/POST) |
| 6 | EDIT | `server/app/api/__init__.py` | Register stroke-bites router |
| 7 | EDIT | `server/app/core/config.py` | Add Together/OpenAI keys |
| 8 | EDIT | `mobile/services/api.ts` | Add strokeBitesApi module |
| 9 | CREATE | `mobile/app/stroke-bites.tsx` | Full-screen Stories UI |
| 10 | EDIT | `mobile/app/(tabs)/home.tsx` | Add Stroke Bites entry card |

**Key existing files to reuse patterns from:**
- `server/app/api/games.py` — auth pattern (`get_user_and_profile`)
- `server/paper_refinery/ingestion/extractor.py` — Together.ai LLM call pattern
- `server/paper_refinery/db.py` — Supabase client pattern for insight queries
- `server/paper_refinery/config.py` — Settings pattern for API keys
- `mobile/app/(tabs)/home.tsx` — Home screen card patterns
- `mobile/app/play-pattern-repeat.tsx` — Full-screen game UI pattern

---

## Verification Plan

1. **Database**: Run CREATE TABLE SQL in Supabase SQL editor, verify tables exist
2. **Server**: Start FastAPI (`uvicorn app.main:app --reload`), test endpoints:
   - `GET /api/stroke-bites/today?token=...` → 404 (no bites yet)
   - `POST /api/stroke-bites/generate?token=...` → 200 with card JSON
   - `GET /api/stroke-bites/today?token=...` → 200 (cached)
   - `POST /api/stroke-bites/answers?token=...` → 201
3. **Mobile**: Start Expo (`npx expo start`), verify:
   - Home screen shows Stroke Bites card
   - Tapping opens Stories screen with loading state
   - Cards display with correct colors, text, emojis
   - Tap left/right navigates correctly
   - Q&A options branch to correct cards
   - Progress bar advances correctly
   - Close button exits and saves answers
4. **Edge cases**: Test with no insights in DB, test LLM failure (disconnect network briefly), test double-tap generate

---

## Implementation Order

Build server-side first (can test with curl/Postman), then mobile:
1. Database tables (SQL)
2. Server models + schemas
3. Server config update
4. Bite generator service + fallback
5. API routes
6. Mobile API service
7. Mobile Stories screen
8. Mobile home screen card
9. End-to-end testing
