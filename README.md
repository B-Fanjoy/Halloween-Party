# Halloween Party Safe / Not Safe App

A shared party game where players join on their phones and the admin assigns their status live.

## How it works

- Players enter their name on the landing page.
- Their data is stored in a shared backend database, not in the browser.
- The admin logs in separately and can mark each player as:
  - Safe
  - Not Safe
  - Waiting
- The player's screen updates automatically without a page refresh.

## Admin login

- Username: `admin`
- Password: `halloween`

## Run locally

1. Install dependencies:
   - `npm install`
2. Copy `.env.example` to `.env` and update values if needed.
3. Start the server:
   - `npm start`
4. Open:
   - `http://localhost:3000`

## Public hosting setup

This app is designed to support a public setup beyond your local network:

- The frontend can be served from GitHub Pages or any static host.
- The API and database must be hosted on a machine or service that is reachable by the public.
- In `config.js`, set:
  - `window.HALLOWEEN_APP_CONFIG.apiBaseUrl = 'https://your-public-backend-url';`

If you keep the frontend and backend on the same machine, you can leave it blank and the app will use relative `/api/...` routes.

## Exposing your PC to the internet

If you want to run the backend from your own PC and let outside users access it:

1. Start the app with `npm start`.
2. Expose port `3000` using one of these methods:
   - router port forwarding
   - ngrok
   - Cloudflare Tunnel
3. Update `config.js` to point at the public tunnel URL.

Example:

```js
window.HALLOWEEN_APP_CONFIG = {
  apiBaseUrl: 'https://abc123.ngrok-free.app'
};
```

## Notes

- The app currently runs a shared Express + SQLite backend for multi-device play.
- For production or long-term sharing, a hosted backend and a managed database are more reliable than running everything from a home PC.
