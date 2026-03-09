# Scrubbarr — Workflow

## Overview

Scrubbarr bridges your media stack to automate cleanup:

- **Jellyfin** — source of truth for libraries, users, favorites, and playback
- **Jellyseerr** — source for media request ownership (optional)
- **Radarr / Sonarr** — handles physical file deletion

---

## Steps

### 1. Sync — `sync:users` & `sync:libraries`

Refresh local data from Jellyfin (and Jellyseerr if configured).
New libraries are added as **inactive** by default — enable them manually in the DB.

### 2. Verify — `verify:media`

Scan active libraries and queue media candidates for deletion. Each item goes through:

1. **Favorites** — skip if any user has favorited it in Jellyfin
2. **Age** — skip if added less than `MEDIA_MIN_AGE_DAYS` ago (`.env`)
3. **Manual keep** — skip if a user already manually kept it (history `MANUAL_KEEP`)
4. **Strategy** — queue it if the active strategy says it hasn't been sufficiently watched:
   - `everyone_must_see`: every synced user must have played it
   - `only_requester_must_see`: only the Jellyseerr requester (or admin fallback)

Items that fail are added to the **deletion queue** with a grace period countdown.

### 3. Check Queue — `check:queue`

Re-evaluate queued items to allow "pardons":

- **Active playback** — postpone deletion (1 week for movies, 1 month for shows)
- **New favorite** — remove from queue, archive as `AUTO_SAVED`
- **Strategy now passes** — remove from queue, archive as `AUTO_SAVED`

### 4. Process — `process:deletion`

Execute deletions for items whose grace period has expired:

1. Final real-time playback check — postpone 24h if someone is watching
2. Delete via **Radarr** (movies, TMDB ID) or **Sonarr** (shows, TVDB ID)
3. Archive as `DELETED` in history, remove from queue

---

## Suggested Schedule

```
sync:users / sync:libraries  →  verify:media  →  check:queue  →  process:deletion
```
