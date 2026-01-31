# Media Cleanup Strategies Documentation

This document describes the decision-making logic used by the `verify:media` command to determine if a media item is eligible for deletion.

## Architecture Overview

The system follows a Strategy Pattern (Hexagonal Architecture). The core logic remains agnostic of the specific rules; it simply queries an implementation of the `MediaCheckStrategy` to receive a boolean verdict.

## Explanation

The app uses a 3-step process to determine if a media item is eligible for deletion:

1. Check if a media item is a **favorite** for any Jellyfin user (this may be unnecessary, but I like to keep my favorites to review later).

2. Check if a media has been **present on Jellyfin** for a certain amount of time (this is configurable), we don't want to remove a movie that has been available for a short time.

3. Check a media against the **strategy selected by the user** (see below). Each strategy uses its own logic to determine if a media is eligible for deletion based on the state of the media (if it has been watched by a specific user, if it has been played a certain amount of times, etc.)

### Currently Implemented Strategies

**1. "Only Requester must see" Strategy**

**Description**: Focuses on the "Owner" (or "Requester" as called in this context) of the media.

**Logic**: It identifies who requested the media via Jellyseerr. If no requester is found (manual download on *arr or via automated app connected to Jellyseerr instead of Jellyfin like Suggestarr (this last case causes the suggestarr user to not have a Jellyfin account, thus we can't track if he watched the media he requested)), it fallbacks to the Admin user.

**Verdict**: The media is marked for deletion ONLY if the specific requester has marked it as "Played".

**Best For**: Private servers where users are responsible for their own requests.

**2. "Everyone must see" Strategy** (Status: implemented)

**Internal Name**: EveryoneMustSeeStrategy

**Description**: Ensures total consensus before deletion.

**Logic**: Iterates through every active user in the database.

**Verdict**: If even a single user has not finished the media, the deletion is aborted. It requires a 100% "Played" status across the board.

**Best For**: Close-knit groups or families watching the same content.

### Future Strategy Roadmap

The following strategies are proposed to handle more complex social dynamics or storage constraints.

**3. "Active Users Only must see" Strategy** (Status: Proposed)

**Concept**: A variation of the "Everyone" strategy that ignores "ghost" users.

**Logic**: Filters the user list to include only those with a last_login_at within the last 30 days.

**Pros**: Prevents an inactive friend's account from blocking the cleanup of the entire server.


**4. "Popularity Threshold" Strategy** (Status: Proposed)

Concept: Deletion based on democratic consensus rather than unanimity.

Logic: Calculates the ratio: total_active_usersusers_who_played​×100.

Verdict: Eligible for deletion if the ratio exceeds a configurable threshold (e.g., 75%).

Pros: Highly efficient for large servers where it is unlikely that literally everyone will watch every item.


**5. "Time Limited Retention" Strategy** (Status: Proposed)

Concept: Fixed-term shelf life, regardless of watch status.

Logic: Ignores the "Played" status entirely. It compares the current date with the DateCreated field.

Verdict: Eligible for deletion once the media reaches a certain age (e.g., 90 days).

Pros: Guarantees predictable storage rotation. Perfect for "Watch it or lose it" policies.


## Configuration

The active strategy is toggled via the .env file using the MEDIA_CHECK_STRATEGY key.
```.env
# Possible values: requester, everyone
MEDIA_CHECK_STRATEGY=requester
```
In the future, if this app gets an UI, the strategy will be configurable via the UI (maybe).