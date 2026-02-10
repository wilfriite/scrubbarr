import logger from "@adonisjs/core/services/logger";
import User from "#models/user";
import { jellyfinApiClient as defaultJellyfinApiClient } from "#start/api-clients";
import {
  type JellyfinMedia,
  jellyfinMediaValidator,
  type MediaUserData,
  mediaUserDataValidator,
} from "#validators/jellyfin_media";
import { jellyfinSessionValidator } from "#validators/jellyfin_session";
import { type Result, safe } from "../utils/safe.js";

export class JellyfinService {
  constructor(protected jellyfinApiClient = defaultJellyfinApiClient) {}

  async getMediasForLibrary(
    libraryId: string,
  ): Promise<Result<JellyfinMedia[]>> {
    const [data, fetchErr] = await safe(
      this.jellyfinApiClient
        .get(`Items`, {
          searchParams: {
            fields: "ProviderIds,UserData,DateCreated",
            parentId: libraryId,
          },
        })
        .json<{ Items: unknown }>(),
    );

    if (fetchErr) return [null, fetchErr];

    const [medias, validationErr] = await safe(
      jellyfinMediaValidator.validate(data.Items),
    );
    if (validationErr) return [null, validationErr];

    return [medias, null];
  }

  async getMediaStateForUser(
    mediaId: string,
    userId: string,
  ): Promise<Result<MediaUserData>> {
    const [data, fetchErr] = await safe(
      this.jellyfinApiClient
        .get(`UserItems/${mediaId}/UserData`, {
          searchParams: { userId },
        })
        .json<unknown>(),
    );

    if (fetchErr) return [null, fetchErr];

    const [userData, validationErr] = await safe(
      mediaUserDataValidator.validate(data),
    );
    if (validationErr) return [null, validationErr];

    return [userData, null];
  }

  async getAllUsersFavoriteMedias() {
    const users = await User.all();
    const movieFavs = new Set<string>();
    const tvFavs = new Set<string>();

    for (const user of users) {
      const [data, fetchErr] = await safe(
        this.jellyfinApiClient
          .get(`Users/${user.jellyfinId}/Items`, {
            searchParams: {
              Filters: "IsFavorite",
              fields: "ProviderIds,UserData,DateCreated",
              Recursive: true,
            },
          })
          .json<{ Items: unknown }>(),
      );

      if (fetchErr) {
        logger.error(
          { err: fetchErr },
          `Failed to fetch favorites for user ${user.username}`,
        );
        continue;
      }

      const [favoriteMedias, validationErr] = await safe(
        jellyfinMediaValidator.validate(data.Items),
      );
      if (validationErr) {
        logger.error(
          { err: validationErr },
          `Failed to validate favorites for user ${user.username}`,
        );
        continue;
      }

      logger.info(
        `Found ${favoriteMedias.length} favorite medias for user ${user.username}.`,
      );
      for (const media of favoriteMedias) {
        if (media.ProviderIds.Tmdb) {
          movieFavs.add(media.ProviderIds.Tmdb);
        }
        if (media.ProviderIds.Tvdb) {
          tvFavs.add(media.ProviderIds.Tvdb);
        }
      }
    }

    return {
      movies: movieFavs,
      tvshows: tvFavs,
    };
  }

  async getCurrentlyPlayingMediaIds(): Promise<Result<Set<string>>> {
    const [data, fetchErr] = await safe(
      this.jellyfinApiClient.get("Sessions").json<unknown>(),
    );

    if (fetchErr) {
      return [null, fetchErr];
    }

    const [sessions, validationErr] = await safe(
      jellyfinSessionValidator.validate(data),
    );
    if (validationErr) return [null, validationErr];

    const blockedIds = new Set<string>();

    for (const session of sessions) {
      const item = session.NowPlayingItem;
      if (!item || !("Id" in item)) continue;

      blockedIds.add(item.Id);
      if ("Type" in item && item.Type === "Episode" && "SeriesId" in item) {
        blockedIds.add(item.SeriesId);
      }
    }

    return [blockedIds, null];
  }
}
