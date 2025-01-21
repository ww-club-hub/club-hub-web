# Development Instructions

1. Clone the repo

2. Download and start the Firebase Emulators:

   `npm install -g firebase`
   
   `npm run firebase`
   
3. Choose a development option:

## With Cloudflare Functions

The Cloudflare Pages functions are needed for:
1. Creating schools
2. Searching for schools
3. Joining schools
4. Modifying school admins/owners

(These actions require changing the user's ID token, which can only be done through the Firebase Admin API)

Unfortunately, Wrangler (the Cloudflare ClI/emulator) doesn't really behave that well with Vite: https://github.com/cloudflare/workers-sdk/issues/5315

First, start Vite in watch mode:

`npm run build-watch`

Next, start the CF Pages emulator:

`npm run dev-cf`

ClubHub will be available on http://localhost:8788. Any changes you make will trigger a rebuild. You may need to reload 2-3 times to see your changes.

## Without Cloudflare Functions

If you have a user that has already joined a school, you don't technically need any backend, and you can run Vite by itself:

`npm run dev`

ClubHub will be available on http://localhost:5173. Any changes you make will be instantly applied and hot reloaded.
