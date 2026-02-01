import type User from "#models/user";
import type { JellyfinService } from "#services/jellyfin_service";
import {
  type MediaCheckResult,
  MediaCheckStrategy,
  type MediaInfo,
} from "./types.js";

/**
 * One of the strategies to judge if a media has been played.
 * This one checks if every user present on Jellyfin has seen the media.
 * If only one has not seen the media, it's considered as not played and can't be a candidate for deletion.
 *
 * @param jellyfinService The service to interact with Jellyfin
 * @param users The list of users to check (all of them for this strategy)
 */
export class EveryoneMustSeeStrategy extends MediaCheckStrategy {
  constructor(
    private jellyfinService: JellyfinService,
    private users: User[],
  ) {
    super();
  }

  readonly name = "EVERYONE_MUST_SEE";

  async shouldKeep(media: MediaInfo): Promise<MediaCheckResult> {
    // const users = await User.all();
    // Si UN SEUL utilisateur n'a pas vu le film, on renvoie false
    for (const user of this.users) {
      const userData = await this.jellyfinService.getMediaStateForUser(
        media.id,
        user.jellyfinId,
      );

      if (!userData.Played)
        return {
          shouldKeep: true,
          reason: `${user.username} has not played the media yet.`,
        };
    }
    return { shouldKeep: false, reason: null };
  }
}
