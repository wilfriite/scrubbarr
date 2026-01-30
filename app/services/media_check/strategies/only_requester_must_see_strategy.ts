import { assert } from "@poppinss/utils/assert";
import type User from "#models/user";
import type { JellyfinService } from "#services/jellyfin_service";
import type { JellyseerrMedia } from "#validators/jellyseerr_media";
import { MediaCheckStrategy } from "./types.js";

export class OnlyRequesterMustSeeStrategy extends MediaCheckStrategy {
  constructor(
    private jellyfinService: JellyfinService,
    private users: User[],
    private requests: JellyseerrMedia[],
  ) {
    super();
  }

  async hasBeenPlayed(media: {
    id: string;
    tmdbId: string;
  }): Promise<{ hasBeenPlayed: boolean; by: string }> {
    const adminUser = this.users.find((u) => u.isAdmin);
    assert(adminUser, "Admin user not found");

    const request = this.requests.find(
      (r) => String(r.media.tmdbId) === String(media.tmdbId),
    );

    const requester = request?.requestedBy.jellyfinUserId
      ? this.users.find(
          (u) => u.jellyfinId === request.requestedBy.jellyfinUserId,
        ) // don't use request.requestedBy.jellyfinUserId in case it's not set or obsolete
      : null;

    const targetUserId = requester?.jellyfinId || adminUser.jellyfinId;

    const userData = await this.jellyfinService.getMediaStateForUser(
      media.id,
      targetUserId,
    );

    const username =
      this.users.find((u) => u.jellyfinId === targetUserId)?.username ||
      "Admin";

    return { hasBeenPlayed: userData.Played, by: username };
  }
}
