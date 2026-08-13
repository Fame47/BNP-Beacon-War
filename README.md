# Beacon Wars v194 — Nerdy Exchange

## v194 exchange update

- Adds the Nerdy Bundle (2,000 Credits normally / 1,200 Featured), Nerdy
  title, Nerdy frame, and Nerdy reaction.
- Keeps the two-row bundle layout and rotates the top position through Nerdy,
  Vulcan, and Klingon on the synchronized 30-minute exchange.
- Rotates Featured independently every 10 minutes. All players see the same
  stock because both rotations use fixed global epoch boundaries.
- Releases Commodore as a standalone frame and adds Delta, Ruby, Academy,
  Nerdy, and the supplied reaction variants to their rotating categories.
- Updates the Wood, Volt, and Emergent frame art without changing their
  progression unlock rules.

# Beacon Wars v193 — Commander Jamal

Production build based on the v192 clean-launch baseline, now with Commander
Jamal as the seventh playable commander.

## Commander Jamal

- Blue and red board pieces, setup card, command portrait, profile photo and
  commander voice are included.
- His stable internal ID is `jamal`, so saved games and multiplayer snapshots
  will continue to work if his visible name changes later.
- To rename him, edit only the `displayName` value marked
  `FUTURE NAME CHANGE` in `v193_commander_jamal.js`. Do not rename his internal
  ID or asset filenames.

## Reset guarantees

- New wallet balance: **0 credits**.
- New profile: Level 1, 0 XP, 0 matches and starter cosmetics only.
- No previous tester profile, campaign completion, redemptions or unlocks are
  included or migrated.
- v192 uses a fresh local-save namespace, so an older build opened in the same
  browser cannot restore its test wallet or progression into this release.
- Legacy 20,000-credit seed/debug grants and local-room prototype were removed.
- Online matches persist only their room outcome and local online W/L record;
  they award no credits and add no XP or general-match progression.
- The three local redemption codes remain one-use per local browser profile.
  They are intentionally not presented as tamper-proof until a server account
  economy is introduced.

## Launch

For the most reliable local test, serve this folder over HTTP instead of
double-clicking `index.html`:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. To force a clean browser reload, use
Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (macOS). To erase the v192 local
profile too, clear this site's storage in the browser's Developer Tools.

Online Match remains disabled until the new values are added to
`firebase-config.js` and the project is deployed. Host the production game over
HTTPS.

See `FIREBASE_SETUP.md` before enabling Online Match.
