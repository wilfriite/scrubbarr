# 🔄 Scrubbarr Workflow Documentation

This document describes the end-to-step lifecycle of a media item within the Scrubbarr ecosystem.

## 🏗️ Architecture Overview

Scrubbarr operates as an automated bridge between your media stack:

- **Jellyfin**: Source of truth for libraries, users, favorites, and playback status.
- **Jellyseerr**: Source for media requests and ownership.
- **Radarr/Sonarr**: Handlers for physical file management and deletion.

---

## 🛰️ Phase 1: Synchronization

**Commands**: `node ace sync:users` & `node ace sync:libraries`

Before making any decisions, Scrubbarr updates its local knowledge:

- **Libraries**: Fetches all active libraries from Jellyfin.
  - _Safety Note_: New libraries are added as **Inactive** by default. You must explicitly enable them in the database to allow scanning.
- **Users**: Fetches **all** users from Jellyfin and attempts to link them to Jellyseerr accounts.
  - _Optional Jellyseerr_: If Jellyseerr is not configured, Scrubbarr only syncs Jellyfin users. Strategies like "Everyone Must See" will still work perfectly.

---

## 🔍 Phase 2: Audit & Marking

**Command**: `node ace verify:media`

Scrubbarr scans your libraries to identify candidates for deletion. Each media item passes through a series of filters:

1.  **Global Favorites Protection**: If **any** user has marked the item as a favorite on Jellyfin, it is immediately skipped.
2.  **Age Threshold**: The item must have been on the server for at least `MEDIA_MIN_AGE_DAYS` (configured in `.env`).
3.  **Strategy Validation**: The active strategy (defined by `MEDIA_CHECK_STRATEGY`) is applied:
    - **Everyone Must See**: Every synced user must have the "Played" status on Jellyfin.
    - **Only Requester Must See**: Only the original Jellyseerr requester (or Admin fallback) must have the "Played" status.

**Outcome**: If an item fails the strategy, it is placed in the **Media Queue** (The Jail) with a planned deletion date based on the library's grace period.

---

## ⚖️ Phase 3: The Grace Period (Queue Check)

**Command**: `node ace check:queue`

Items in the queue are re-evaluated regularly to allow for "pardons":

- **Active Playback**: If the item is currently being watched, the deletion date is postponed.
- **New Favorites**: If a user marks a queued item as a favorite, it is immediately removed from the queue and moved to history as `AUTO_SAVED`.
- **Strategy Re-evaluation**: If the conditions of the strategy are now met (e.g., the last person finally watched the movie), the item is saved.

---

## 💀 Phase 4: Final Deletion (The Process)

**Command**: `node ace process:deletion`

When the grace period expires, Scrubbarr executes the final step:

1.  **Ultimate Safety Check**: A final real-time check is performed on Jellyfin. If someone is watching the media at the exact moment of execution, the deletion is postponed by 24 hours.
2.  **API Execution**: Scrubbarr sends a `DELETE` command to the appropriate service:
    - **Radarr**: For items in "movies" libraries (using TMDB ID).
    - **Sonarr**: For items in "tvshows" libraries (using TVDB ID).
3.  **Archiving**: The record is removed from the Queue and a permanent `DELETED` entry is created in the **Media History**.

---

## ⏰ Suggested Automation Order

To ensure a smooth workflow, tasks should be scheduled in this sequence:

1. `sync:users` / `sync:libraries` (Refresh data)
2. `verify:media` (Identify new candidates)
3. `check:queue` (Re-verify pending candidates)
4. `process:deletion` (Execute confirmed deletions)
