import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import User from "#models/user";
import { jellyfinApiClient, jellyseerrApiClient } from "#start/api-clients";
import {
  type JellyfinUser,
  jellyfinUsersValidator,
} from "#validators/jellyfin_user";
import {
  type JellyseerrUser,
  jellyseerrUsersValidator,
} from "#validators/jellyseerr_user";

export default class SyncUsers extends BaseCommand {
  static commandName = "sync:users";
  static description =
    "Get users from Jellyfin, sync them to their Jellyseerr data and save them in the database";

  static aliases = ["s:u"];

  static options: CommandOptions = {
    startApp: true,
  };

  private jellyfinUsers: JellyfinUser[] = [];
  private jellyseerrUsers: JellyseerrUser[] = [];

  async prepare() {
    this.logger.info("Preparing the syncing of users…");
    [this.jellyfinUsers, this.jellyseerrUsers] = await Promise.all([
      jellyfinApiClient
        .get("Users")
        .json()
        .then(jellyfinUsersValidator.validate),
      jellyseerrApiClient
        .get("user")
        .json()
        .then((d) => jellyseerrUsersValidator.validate(d.results)),
    ]);
    this.logger.info(
      `Found ${this.jellyfinUsers.length} users in Jellyfin and ${this.jellyseerrUsers.length} users in Jellyseerr. Processing to cross-match now…`,
    );
  }

  async run() {
    const linkedJellyseerrUsers = this.jellyseerrUsers.filter(
      (user) => user.jellyfinUserId,
    );
    this.logger.info(
      `Found ${linkedJellyseerrUsers.length} users in Jellyseerr that are linked to Jellyfin. Moving onto the syncing…`,
    );

    for (const jFinUser of this.jellyfinUsers) {
      const jSeerrUser = linkedJellyseerrUsers.find(
        (u) => u.jellyfinUserId && u.jellyfinUserId === jFinUser.Id,
      );
      if (!jSeerrUser) {
        this.logger.info(
          `User ${jFinUser.Id} is not linked to Jellyseerr. Skipping…`,
        );
        continue;
      }
      this.logger.info(JSON.stringify(jFinUser));
      this.logger.info(
        `Syncing user ${jFinUser.Id} from Jellyfin to Jellyseerr…`,
      );
      const found = await User.findBy({ jellyfinId: jFinUser.Id });

      const data = {
        jellyfinId: jFinUser.Id,
        jellyseerrId: jSeerrUser.id.toString(),
        username: jFinUser.Name,
        isAdmin: jFinUser.Policy.IsAdministrator,
      };
      let newUser: User | null = null;
      if (found) {
        this.logger.info(
          `User ${jFinUser.Id} is already in the database. Updating…`,
        );
        newUser = await found.merge(data).save();
      } else {
        this.logger.info(
          `User ${jFinUser.Id} is not in the database. Creating…`,
        );
        newUser = await User.create(data);
      }

      this.logger.info(
        `User ${newUser.username} has been synced to Jellyseerr!`,
      );
    }
  }

  async completed() {
    this.logger.info("Syncing users completed!");
  }
}
