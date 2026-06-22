# Code Signing & Distribution Guide - Shyoski

To distribute the **Shyoski** desktop client publicly without users running into security blockers (like macOS Gatekeeper or Windows SmartScreen), you must digitally sign the binaries.

---

## 1. macOS Code Signing & Notarization

To sign your app for macOS, you need:
1. An **Apple Developer Account** ($99/year).
2. A macOS machine to run the build.

### Step A: Generate Certificates
1. Open **Xcode** on your Mac.
2. Go to **Settings > Accounts** and sign in with your Apple ID.
3. Click **Manage Certificates...**
4. Click the `+` button and select **Developer ID Application**. Xcode will generate and install the certificate into your system Keychain.

### Step B: Create an App-Specific Password (for Notarization)
To allow Apple to scan your app for malware and approve it (Notarization), create an app-specific password:
1. Log in to [appleid.apple.com](https://appleid.apple.com).
2. Go to **Sign-In and Security > App-Specific Passwords** and click `+`.
3. Label it (e.g., `shyoski-builder`) and save the generated password.

### Step C: Build & Sign via Environment Variables
`electron-builder` automatically detects code signing certificates in your macOS Keychain and handles Apple Notarization via `notarytool` using the following environment variables:

```bash
# Your Apple ID email address
export APPLE_ID="developer@yourdomain.com"

# The app-specific password generated in Step B
export APPLE_ID_PASSWORD="abcd-efgh-ijkl-mnop"

# Your Apple Developer 10-character Team ID (found on developer.apple.com Membership page)
export APPLE_TEAM_ID="X84JKD84LA"
```

Once exported, run:
```bash
npm run dist:mac
```
The output signed DMG will be in `/dist/Shyoski-1.0.0.dmg`.

---

## 2. Windows Code Signing

To sign your app for Windows, you need a **Windows Code Signing Certificate** (typically a `.pfx` file) from an authorized Certificate Authority (like DigiCert or Sectigo).

### Step A: Standard Certificate Setup
If you have a standard certificate file:
1. Store the `.pfx` file securely on your computer or build machine.
2. Export the path to the certificate and password:

```bash
# Path to your .pfx certificate file
export CSC_LINK="/Users/kmanjunath/certs/win_cert.pfx"

# Password for the .pfx file
export CSC_KEY_PASSWORD="YourPFXPasswordHere"
```

### Step B: EV (Extended Validation) Certificate
If you are distributing commercially, an **EV Code Signing Certificate** is highly recommended because it immediately establishes trust with Windows SmartScreen (no "Windows protected your PC" alert on install). 
* EV Certificates are stored on physical USB hardware tokens.
* `electron-builder` automatically integrates with Windows hardware token drivers when compiling from a Windows machine.

Once configured, run:
```bash
npm run dist:win
```
The installer executable will be generated in `/dist/Shyoski Setup 1.0.0.exe`.

---

## 3. Production Deployment Checks

When ready for release, edit the workspace root `.env` to point the client to your production backend API hosted on Railway, Render, or AWS:

```env
# Change from localhost:5005 to your cloud API endpoint
BACKEND_URL=https://api.shyoski.yourdomain.com
```
When compiled, this production backend URL is baked into the executable.
