import { inject } from "@adonisjs/core";
import { BaseCommand } from "@adonisjs/core/ace";
import logger from "@adonisjs/core/services/logger";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import { DateTime } from "luxon";
import { LibraryType } from "#models/library";
import MediaHistoryRecord from "#models/media_history_record";
import MediaQueue from "#models/media_queue";
// biome-ignore lint/style/useImportType: Need the actual class for DI purposes
import { JellyfinService } from "#services/jellyfin_service";
// biome-ignore lint/style/useImportType: Need the actual class for DI purposes
import {
  MediaCheckStrategy,
  type MediaInfo,
} from "#services/media_check/strategies/types";

/**
 * This command will check if the medias in the queue still need to be deleted.
 * Between the date they have been planned and now, it might not be relevant to plan them (if a media doesn't comply with the strategy anymore).
 */
export default class CheckQueue extends BaseCommand {
  static commandName = "check:queue";
  static description = "Verify if media in queue still need to be deleted";

  static aliases = ["c:q"];

  static options: CommandOptions = {
    startApp: true,
  };

  private activePlaybackIds: Set<string> = new Set();
  private favoriteMedias: { movies: Set<string>; tvshows: Set<string> } = {
    movies: new Set(),
    tvshows: new Set(),
  };

  @inject()
  async prepare(jellyfinService: JellyfinService) {
    const [activePlaybackIds, favoriteMedias] = await Promise.all([
      jellyfinService.getCurrentlyPlayingMediaIds(),
      jellyfinService.getAllUsersFavoriteMedias(),
    ]);

    this.activePlaybackIds = activePlaybackIds;
    this.favoriteMedias = favoriteMedias;

    logger.info(
      `Found ${this.activePlaybackIds.size} active playbacks and ${this.favoriteMedias.movies.size + this.favoriteMedias.tvshows.size} favorite medias in Jellyfin.`,
    );
  }

  @inject()
  async run(mediaCheckStrategy: MediaCheckStrategy) {
    const queueItems = await MediaQueue.query().preload("library");

    if (queueItems.length === 0) {
      logger.info("Queue is empty. Nothing to check.");
      return;
    }

    for (const item of queueItems) {
      // A. Vérification des sessions actives
      if (this.activePlaybackIds.has(item.jellyfinId)) {
        if (item.library.type === "movies") {
          item.deletionPlannedAt = DateTime.now().plus({ week: 1 });
          logger.info(
            `[SKIP] ${item.name} is currently being watched. Postponing the deletion for 1 week.`,
          );
        } else {
          item.deletionPlannedAt = DateTime.now().plus({ month: 1 });
          logger.info(
            `[SKIP] ${item.name} is currently being watched. Postponing the deletion for 1 month.`,
          );
        }
        await item.save();
        continue;
      }

      // B. Vérification des favoris
      const favoriteSet =
        item.library.type === LibraryType.Movies
          ? this.favoriteMedias.movies
          : this.favoriteMedias.tvshows;

      if (favoriteSet.has(item.externalId)) {
        await this.moveToHistory(item, "FAVORITE");
        continue;
      }

      // C. Vérification de la stratégie
      const mediaInfo: MediaInfo = {
        id: item.jellyfinId,
        externalId: item.externalId,
        mediaType: item.library.type,
      };

      const result = await mediaCheckStrategy.shouldKeep(mediaInfo);

      if (result.shouldKeep) {
        await this.moveToHistory(item, "STRATEGY");
      } else {
        logger.info(
          `[STAY] ${item.name} still scheduled ${item.deletionPlannedAt.toRelative()}`,
        );
      }
    }
  }

  private async moveToHistory(
    item: MediaQueue,
    reason: "FAVORITE" | "STRATEGY",
  ) {
    await MediaHistoryRecord.updateOrCreate(
      { jellyfinId: item.jellyfinId, status: "AUTO_SAVED" },
      {
        externalId: item.externalId,
        name: item.name,
        type: item.library.type,
        strategyName: item.strategyName,
        libraryId: item.libraryId,
        plannedAt: item.deletionPlannedAt,
      },
    );

    await item.delete();
    logger.info(
      `[SAVED] ${item.name} moved to history (Reason: ${reason === "FAVORITE" ? "Marked as favorite" : "Strategy verdict"}).`,
    );
  }
}
