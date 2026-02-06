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
import { RadarrService } from "#services/radarr_service";
// biome-ignore lint/style/useImportType: Need the actual class for DI purposes
import { SonarrService } from "#services/sonarr_service";

export default class ProcessDeletion extends BaseCommand {
  static commandName = "process:deletion";
  static description = "Actually delete the media from *arr";

  static aliases = ["p:d"];

  static options: CommandOptions = {
    startApp: true,
  };

  @inject()
  async run(
    radarrService: RadarrService,
    sonarrService: SonarrService,
    jellyfinService: JellyfinService,
  ) {
    const now = DateTime.now();

    const activePlaybackIds =
      await jellyfinService.getCurrentlyPlayingMediaIds();

    const toDelete = await MediaQueue.query()
      .where("deletionPlannedAt", "<=", now.toSQL())
      .preload("library");

    if (toDelete.length === 0) {
      logger.info("No media scheduled for deletion today.");
      return;
    }

    logger.info(`Found ${toDelete.length} medias due to be deleted.`);

    for (const item of toDelete) {
      if (activePlaybackIds.has(item.jellyfinId)) {
        item.deletionPlannedAt = now.plus({ days: 1 });
        await item.save();
        logger.info(
          `[SKIP] ${item.name} is currently being watched. Postponing for 24h.`,
        );
        continue;
      }

      logger.info(
        "================================================================================",
      );
      const serviceName =
        item.library.type === LibraryType.Movies ? "Radarr" : "Sonarr";
      logger.info(`Attempting to delete ${item.name} from ${serviceName}…`);
      logger.info(
        "================================================================================",
      );

      let success = false;
      if (item.library.type === LibraryType.Movies) {
        success = await radarrService.deleteMovie(Number(item.externalId));
      } else {
        success = await sonarrService.deleteSeries(Number(item.externalId));
      }

      if (success) {
        await MediaHistoryRecord.create({
          jellyfinId: item.jellyfinId,
          status: "DELETED",
          externalId: item.externalId,
          name: item.name,
          type: item.library.type,
          strategyName: item.strategyName,
          libraryId: item.libraryId,
          plannedAt: item.deletionPlannedAt,
        });
        await item.delete();
        logger.info(`[DELETED] ${item.name} from ${serviceName}.`);
      } else {
        logger.warn(`[FAILED] ${item.name} from ${serviceName}`);
      }
    }
  }
}
