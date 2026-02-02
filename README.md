# 🧹 Scrubbarr

**Scrubbarr** is a smart automated cleanup tool for self-hosted media libraries. It acts as a "bridge" between **Jellyfin** (playback), **Jellyseerr** (requests), and **Radarr/Sonarr** (file management) to ensure your storage doesn't get cluttered with movies and shows that nobody is watching anymore.


## 🚀 The Concept: "The Jail System"

Ménagarr works with a three-step lifecycle for your media:

1.  **Populate**: New or old media is discovered and put into a "Queue" (The Jail) with a planned deletion date.
2.  **Check**: Before the deletion happens, Ménagarr runs customizable strategies. If someone is still watching or if the media is requested by a specific user, it gets a "Pardon" and is moved to History.
3.  **Process**: If the time is up and no strategy saved the media, Ménagarr tells Radarr or Sonarr to delete the files permanently.


## ✅ Features Implemented

### 📡 External Integrations
* **Jellyfin API**: Real-time monitoring of "Now Playing" sessions to avoid deleting a movie while someone is watching it.
* **Radarr API**: Fully integrated movie lookup and deletion (using TMDB IDs).
* **Jellyseerr/Overseerr API**: Checking request ownership to see who originally asked for the media.

### 🧠 Smart Logic via Strategy Pattern (Learn more [here](./STRATEGIES.md))
* **Strategy Pattern**: Easily switch between different cleanup philosophies.
* **"Everyone Must See"**: Media is only deleted if *every* user on the server has finished it.
* **"Requester Only"**: Media is deleted once the person who requested it has watched it.
* **Playback Safety**: Automatic detection of active sessions to pause any deletion process.

### 🗂 Database & History
* **Media Queue**: A central table to track what is scheduled for deletion and why.
* **History Records**: A full audit log of what was deleted or "Auto-Saved" by the system.
* **Update-or-Create Logic**: Clean history management to avoid duplicate entries for the same media.


## 🛠 To-Do List (Remaining Work)

### 📺 Sonarr Integration
- [ ] Implement `SonarrService` for TV Show management (TVDB ID support).

### ⏰ Automation
- [ ] Set up a **Scheduler (Cron jobs)** to run the `Populate`, `Check`, and `Process` commands automatically at night.

### ⚙️ Configuration & UI
- [ ] Create a simple Dashboard to see the current Queue.
- [ ] Add a "Manual Keep" button to save a movie forever directly from the UI.
- [ ] Multi-library support (separate rules for 4K vs 1080p).

---

*Scrubbarr: Because your hard drives deserve a break.*