import type User from "#models/user";
import type { JellyfinService } from "#services/jellyfin_service";
import { MediaCheckStrategy } from "./types.js";

export class EveryoneMustSeeStrategy extends MediaCheckStrategy {
  constructor(
    private jellyfinService: JellyfinService,
    private users: User[],
  ) {
    super();
  }

  async hasBeenPlayed(media: {
    id: string;
    tmdbId: string;
  }): Promise<{ hasBeenPlayed: boolean; by: string }> {
    // const users = await User.all();
    // Si UN SEUL utilisateur n'a pas vu le film, on renvoie false
    for (const user of this.users) {
      const userData = await this.jellyfinService.getMediaStateForUser(
        media.id,
        user.jellyfinId,
      );

      if (!userData.Played) return { hasBeenPlayed: false, by: user.username };
    }
    return { hasBeenPlayed: true, by: "Everyone" };
  }
}
