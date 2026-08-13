# Beacon Wars v192 — clean Firebase setup

This release contains **no old Firebase project credentials**. Online Match is
the only feature that loads Firebase; a player who never opens Online Match
causes no Firebase initialization, authentication, Firestore read, or listener.

## Create the new project

1. Create a new Firebase project and add a **Web app**.
2. Enable **Authentication > Anonymous**.
3. Create a **Cloud Firestore** database in Production mode. Choose the region
   carefully; this is difficult to change later.
4. Copy the Web app values into `firebase-config.js`.
5. Copy `.firebaserc.example` to `.firebaserc` and replace
   `PASTE_NEW_PROJECT_ID`.
6. Install/login to the Firebase CLI, then run:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,hosting
   ```

## Enable room cleanup

Rooms carry an `expiresAt` timestamp six hours after creation. Enable Firestore
TTL for the `rooms` collection group and `expiresAt` field:

```bash
gcloud firestore fields ttls update expiresAt \
  --collection-group=rooms \
  --enable-ttl \
  --project=PASTE_NEW_PROJECT_ID
```

TTL deletion is asynchronous. No room subcollections are used, so cleanup does
not leave move-history documents behind.

## Enable App Check after Hosting works

1. Create a score-based reCAPTCHA Enterprise Web key for the production domain.
2. Register the Web app under **Firebase > App Check**.
3. Paste the site key into `firebase-config.js` as `appCheckSiteKey`.
4. Deploy and monitor App Check metrics.
5. Enable enforcement for Firestore only after legitimate traffic is verified.

Do not register a production reCAPTCHA key for `localhost`. Use Firebase's App
Check debug provider during local development if enforcement is enabled.

## Cost and security behavior

- Firebase SDK/config files load only after the player opens Online Match.
- One compact room listener is active only while the online room is active.
- There is one room write per committed turn; the old redundant pre-commit read
  and move-history subcollection write were removed.
- No Firebase wallet or XP fields exist in this release.
- Online battles grant zero credits and zero XP. Only local online W/L counters
  are updated for the existing online frame progression.
- Firestore rules deny collection listing, deny all subcollections, restrict
  room fields/types/sizes, and deny every collection outside `rooms`.
- The Firebase Web API key is a public identifier. Never place service-account
  JSON, Admin SDK credentials, private keys, or redemption secrets in this ZIP.

Set Google Cloud budget alerts before launch. Alerts notify you; they are not a
hard spending cap.
