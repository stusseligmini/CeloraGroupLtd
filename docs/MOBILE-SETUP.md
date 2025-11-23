# 📱 Celora Mobile App Setup Guide

## Overview

The Celora mobile app is built with React Native and shares code with the web application for maximum efficiency.

## Prerequisites

- Node.js ≥ 20.0.0
- React Native CLI
- For iOS: Xcode 14+ and CocoaPods
- For Android: Android Studio and Java 11+

## Installation

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. iOS Setup

```bash
cd ios
pod install
cd ..
```

### 3. Android Setup

Ensure you have Android SDK installed and `ANDROID_HOME` environment variable set.

## Configuration

### Environment Variables

Create `.env` file in the `mobile/` directory:

```env
API_BASE_URL=https://your-api.celora.com
WALLETCONNECT_PROJECT_ID=your_project_id
```

### Firebase Setup (for Push Notifications)

#### iOS

1. Download `GoogleService-Info.plist` from Firebase Console
2. Place in `mobile/ios/` directory
3. Add to Xcode project

#### Android

1. Download `google-services.json` from Firebase Console
2. Place in `mobile/android/app/` directory

## Running the App

### iOS

```bash
npm run ios
```

Or open `mobile/ios/Celora.xcworkspace` in Xcode and run.

### Android

```bash
npm run android
```

Or open `mobile/android` in Android Studio and run.

## Features

### Biometric Authentication

The app uses `react-native-biometrics` for Face ID/Touch ID/Fingerprint authentication.

**Implementation:**
- See `mobile/src/native/BiometricService.ts`
- Automatically detects available biometry type
- Falls back to PIN if biometrics not available

### QR Code Scanning

Uses `react-native-camera` for QR code scanning of wallet addresses.

**Supported Formats:**
- Bitcoin: `bitcoin:address?amount=X`
- Ethereum: `ethereum:address`
- Solana: `solana:address?amount=X`
- Plain addresses

### Push Notifications

Firebase Cloud Messaging (FCM) for Android and Apple Push Notification Service (APNS) for iOS.

**Setup:**
- Tokens automatically registered on app launch
- Handled by `PushNotificationService`
- Background notifications supported

## Code Sharing with Web

The mobile app shares the following with the web application:

- **Validation**: `../src/lib/validation/*`
- **Types**: `../src/types/*`
- **API Client**: `../src/lib/apiClient.ts`

Configured via Metro bundler in `metro.config.js`.

## Building for Production

### iOS

1. Update version in `ios/Celora/Info.plist`
2. Archive in Xcode
3. Upload to App Store Connect

### Android

1. Update version in `android/app/build.gradle`
2. Generate signed APK/AAB:

```bash
cd android
./gradlew assembleRelease
# or
./gradlew bundleRelease
```

## Troubleshooting

### iOS Build Fails

- Clean build folder: Product → Clean Build Folder
- Delete `ios/Pods` and run `pod install` again
- Update CocoaPods: `sudo gem install cocoapods`

### Android Build Fails

- Clean Gradle cache: `cd android && ./gradlew clean`
- Invalidate Android Studio caches
- Check Java version: `java -version` (should be 11)

### Metro Bundler Issues

```bash
npm start -- --reset-cache
```

## Testing

```bash
npm test
```

## Deployment

See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for details on deploying to app stores.

## Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Navigation](https://reactnavigation.org/)

