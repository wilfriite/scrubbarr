import ky from "ky";
import env from "./env.js";

export const jellyfinApiClient = ky.create({
  prefixUrl: env.get("JELLYFIN_URL"),
  searchParams: {
    api_key: env.get("JELLYFIN_API_KEY"),
  },
});

export const jellyseerrApiClient = ky.create({
  prefixUrl: env.get("JELLYSEERR_URL") || "http://localhost/api/v1",
  headers: {
    "x-api-key": env.get("JELLYSEERR_API_KEY") || "",
  },
});

export const radarrClient = ky.create({
  prefixUrl: env.get("RADARR_URL"),
  headers: { "X-Api-Key": env.get("RADARR_API_KEY") },
  retry: 3,
});

export const sonarrClient = ky.create({
  prefixUrl: `${env.get("SONARR_URL")}/api/v3`,
  headers: { "X-Api-Key": env.get("SONARR_API_KEY") },
  retry: 3,
});
