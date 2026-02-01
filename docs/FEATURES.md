# Strokecovery - Feature List

## Current Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1 | **COMPLETE** | 4/4 features |
| Phase 2 | In Progress | 2/4 features |
| Phase 3 | Not Started | 0/4 features |
| Phase 4 | Not Started | 0/5 features |
| Phase 5 | Not Started | 0/4 features |

---

## Feature Phases Overview

| Phase | Focus | Tech Difficulty | Data Challenge |
|-------|-------|-----------------|----------------|
| Phase 1 | MVP — Core tracking | Easy-Medium | Low |
| Phase 2 | Engagement & tracking | Easy | Content creation |
| Phase 3 | Community | Medium-Hard | Moderation |
| Phase 4 | Advanced features | Medium | Game content |
| Phase 5 | Integrations | Hard | API complexity |

---

## Phase 1: MVP (Launch Release) - COMPLETE

*Core value — enough to be useful on day one*

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 1.1 | **User Onboarding** | Sign up, profile setup (stroke date, affected side, current therapies) | Done |
| 1.2 | **Medicine Reminder** | Add medicines with dosage, set reminder times, push notifications | Done |
| 1.3 | **Therapy Calendar** | Log PT/OT/Speech sessions, view weekly/monthly calendar | Done |
| 1.4 | **Basic Accessibility** | Large text toggle, high contrast mode, simple navigation | Done |

### MVP Technical Notes

- Push notifications are critical — must work reliably on iOS and Android
- Consider using medicine database API (OpenFDA or RxNorm) for autocomplete
- Calendar should sync with device calendar (optional)

### MVP Success Criteria

- User can set up profile in under 3 minutes
- Medicine reminders fire reliably within 1 minute of scheduled time
- User can log a therapy session in under 30 seconds

---

## Phase 2: Engagement & Tracking - IN PROGRESS

*Keep users coming back daily*

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 2.1 | **Daily Stroke Bites** | Swipeable cards with facts, tips, encouragement (Instagram stories style) | Pending |
| 2.2 | **Ailment Journal** | Log symptoms (pain, fatigue, dizziness) with date, location, severity | Done |
| 2.3 | **Mood Tracker** | Daily mood check-in with emoji scale, weekly/monthly trends view | Done |
| 2.4 | **Streaks & Milestones** | Visual celebrations for consistency (7-day streak, 100 days since stroke) | Pending |

### Phase 2 Technical Notes

- Stroke Bites needs a content management system (can be simple JSON to start)
- Mood tracker should show correlation with therapy/medication patterns
- Streaks should encourage, never punish — "Welcome back!" not "You broke your streak"

### Phase 2 Success Criteria

- 60% of daily active users view Stroke Bites
- Average mood tracking completion: 5+ days/week
- 30% of users maintain 7+ day streaks

---

## Phase 3: Community

*Connection and support*

| # | Feature | Description | Data Needed | Difficulty |
|---|---------|-------------|-------------|------------|
| 3.1 | **Recovery Stories** | Share and read long-form stories from other survivors | User-generated; seed with 10-20 initial stories | Medium |
| 3.2 | **Community Feed** | Posts, likes, comments with moderation | Post schema, moderation rules, report system | Medium-Hard |
| 3.3 | **Caregiver Mode** | Separate login for caregivers, view patient's logs and progress | Role-based permissions, caregiver-patient linking | Medium |
| 3.4 | **Shared Access** | Invite family members with different permission levels | Invite tokens, permission levels (view-only, full access) | Medium |

### Phase 3 Technical Notes

- Community features require content moderation strategy
- Consider AI-assisted moderation for flagging concerning content
- Caregiver linking should require patient consent
- HIPAA/GDPR considerations for shared health data

### Phase 3 Success Criteria

- 20% of users post or comment monthly
- Average caregiver engagement: 3x/week
- Content moderation response time: <24 hours

---

## Phase 4: Advanced Features

*Rehabilitation tools and clinical utility*

| # | Feature | Description | Data Needed | Difficulty |
|---|---------|-------------|-------------|------------|
| 4.1 | **Cognitive Exercises** | Memory games, word-finding, attention tasks | Game content: word lists, image sets, puzzle logic | Medium-Hard |
| 4.2 | **Speech Practice** | Record speech, sample phrases, track clarity over time | Audio storage, sample phrases (50-100) | Medium |
| 4.3 | **Appointment Tracker** | Doctor visits, "questions to ask" notepad | Appointment schema | Easy |
| 4.4 | **Export Reports** | Generate PDF summary for doctor visits | PDF template, data aggregation logic | Medium |
| 4.5 | **Vitals Logging** | Track blood pressure, blood sugar, weight | Vitals schema, healthy range reference data | Easy |

### Phase 4 Technical Notes

- Cognitive exercises should adapt difficulty based on performance
- Speech practice needs secure audio storage (consider privacy)
- PDF export should be shareable via email or messaging apps
- Vitals can integrate with Apple Health / Google Fit in Phase 5

### Phase 4 Success Criteria

- 40% of users try cognitive exercises
- Users complete 3+ speech practice sessions/week
- 25% of users export report before doctor visits

---

## Phase 5: Integrations

*Ecosystem and scale*

| # | Feature | Description | Data Needed | Difficulty |
|---|---------|-------------|-------------|------------|
| 5.1 | **Wearable Sync** | Import data from Apple Watch, Fitbit, Google Fit | API credentials, data mapping | Hard |
| 5.2 | **Telehealth** | Video call scheduling with therapists | Video SDK (Twilio/Agora), provider directory | Hard |
| 5.3 | **Emergency Features** | FAST stroke warning signs, emergency contacts quick-dial, location sharing | Emergency contact schema, FAST content | Medium |
| 5.4 | **Voice Commands** | Full voice control for motor-impaired users | Voice command mappings, speech recognition | Hard |

### Phase 5 Technical Notes

- Each wearable platform has different SDK requirements
- Telehealth may require HIPAA-compliant video provider
- Voice commands should cover all core features (meds, logging, navigation)

---

## Feature Priority Matrix

```
IMPACT
  ^
  |   [Medicine Reminder]     <- Start here
  |        [Therapy Calendar]
  |   [Stroke Bites]    [Community Feed]
  |        [Mood Tracker]
  |             [Cognitive Exercises]
  |                  [Wearable Sync]
  +----------------------------------------> EFFORT
       Low                            High
```

## Recommended Build Order

1. ~~Auth + Medicine Reminder (validate push notifications)~~ **DONE**
2. ~~Therapy Calendar (core tracking loop)~~ **DONE**
3. ~~Basic Accessibility (essential for target users)~~ **DONE**
4. Daily Stroke Bites (engagement hook) - **NEXT**
5. ~~Ailment + Mood tracking (complete journaling)~~ **DONE**
6. Streaks & Milestones (retention)
7. Community features (longer runway, moderation needed)
8. Advanced features (differentiation)
9. Integrations (scale)
