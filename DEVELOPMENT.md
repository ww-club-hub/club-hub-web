# Development Instructions

1. Clone the repo

2. Download and start the Firebase Emulators:

   `npm install -g firebase`
   
   `npm run dev:firebase`
   
3. Start Cloudfare emulator (backend)

    Build if needed: `npm run build:cf`

   `npm run dev:cf`
   
   This is not needed if you do not plan to use any features which modify user roles
   
4. Start Vite (frontend)

    `npm run dev`

    ClubHub will be available on http://localhost:5173. Any changes you make will be instantly applied and hot reloaded.



## Deployment:

If Firestore rules were updated: `npm run deploy:firebase`

`npm run deploy:cf`
