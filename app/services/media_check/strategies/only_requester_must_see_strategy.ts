import logger from "@adonisjs/core/services/logger";
import { assert } from "@poppinss/utils/assert";
import type User from "#models/user";
import type { JellyfinService } from "#services/jellyfin_service";
import type { JellyseerrMedia } from "#validators/jellyseerr_media";
import {
  type MediaCheckResult,
  MediaCheckStrategy,
  type MediaInfo,
} from "./types.js";

/**
 * One of the strategies to judge if a media has been played.
 * This one check if only the requester of the media has seen the media (requester referring to the user who requested the media on Jellyseerr, this requester might not be set for a media).
 * There are several reasons that may explain the lack of requester :
 *
 * - The media has been requested directly on the corresponding *arr application,
 * - The requester has no Jellyfin account : something connected to Jellyseerr instead of Jellyfin (a Suggestarr (an app to automatically suggest medias to download) for example)
 *
 * If, for any reason, there is no requester, the Jellyfin server administrator is considered the requester (since a server must necessarily have an administrator).
 *
 * If the now set requester has not seen the media, it's considered as not played and can't be a candidate for deletion.
 *
 * @param jellyfinService The service to interact with Jellyfin
 * @param users The list of users to check (all of them for this strategy)
 * @param requests The list of media requests in which we need to find the request for the media to check
 */
export class OnlyRequesterMustSeeStrategy extends MediaCheckStrategy {
  constructor(
    private jellyfinService: JellyfinService,
    private users: User[],
    private requests: JellyseerrMedia[],
  ) {
    super();
  }

  readonly name = "ONLY_REQUESTER_MUST_SEE";

  async shouldKeep(media: MediaInfo): Promise<MediaCheckResult> {
    const adminUser = this.users.find((u) => u.isAdmin);
    assert(adminUser, "Admin user not found");

    const request = this.requests.find(
      (r) =>
        String(r.media.tmdbId) === String(media.externalId) ||
        String(r.media.tvdbId) === String(media.externalId),
    );

    const requester = request?.requestedBy.jellyfinUserId
      ? this.users.find(
          (u) => u.jellyfinId === request.requestedBy.jellyfinUserId,
        ) // don't use request.requestedBy.jellyfinUserId in case it's not set or obsolete
      : null;

    if (!requester) {
      logger.warn(
        `[OnlyRequesterMustSee] No Jellyseerr requester found for media ${media.id} — falling back to admin (${adminUser.username}).`,
      );
    }

    const targetUserId = requester?.jellyfinId || adminUser.jellyfinId;

    const [userData, err] = await this.jellyfinService.getMediaStateForUser(
      media.id,
      targetUserId,
    );

    if (err) {
      return {
        shouldKeep: true,
        reason: `Could not verify play state for target user: ${err.message}`,
      };
    }

    const username =
      this.users.find((u) => u.jellyfinId === targetUserId)?.username ||
      "Admin";

    return {
      shouldKeep: !userData.Played,
      reason: userData.Played
        ? null
        : `Owner ${username} has not played the media yet.`,
    };
  }
}
