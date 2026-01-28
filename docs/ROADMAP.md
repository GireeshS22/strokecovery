# Strokecovery - Development Roadmap

## Phase Overview

| Phase | Name | Focus | Status |
|-------|------|-------|--------|
| 0 | Foundation | Project setup, infrastructure | Not Started |
| 1 | MVP | Core tracking features | Not Started |
| 2 | Engagement | Daily habits & tracking | Not Started |
| 3 | Community | Social features | Not Started |
| 4 | Advanced | Rehab tools | Not Started |
| 5 | Integrations | Ecosystem connections | Not Started |

---

## Phase 0: Foundation

*Set up development environment and infrastructure*

### Tasks

- [ ] Initialize Expo project
- [ ] Initialize FastAPI backend
- [ ] Set up PostgreSQL database
- [ ] Configure GitHub repository
- [ ] Set up GitHub Actions for CI
- [ ] Configure EAS Build for mobile
- [ ] Deploy staging environment (Railway/Render)
- [ ] Set up error tracking (Sentry)

### Deliverables

- Working development environment
- CI/CD pipeline running
- Empty app deployable to test devices

---

## Phase 1: MVP

*Launch with core value — medication tracking and therapy logging*

### Features

| Feature | Priority | Status |
|---------|----------|--------|
| User registration & login | P0 | Not Started |
| User onboarding flow | P0 | Not Started |
| Patient profile setup | P0 | Not Started |
| Medicine list management | P0 | Not Started |
| Medicine reminder notifications | P0 | Not Started |
| Medicine log (taken/missed) | P0 | Not Started |
| Therapy calendar view | P0 | Not Started |
| Log therapy session | P0 | Not Started |
| Basic accessibility settings | P0 | Not Started |

### Milestones

1. **M1.1** — Auth working (register, login, JWT)
2. **M1.2** — Profile & onboarding complete
3. **M1.3** — Medicine CRUD + reminders working
4. **M1.4** — Therapy calendar functional
5. **M1.5** — Accessibility settings in place
6. **M1.6** — MVP feature complete
7. **M1.7** — Beta testing with 10-20 users
8. **M1.8** — App Store / Play Store submission

### Success Criteria

- [ ] User can complete onboarding in <3 minutes
- [ ] Push notifications fire within 1 minute of scheduled time
- [ ] Therapy session can be logged in <30 seconds
- [ ] App works with large text / high contrast enabled

---

## Phase 2: Engagement

*Increase daily retention with content and tracking*

### Features

| Feature | Priority | Status |
|---------|----------|--------|
| Daily Stroke Bites (swipeable cards) | P1 | Not Started |
| Stroke Bites content management | P1 | Not Started |
| Ailment journal | P1 | Not Started |
| Mood tracker | P1 | Not Started |
| Mood trends visualization | P1 | Not Started |
| Streak tracking | P1 | Not Started |
| Milestone celebrations | P1 | Not Started |

### Milestones

1. **M2.1** — Stroke Bites UI complete
2. **M2.2** — 100+ Stroke Bites content loaded
3. **M2.3** — Ailment journal functional
4. **M2.4** — Mood tracker with trends
5. **M2.5** — Streaks & milestones working
6. **M2.6** — Phase 2 feature complete

### Success Criteria

- [ ] 60% of DAU view Stroke Bites
- [ ] Average mood tracking: 5+ days/week
- [ ] 30% of users maintain 7+ day streaks

---

## Phase 3: Community

*Build connection between survivors and caregivers*

### Features

| Feature | Priority | Status |
|---------|----------|--------|
| Recovery stories (read/write) | P2 | Not Started |
| Community feed | P2 | Not Started |
| Post likes & comments | P2 | Not Started |
| Content moderation system | P2 | Not Started |
| Report inappropriate content | P2 | Not Started |
| Caregiver account type | P2 | Not Started |
| Link caregiver to patient | P2 | Not Started |
| Caregiver dashboard | P2 | Not Started |
| Shared access invitations | P2 | Not Started |

### Milestones

1. **M3.1** — Recovery stories feature complete
2. **M3.2** — Community feed with moderation
3. **M3.3** — Caregiver mode functional
4. **M3.4** — Shared access working
5. **M3.5** — Phase 3 feature complete

### Success Criteria

- [ ] 20% of users post or comment monthly
- [ ] Caregiver engagement: 3x/week average
- [ ] Content moderation response: <24 hours

---

## Phase 4: Advanced Features

*Clinical utility and rehabilitation tools*

### Features

| Feature | Priority | Status |
|---------|----------|--------|
| Cognitive exercises (memory) | P3 | Not Started |
| Cognitive exercises (attention) | P3 | Not Started |
| Cognitive exercises (word-finding) | P3 | Not Started |
| Exercise difficulty adaptation | P3 | Not Started |
| Speech practice recording | P3 | Not Started |
| Speech practice phrases | P3 | Not Started |
| Appointment tracker | P3 | Not Started |
| Questions for doctor notepad | P3 | Not Started |
| Export PDF report | P3 | Not Started |
| Vitals logging (BP, sugar) | P3 | Not Started |

### Milestones

1. **M4.1** — Cognitive exercises v1
2. **M4.2** — Speech practice functional
3. **M4.3** — Appointment tracker complete
4. **M4.4** — PDF export working
5. **M4.5** — Vitals logging complete
6. **M4.6** — Phase 4 feature complete

### Success Criteria

- [ ] 40% of users try cognitive exercises
- [ ] 3+ speech practice sessions/week per active user
- [ ] 25% export report before doctor visits

---

## Phase 5: Integrations

*Connect with external services and devices*

### Features

| Feature | Priority | Status |
|---------|----------|--------|
| Apple Health sync | P4 | Not Started |
| Google Fit sync | P4 | Not Started |
| Fitbit sync | P4 | Not Started |
| FAST stroke warning reminder | P4 | Not Started |
| Emergency contacts quick-dial | P4 | Not Started |
| Location sharing with caregiver | P4 | Not Started |
| Voice commands (navigation) | P4 | Not Started |
| Voice commands (logging) | P4 | Not Started |
| Telehealth video calls | P4 | Not Started |

### Milestones

1. **M5.1** — Apple Health integration
2. **M5.2** — Google Fit integration
3. **M5.3** — Emergency features complete
4. **M5.4** — Voice commands v1
5. **M5.5** — Telehealth integration
6. **M5.6** — Phase 5 feature complete

---

## Release Strategy

### MVP Release (Phase 1)

1. **Closed Beta** — 10-20 users (stroke survivors, caregivers)
2. **Feedback iteration** — 2-4 weeks
3. **Open Beta** — TestFlight (iOS), Play Store beta
4. **Public Launch** — App Store + Play Store

### Post-MVP Releases

- **Bi-weekly releases** for bug fixes
- **Monthly feature releases** for new functionality
- **Quarterly major releases** for new phases

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Push notifications unreliable on iOS | High | Test extensively, implement fallback checks |
| Content moderation overwhelming | Medium | Start with manual review, add AI flagging |
| Low initial engagement | Medium | Partner with stroke associations for launch |
| Accessibility issues | High | Test with actual stroke survivors early |
| App store rejection | Medium | Follow guidelines strictly, prepare appeals |

---

## Dependencies

### External Dependencies

| Dependency | Phase | Risk Level |
|------------|-------|------------|
| Expo SDK updates | All | Low |
| Push notification services | 1 | Medium |
| OpenFDA API (medicine data) | 1 | Low |
| App Store review process | 1 | Medium |
| Wearable APIs (Apple, Google, Fitbit) | 5 | High |
| Video SDK (Twilio/Agora) | 5 | Medium |

### Content Dependencies

| Content | Phase | Status |
|---------|-------|--------|
| 100+ Stroke Bites | 2 | Not Started |
| Symptom categories list | 2 | Not Started |
| Cognitive exercise content | 4 | Not Started |
| Speech practice phrases | 4 | Not Started |
| Seed community stories | 3 | Not Started |
