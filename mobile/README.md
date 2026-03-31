# ZeroPoint Accounting - Mobile App

React Native (Expo) Android mobile app for the ZeroPoint Accounting ERP system.

## Prerequisites

- Node.js 18+
- npm or yarn
- Android Studio with an emulator, or a physical Android device
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`

## Setup

```bash
cd mobile
npm install
```

### Configure API URL

Copy `.env.example` to `.env` and set your API URL:

```bash
cp .env.example .env
```

**Important:** The API URL is hardcoded in `src/services/api.js` for simplicity. Update the `BASE_URL` constant there:

- **Android Emulator:** `http://10.0.2.2:3001/api/v1` (default)
- **Physical device on same WiFi:** `http://<your-computer-ip>:3001/api/v1`
- **Production:** `https://candydada.com/api/v1`

### Backend CORS

Make sure the backend allows requests from the mobile app. Add the Expo dev URL to CORS origins in `backend/.env`:

```
CORS_ORIGIN=http://localhost:3000,http://10.0.2.2:3000,exp://192.168.1.100:8081
```

## Run Development Server

```bash
npx expo start
```

Then press `a` to open on Android emulator, or scan the QR code with Expo Go on your phone.

## Build APK (Production)

### Option 1: EAS Build (Recommended)

```bash
# Login to Expo
npx eas login

# Configure project (first time only)
npx eas build:configure

# Build APK for Android
npx eas build --platform android --profile preview
```

The APK will be available for download from the EAS dashboard.

### Option 2: Local Build

```bash
# Generate native Android project
npx expo prebuild --platform android

# Build APK
cd android
./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`.

## Project Structure

```
mobile/
  App.js                          # Root component
  app.json                        # Expo config
  package.json                    # Dependencies
  eas.json                        # EAS Build config
  babel.config.js                 # Babel config
  src/
    context/
      AuthContext.js               # Auth state (login/logout/token)
    services/
      api.js                       # Axios API client + all endpoint methods
    navigation/
      AppNavigator.js              # Root stack (Login vs Main)
      MainNavigator.js             # Bottom tab navigator
      SalesTabNavigator.js         # Sales sub-stack
      PurchasesTabNavigator.js     # Purchases sub-stack
    screens/
      LoginScreen.js               # Login form
      DashboardScreen.js           # Summary cards
      SalesHubScreen.js            # Sales module menu
      PurchasesHubScreen.js        # Purchases module menu
      customers/
        CustomerListScreen.js      # Customer list with search
        CustomerFormScreen.js      # Create/edit customer
      vendors/
        VendorListScreen.js        # Vendor list with search
        VendorFormScreen.js        # Create/edit vendor
      products/
        ProductListScreen.js       # Product list with search
        ProductFormScreen.js       # Create/edit product
      invoices/
        InvoiceListScreen.js       # Invoice list
        InvoiceDetailScreen.js     # Invoice detail view
      sales-orders/
        SalesOrderListScreen.js    # Sales order list
        SalesOrderDetailScreen.js  # Sales order detail view
      bills/
        BillListScreen.js          # Bill list
        BillDetailScreen.js        # Bill detail view
      purchase-orders/
        PurchaseOrderListScreen.js # Purchase order list
        PurchaseOrderDetailScreen.js # PO detail view
```

## Features

- JWT authentication with secure token storage
- Dashboard with real-time financial summaries
- Full CRUD for Customers, Vendors, and Products
- View Invoices, Sales Orders, Bills, and Purchase Orders with detail screens
- Pull-to-refresh on all list screens
- Search functionality on entity lists
- Professional finance-app styling
- Loading states and error handling throughout

## API Endpoints Used

All endpoints are relative to the base URL (e.g., `http://localhost:3001/api/v1`):

| Module          | Endpoints                                    |
|-----------------|----------------------------------------------|
| Auth            | POST /auth/login                             |
| Dashboard       | GET /reports/dashboard                       |
| Customers       | GET/POST /customers, GET/PUT/DELETE /:id     |
| Vendors         | GET/POST /vendors, GET/PUT/DELETE /:id       |
| Products        | GET/POST /products, GET/PUT/DELETE /:id      |
| Invoices        | GET /invoices, GET /invoices/:id             |
| Sales Orders    | GET /sales-orders, GET /sales-orders/:id     |
| Bills           | GET /bills, GET /bills/:id                   |
| Purchase Orders | GET /purchase-orders, GET /purchase-orders/:id|
