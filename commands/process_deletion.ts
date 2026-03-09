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

    const [activePlaybackIds, fetchErr] =
      await jellyfinService.getCurrentlyPlayingMediaIds();

    if (fetchErr) {
      logger.error(`Failed to fetch active playbacks: ${fetchErr.message}`);
      return;
    }

    const toDelete = await MediaQueue.query()
      .where("deletionPlannedAt", "<=", now.toSQL())
      .preload("library");

    if (toDelete.length === 0) {
      logger.info("No media scheduled for deletion today.");
      return;
    }

    logger.info(`Found ${toDelete.length} medias due to be deleted.`);

    for (const item of toDelete) {
      if (!item.library) {
        logger.warn(
          `[SKIP] ${item.name} has no associated library (it may have been deleted). Skipping.`,
        );
        continue;
      }

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

      if (item.library.type === LibraryType.Movies) {
        const [_, radarrErr] = await radarrService.deleteMovie(
          Number(item.externalId),
        );
        if (radarrErr) {
          logger.error(
            `[FAILED] ${item.name} from ${serviceName}: ${radarrErr.message}`,
          );
          continue;
        }
      } else {
        const [_, sonarrErr] = await sonarrService.deleteSeries(
          Number(item.externalId),
        );
        if (sonarrErr) {
          logger.error(
            `[FAILED] ${item.name} from ${serviceName}: ${sonarrErr.message}`,
          );
          continue;
        }
      }

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
    }
  }
}
