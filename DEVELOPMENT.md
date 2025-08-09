# Development Instructions

1. Clone the repo

2. Download and start the Firebase Emulators:

   `npm install -g firebase`

   `npm run dev:firebase`

3. Start Vite (frontend) + Cloudflare (backend)

    `npm run dev`

    ClubHub will be available on http://localhost:5173. Any changes you make will be instantly applied and hot reloaded.


## Deployment:

If Firestore rules were updated: `npm run deploy:firebase`

`npm run deploy:cf`
