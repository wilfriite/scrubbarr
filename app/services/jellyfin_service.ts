import logger from "@adonisjs/core/services/logger";
import type User from "#models/user";
import { jellyfinApiClient } from "#start/api-clients";
import {
  jellyfinMediaValidator,
  mediaUserDataValidator,
} from "#validators/jellyfin_media";
import { jellyfinSessionValidator } from "#validators/jellyfin_session";

export class JellyfinService {
  async getMediasForLibrary(libraryId: string) {
    return await jellyfinApiClient
      .get(`Items`, {
        searchParams: {
          fields: "ProviderIds,UserData,DateCreated",
          parentId: libraryId,
        },
      })
      .json()
      .then((d) => d.Items)
      .then(jellyfinMediaValidator.validate);
  }

  async getMediaStateForUser(mediaId: string, userId: string) {
    return await jellyfinApiClient
      .get(`UserItems/${mediaId}/UserData`, {
        searchParams: { userId },
      })
      .json()
      .then(mediaUserDataValidator.validate);
  }

  async getAllUsersFavoriteMedias(users: User[]) {
    const favMeds = new Set<string>();

    for (const user of users) {
      const favoriteMediasInLibrary = await jellyfinApiClient
        .get(`Users/${user.jellyfinId}/Items`, {
          searchParams: {
            Filters: "IsFavorite",
            fields: "ProviderIds,UserData,DateCreated",
            Recursive: true,
          },
        })
        .json()
        .then((d) => d.Items)
        .then(jellyfinMediaValidator.validate);

      logger.info(
        `Found ${favoriteMediasInLibrary.length} favorite medias for user ${user.username}.`,
      );
      for (const media of favoriteMediasInLibrary) {
        if (media.ProviderIds.Tmdb) {
          favMeds.add(media.ProviderIds.Tmdb);
        }
      }
    }
    logger.info(JSON.stringify(favMeds.values().toArray()));
    return favMeds;
  }

  async getCurrentlyPlayingMediaIds(): Promise<Set<string>> {
    try {
      const sessions = await jellyfinApiClient
        .get("Sessions")
        .json()
        .then(jellyfinSessionValidator.validate);

      const blockedIds = new Set<string>();

      for (const session of sessions) {
        const item = session.NowPlayingItem;

        // Ignore if no id or unknown data type
        if (!item || !("Id" in item)) continue;

        blockedIds.add(item.Id);

        // Si c'est un épisode, on ajoute aussi l'ID de la série
        if ("Type" in item && item.Type === "Episode" && "SeriesId" in item) {
          blockedIds.add(item.SeriesId);
        }
      }

      return blockedIds;
    } catch (error) {
      logger.error("Failed to fetch Jellyfin sessions:");
      logger.error(error);
      // Log l'erreur (Vine error ou Axios error)
      return new Set();
    }
  }
}
