---
name: Mobile App (React Native / Expo)
description: React Native Expo mobile app for ZeroPoint ERP — structure, navigation, API integration details
type: project
---

Mobile app created at `mobile/` using Expo SDK 52 + React Navigation.

**Why:** Provide Android mobile access to the existing ERP backend (same Express.js API on port 3001).

**How to apply:** When modifying mobile screens or adding new modules, follow the same patterns (Axios via `src/services/api.js`, AuthContext for JWT, useFocusEffect for data fetch on screen focus).

## Key Architecture Decisions
- API service: `mobile/src/services/api.js` — Axios instance with JWT interceptor, unwraps backend `{ data, message }` envelope automatically
- Auth: `mobile/src/context/AuthContext.js` — stores JWT in AsyncStorage, global `onAuthExpired` handler for 401s
- Navigation: Stack (AppNavigator) wraps auth flow; Bottom Tabs (MainNavigator) has 5 tabs; Sales + Purchases each have sub-stacks
- Detail/form screens registered on the root AppNavigator stack so they render above tabs
- List screens use `navigation.getParent()?.navigate()` to reach root stack for detail screens

## Screens (31 files total)
- Login, Dashboard, SalesHub, PurchasesHub
- Customers: List + Form (CRUD)
- Vendors: List + Form (CRUD)
- Products: List + Form (CRUD)
- Invoices: List + Detail (read-only)
- Sales Orders: List + Detail (read-only)
- Bills: List + Detail (read-only)
- Purchase Orders: List + Detail (read-only)

## Base URL Config
Hardcoded in `src/services/api.js` as `BASE_URL`. Default: `http://10.0.2.2:3001/api/v1` (Android emulator).

## Run Commands
```
cd mobile
npm install
npx expo start    # then press 'a' for Android
```
