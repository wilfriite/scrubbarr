import logger from "@adonisjs/core/services/logger";
import type User from "#models/user";
import { jellyfinApiClient } from "#start/api-clients";
import {
  jellyfinMediaValidator,
  mediaUserDataValidator,
} from "#validators/jellyfin_media";

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
    let favMeds: string[] = [];

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
        if (
          media.ProviderIds.Tmdb &&
          favMeds.indexOf(media.ProviderIds.Tmdb) === -1
        ) {
          favMeds = [...favMeds, media.ProviderIds.Tmdb];
        }
      }
    }
    logger.info(JSON.stringify(favMeds));
    return [...favMeds];
  }
}
