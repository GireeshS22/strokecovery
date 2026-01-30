# Mobile App Deployment Guide

---

## ⚠️ CRITICAL: API URL Configuration

**Before building an APK to share with others, you MUST update the API URL.**

### What is the API URL?

```
┌─────────────────────┐                    ┌─────────────────────┐
│   MOBILE APP        │ ── needs to ───►   │   BACKEND SERVER    │
│   (on user's phone) │    find            │   (your FastAPI)    │
└─────────────────────┘                    └─────────────────────┘
        │                                           │
        │                                           │
   The app needs                              Where is the
   the API URL to                             server running?
   talk to the server
```

### The Problem

| Situation | API URL | Works? |
|-----------|---------|--------|
| Local testing (your phone + your computer on same WiFi) | `http://192.168.1.11:8000` | ✅ Yes |
| APK shared with someone else | `http://192.168.1.11:8000` | ❌ NO! |
| APK with deployed backend | `https://api.strokecovery.com` | ✅ Yes |

**Why doesn't local IP work for others?**
- `192.168.1.11` is YOUR computer's address on YOUR WiFi
- Other people's phones cannot reach your computer
- You need a public URL that works from anywhere

---

## Before Building APK: Checklist

### Step 1: Deploy Your Backend First

Deploy the FastAPI backend to a cloud service:

| Service | Free Tier | Guide |
|---------|-----------|-------|
| Railway | 500 hours/month | https://railway.app |
| Render | 750 hours/month | https://render.com |
| Fly.io | 3 shared VMs | https://fly.io |

After deploying, you'll get a URL like:
- `https://strokecovery-api.railway.app`
- `https://strokecovery-api.onrender.com`

### Step 2: Update the API URL in Mobile App

Edit the file: `mobile/constants/config.ts`

```typescript
// BEFORE (local testing only)
export const API_URL = 'http://192.168.1.11:8000';

// AFTER (for APK distribution)
export const API_URL = 'https://your-deployed-backend.railway.app';
```

### Step 3: Build the APK

```bash
cd mobile
eas build --platform android --profile preview
```

---

## API URL Quick Reference

| Environment | URL to Use | File to Edit |
|-------------|------------|--------------|
| Local development (your phone) | `http://YOUR_COMPUTER_IP:8000` | `mobile/constants/config.ts` |
| Android Emulator | `http://10.0.2.2:8000` | `mobile/constants/config.ts` |
| Production APK | `https://your-api.railway.app` | `mobile/constants/config.ts` |

---

## How to Find Your Computer's IP (for local testing)

### Windows
```bash
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
# Example: 192.168.1.11
```

### Mac/Linux
```bash
ifconfig | grep "inet "
# or
ip addr show
```

---

## Common Mistakes

### ❌ Mistake 1: Using localhost
```typescript
// WRONG - phone can't understand "localhost"
export const API_URL = 'http://localhost:8000';
```

### ❌ Mistake 2: Sharing APK with local IP
```typescript
// WRONG - only works on YOUR WiFi network
export const API_URL = 'http://192.168.1.11:8000';
```

### ✅ Correct: Using deployed backend URL
```typescript
// CORRECT - works everywhere
export const API_URL = 'https://strokecovery-api.railway.app';
```

---

## Building the APK

### Prerequisites
1. Expo account (free): https://expo.dev
2. EAS CLI installed: `npm install -g eas-cli`
3. Logged in: `eas login`

### Build Commands

```bash
cd mobile

# First time only - configure build
eas build:configure

# Build APK for testing (shareable)
eas build --platform android --profile preview

# Build AAB for Google Play Store
eas build --platform android --profile production
```

### Build Profiles

| Profile | Output | Use For |
|---------|--------|---------|
| `development` | Development build | Testing with Expo Dev Client |
| `preview` | APK file | Share with testers directly |
| `production` | AAB file | Upload to Google Play Store |

---

## After Building

1. EAS will give you a download link for the APK
2. Share that link with testers
3. They install the APK on their Android phones
4. Make sure your backend is deployed and running!

---

## Troubleshooting

### App shows "Network Error" or spins forever
- Backend is not deployed, or
- API URL is wrong in config.ts, or
- Backend server is down

### App works on my phone but not others
- You're using local IP (`192.168.x.x`) instead of deployed URL
- Deploy your backend first!

### Can't build APK
- Run `eas login` first
- Check you have internet connection
- Run `eas build:configure` if first time
