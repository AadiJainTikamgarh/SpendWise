# SpendWise 💰

**SpendWise** is a personal finance and expense tracking Android application built using **React Native**, **Expo SDK 58**, and **Expo Router**.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or newer recommended, v24+ supported)
- **npm** (or `bun` / `pnpm` / `yarn`)
- **Android Studio** (for local Android Emulator) OR an **Android device** with the **Expo Go** app installed from Google Play.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run on Android

#### Option A: Android Emulator or Connected USB Device
Make sure your Android emulator is running or your Android device is connected via USB debugging:
```bash
npm run android
```

#### Option B: Scan QR code with Expo Go
```bash
npx expo start
```
Press `a` in the terminal to launch the Android emulator directly, or scan the QR code with the Expo Go app on your Android phone.

---

## 🛠️ Project Structure

```
SpendWise/
├── app.json               # Expo configuration (App name, Android package, icons)
├── eas.json               # EAS Build configuration (APK, AAB, internal testing)
├── tsconfig.json          # TypeScript configuration
├── eslint.config.js       # ESLint configuration
├── assets/                # App icons, splash screens, and images
└── src/
    ├── app/               # Expo Router screens (file-based navigation)
    │   ├── _layout.tsx    # Root layout & tab navigator
    │   ├── index.tsx      # Home screen (Dashboard)
    │   └── explore.tsx    # Explore / Details screen
    ├── components/        # Reusable UI components
    ├── constants/         # Theme colors, spacing, and constants
    └── hooks/             # Custom React hooks
```

---

## 📱 Android Build & Deployment

This project is pre-configured with `eas.json` for **EAS Build**:

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Log in to Expo
```bash
eas login
```

### 3. Generate a Standalone Android APK (for testing on devices)
```bash
eas build --platform android --profile preview
```

### 4. Build Android App Bundle (AAB for Google Play Store)
```bash
eas build --platform android --profile production
```

---

## 🧪 Quality & Verification Commands

```bash
# Typecheck TypeScript
npx tsc --noEmit

# Lint code
npm run lint

# Check Expo dependencies & config
npx expo-doctor
```
