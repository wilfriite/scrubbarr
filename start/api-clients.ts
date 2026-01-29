import ky from "ky";
import env from "./env.js";

export const jellyfinApiClient = ky.create({
    prefixUrl: env.get("JELLYFIN_URL"),
    searchParams: {
        "api_key": env.get("JELLYFIN_API_KEY"),
    }
})

export const jellyseerrApiClient = ky.create({
    prefixUrl: env.get("JELLYSEERR_URL"),
    headers: {
        "x-api-key": env.get("JELLYSEERR_API_KEY"),
    }
})