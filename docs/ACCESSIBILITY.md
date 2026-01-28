# Strokecovery - Accessibility Requirements

## Why Accessibility is Critical

Stroke survivors commonly experience:

| Impairment | Prevalence | Impact on App Use |
|------------|------------|-------------------|
| **Motor impairment** | 80% of survivors | Difficulty with fine touch, one-handed use required |
| **Vision problems** | 60% of survivors | Need large text, high contrast |
| **Cognitive issues** | 50% of survivors | Need simple navigation, clear language |
| **Aphasia** | 25-40% of survivors | Difficulty reading/understanding text |
| **Fatigue** | 70% of survivors | Need quick interactions, minimal steps |

> **If the app isn't accessible, it fails the people who need it most.**

---

## Accessibility Standards

### Compliance Targets

| Standard | Level | Notes |
|----------|-------|-------|
| WCAG 2.1 | AA (minimum) | Web Content Accessibility Guidelines |
| iOS Accessibility | Full support | VoiceOver, Dynamic Type |
| Android Accessibility | Full support | TalkBack, Font scaling |
| Section 508 | Compliant | US federal accessibility standard |

---

## Motor Accessibility

### One-Handed Operation

| Requirement | Implementation |
|-------------|----------------|
| All primary actions reachable with thumb | Bottom navigation, FAB buttons |
| No simultaneous multi-touch required | Single tap for all actions |
| Large touch targets | Minimum 48x48dp (ideally 56x56dp) |
| Generous spacing between targets | Minimum 8dp between tappable elements |
| No time-limited interactions | No quick-tap games, no timeouts |

### Gesture Alternatives

| Gesture | Alternative Required |
|---------|---------------------|
| Swipe | Tap arrows or buttons |
| Pinch to zoom | Zoom buttons |
| Long press | Visible menu button |
| Drag and drop | Move up/down buttons |

### Hand Preference Setting

```
Settings → Accessibility → Preferred Hand
- Left hand (move controls to left side)
- Right hand (move controls to right side)
- No preference (default centered)
```

---

## Visual Accessibility

### Text Size

| Element | Minimum Size | With Large Text |
|---------|--------------|-----------------|
| Body text | 16sp | Scales to 24sp+ |
| Headings | 20sp | Scales to 32sp+ |
| Buttons | 16sp | Scales to 24sp+ |
| Labels | 14sp | Scales to 20sp+ |

### Dynamic Type Support

```javascript
// React Native example
import { useWindowDimensions } from 'react-native';

// Support system font scaling
<Text style={{ fontSize: 16 }} allowFontScaling={true}>
  This text scales with system settings
</Text>
```

### Color and Contrast

| Requirement | Specification |
|-------------|---------------|
| Text contrast ratio | Minimum 4.5:1 (AA), target 7:1 (AAA) |
| Large text contrast | Minimum 3:1 |
| Don't rely on color alone | Use icons, patterns, labels |
| Support dark mode | Full dark theme available |
| High contrast mode | Optional extra-high contrast theme |

### Color Palette (Accessible)

```
Primary:      #1565C0 (Blue)     - Passes on white
Secondary:    #2E7D32 (Green)    - Passes on white
Error:        #C62828 (Red)      - Passes on white
Warning:      #E65100 (Orange)   - Use with dark text
Success:      #1B5E20 (Green)    - Passes on white
Text:         #212121 (Dark)     - High contrast
Background:   #FFFFFF (White)    - Clean base
```

### High Contrast Mode

```
Text:         #000000 (Black)
Background:   #FFFFFF (White)
Links:        #0000EE (Blue, underlined)
Borders:      2px solid #000000
```

---

## Cognitive Accessibility

### Simple Language

| Guideline | Example |
|-----------|---------|
| Use plain language | "Take your medicine" not "Administer medication" |
| Short sentences | Maximum 15-20 words |
| Reading level | 6th-8th grade (Flesch-Kincaid) |
| Avoid jargon | Explain medical terms when necessary |
| Consistent terminology | Always "medicine" not sometimes "medication" |

### Clear Navigation

| Requirement | Implementation |
|-------------|----------------|
| Predictable layout | Same navigation on every screen |
| Visible current location | Highlighted tab, breadcrumbs |
| Back button always visible | Standard back navigation |
| Maximum 3 taps to any feature | Flat navigation hierarchy |
| No hidden menus | All options visible |

### Reduced Cognitive Load

| Guideline | Implementation |
|-----------|----------------|
| One task per screen | Don't combine medicine + therapy on one screen |
| Clear call to action | One primary button per screen |
| Progress indicators | Show step 2 of 4 |
| Confirmation dialogs | "Are you sure?" for destructive actions |
| Undo option | Allow mistakes to be corrected |

### Memory Aids

| Feature | Purpose |
|---------|---------|
| Persistent state | App remembers where user left off |
| Recent items | Quick access to frequently used items |
| Auto-fill | Remember common inputs |
| Reminders | Push notifications for tasks |

---

## Aphasia-Friendly Design

### Icon-First Design

| Action | Text | Icon |
|--------|------|------|
| Add medicine | "Add" | ➕ |
| View calendar | "Calendar" | 📅 |
| Log mood | "Mood" | 😊 |
| Get help | "Help" | ❓ |

### Visual Communication

- Use recognizable icons alongside text
- Support image-based input where possible
- Provide audio playback of instructions
- Use color coding consistently (green = good, red = attention)

### Text-to-Speech

```
Every screen should support:
- VoiceOver (iOS)
- TalkBack (Android)
- Custom "Read aloud" button for key content
```

---

## Hearing Accessibility

| Requirement | Implementation |
|-------------|----------------|
| No audio-only information | Always provide text alternative |
| Visual notification indicators | Flash, badge, vibration |
| Captions for any video content | Required for all video |
| Customizable notification sounds | Multiple sound options |

---

## Settings Panel

### Accessibility Settings Menu

```
Settings → Accessibility

VISION
├── Text Size          [Small | Medium | Large | Extra Large]
├── High Contrast      [Off | On]
├── Dark Mode          [Off | On | System]
├── Bold Text          [Off | On]
└── Reduce Motion      [Off | On]

MOTOR
├── Preferred Hand     [Left | Right | No Preference]
├── Touch Target Size  [Standard | Large | Extra Large]
├── Button Delay       [Off | Short | Long] (prevents accidental taps)
└── Gesture Hints      [Off | On] (show swipe alternatives)

COGNITIVE
├── Simple Mode        [Off | On] (hides advanced features)
├── Reading Assistance [Off | On] (larger text, more spacing)
└── Confirmation Prompts [Off | On] (confirm before actions)

AUDIO
├── Sound Effects      [Off | On]
├── Vibration          [Off | On]
└── Voice Readback     [Off | On] (reads confirmations aloud)
```

---

## Testing Requirements

### Manual Testing

| Test | Frequency |
|------|-----------|
| One-handed use (left) | Every release |
| One-handed use (right) | Every release |
| Largest text size | Every release |
| High contrast mode | Every release |
| Screen reader (VoiceOver) | Every release |
| Screen reader (TalkBack) | Every release |

### User Testing

| Group | Frequency |
|-------|-----------|
| Stroke survivors (various impairments) | Quarterly |
| Caregivers (older adults) | Quarterly |
| Occupational therapists | Before major releases |

### Automated Testing

| Tool | Purpose |
|------|---------|
| axe DevTools | Automated accessibility scanning |
| Lighthouse | Web accessibility audit |
| Accessibility Inspector (iOS) | iOS-specific testing |
| Accessibility Scanner (Android) | Android-specific testing |

---

## Implementation Checklist

### Phase 1 MVP

- [ ] Minimum 48x48dp touch targets
- [ ] Text scales with system settings
- [ ] High contrast color palette
- [ ] Screen reader labels on all elements
- [ ] One-handed bottom navigation
- [ ] Simple, consistent navigation
- [ ] Large text option in settings

### Phase 2

- [ ] High contrast mode toggle
- [ ] Preferred hand setting
- [ ] Simple mode option
- [ ] Voice readback for confirmations
- [ ] Icon + text for all actions

### Phase 3+

- [ ] Full VoiceOver/TalkBack audit
- [ ] Aphasia-friendly mode
- [ ] Voice command input
- [ ] Comprehensive accessibility settings panel

---

## Resources

### Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Apple Accessibility](https://developer.apple.com/accessibility/)
- [Android Accessibility](https://developer.android.com/guide/topics/ui/accessibility)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Stark (Figma plugin)](https://www.getstark.co/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### Research
- Stroke Association accessibility guidelines
- Aphasia-friendly communication research
- Universal Design principles
