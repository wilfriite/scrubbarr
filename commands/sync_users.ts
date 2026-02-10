import { BaseCommand } from "@adonisjs/core/ace";
import logger from "@adonisjs/core/services/logger";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import { DateTime } from "luxon";
import User from "#models/user";
import { jellyfinApiClient, jellyseerrApiClient } from "#start/api-clients";
import env from "#start/env";
import { safe } from "#utils/safe";
import {
  type JellyfinUser,
  jellyfinUsersValidator,
} from "#validators/jellyfin_user";
import {
  type JellyseerrUser,
  jellyseerrUsersValidator,
} from "#validators/jellyseerr_user";

/**
 * This command will sync the users from Jellyfin to the database.
 */
export default class SyncUsers extends BaseCommand {
  static commandName = "sync:users";
  static description =
    "Get users from Jellyfin, sync them to their Jellyseerr data (if available) and save them in the database";

  static aliases = ["s:u"];

  static options: CommandOptions = {
    startApp: true,
  };

  private jellyfinUsers: JellyfinUser[] = [];
  private jellyseerrUsers: JellyseerrUser[] = [];

  async prepare() {
    logger.info("Preparing the syncing of users…");

    const isJellyseerrConfigured = !!(
      env.get("JELLYSEERR_URL") && env.get("JELLYSEERR_API_KEY")
    );

    const [jFinData, jFinErr] = await safe(
      jellyfinApiClient
        .get("Users")
        .json<unknown>()
        .then(jellyfinUsersValidator.validate),
    );

    if (jFinErr) {
      logger.error(`Failed to fetch Jellyfin users: ${jFinErr.message}`);
      return;
    }
    this.jellyfinUsers = jFinData;

    if (isJellyseerrConfigured) {
      const [jSeerrData, jSeerrErr] = await safe(
        jellyseerrApiClient
          .get("user")
          .json<{ results: unknown }>()
          .then((d) => jellyseerrUsersValidator.validate(d.results)),
      );

      if (jSeerrErr) {
        logger.warn(
          `Jellyseerr is configured but unreachable: ${jSeerrErr.message}. Syncing Jellyfin users only.`,
        );
      } else {
        this.jellyseerrUsers = jSeerrData;
      }
    }

    logger.info(
      `Found ${this.jellyfinUsers.length} users in Jellyfin and ${this.jellyseerrUsers.length} matching users in Jellyseerr.`,
    );
  }

  async run() {
    const existingJellyfinIds = new Set(this.jellyfinUsers.map((u) => u.Id));

    const linkedJellyseerrUsers = this.jellyseerrUsers.flatMap((user) => {
      if (!user.jellyfinUserId || !existingJellyfinIds.has(user.jellyfinUserId))
        return [];

      return [
        {
          ...user,
          jellyfinUserId: user.jellyfinUserId,
        },
      ];
    });

    for (const jFinUser of this.jellyfinUsers) {
      const jSeerrUser = linkedJellyseerrUsers.find(
        (u) => u.jellyfinUserId && u.jellyfinUserId === jFinUser.Id,
      );

      const found = await User.findBy({ jellyfinId: jFinUser.Id });

      const lastActivityAt = jFinUser.LastActivityDate
        ? DateTime.fromISO(jFinUser.LastActivityDate)
        : null;

      const data = {
        jellyfinId: jFinUser.Id,
        jellyseerrId: jSeerrUser?.id.toString() || null,
        username: jFinUser.Name,
        isAdmin: jFinUser.Policy.IsAdministrator,
        lastActivityAt,
      };

      let newUser: User | null = null;
      if (found) {
        newUser = await found.merge(data).save();
      } else {
        newUser = await User.create(data);
      }

      logger.info(`User ${newUser.username} has been synced.`);
    }
  }

  async completed() {
    logger.info("Syncing users completed!");
  }
}
