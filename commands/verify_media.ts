import { inject } from "@adonisjs/core";
import { BaseCommand } from "@adonisjs/core/ace";
import logger from "@adonisjs/core/services/logger";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import string from "@poppinss/utils/string";
import { DateTime } from "luxon";
import Library from "#models/library";
import MediaQueue from "#models/media_queue";
import User from "#models/user";
// biome-ignore lint/style/useImportType: Need the actual class for DI purposes
import { JellyfinService } from "#services/jellyfin_service";
// biome-ignore lint/style/useImportType: Need the actual class for DI purposes
import { MediaCheckStrategy } from "#services/media_check/strategies/types";
import env from "#start/env";

/**
 * This command, with the help of our strategies, will check if a media is eligible for deletion.
 * It does not delete the media, but only marks it as such using several conditions :
 * - The media is a favorite of someone
 * - The age of the media
 * - A "strategy", a logic used to judge if a media has been played, is applied to each media. (See the "app/services/media_check/strategies" folder)
 */
export default class VerifyMedia extends BaseCommand {
  static commandName = "verify:media";
  static description =
    "Check for each library, which media should be marked for deletion.";
  static aliases = ["v:m"];

  static options: CommandOptions = {
    startApp: true,
  };

  private libraries: Library[] = [];
  private users: User[] = [];
  private favoriteMedias: Set<string> = new Set();
  private readonly MAX_AGE_DAYS = 28;

  private startTime: bigint = 0n;
  private endTime: bigint = 0n;

  @inject()
  async prepare(jellyfinService: JellyfinService) {
    this.startTime = process.hrtime.bigint();
    logger.info("Preparing to verify media…");
    const res = await Promise.all([
      Library.query().where({ isActive: true }),
      User.all(),
    ]);
    this.libraries = res[0];
    this.users = res[1];
    logger.info(
      `Found ${this.libraries.length} ${string.pluralize("library", this.libraries.length)} and ${this.users.length} ${string.pluralize("user", this.users.length)} in the database. Processing to cross-match now…`,
    );

    // Setting up my "favorites" set
    logger.info("Setting up a cross-users 'favorites' set…");
    this.favoriteMedias = await jellyfinService.getAllUsersFavoriteMedias(
      this.users,
    );

    logger.info(
      `Found ${this.favoriteMedias.size} favorite medias in the database.`,
    );
  }

  @inject()
  async run(
    jellyfinService: JellyfinService,
    mediaCheckStrategy: MediaCheckStrategy,
  ) {
    let markedCount = 0;
    let alreadyMarkedCount = 0;
    logger.info(
      `Starting to verify media using the '${env.get("MEDIA_CHECK_STRATEGY")} must see' strategy…`,
    );

    const todayAsDate = DateTime.now();

    for (const library of this.libraries) {
      logger.info(
        "================================================================================",
      );
      logger.info(`Scanning library: ${library.name}…`);
      logger.info(
        "================================================================================",
      );

      const medias = await jellyfinService.getMediasForLibrary(
        library.jellyfinId,
      );

      for (const media of medias) {
        // A. Sécurité TMDB
        const tmdbId = media.ProviderIds.Tmdb;
        if (!tmdbId) {
          logger.warn(`Media ${media.Name} has no tmdbId. Skipping…`);
          continue;
        }

        // B. Critère VETO (Favoris globaux)
        if (this.favoriteMedias.has(tmdbId)) {
          logger.debug(
            `Media ${media.Name} is protected by a favorite. Skipping…`,
          );
          continue;
        }

        // C. Critère ANCIENNETÉ
        const createdAt = DateTime.fromISO(media.DateCreated);
        const diffDuration = todayAsDate.diff(createdAt, ["months", "days"]);

        if (diffDuration.as("days") < this.MAX_AGE_DAYS) {
          logger.debug(
            `Media ${media.Name} is too recent (${diffDuration.toHuman({ showZeros: false })}). Skipping…`,
          );
          continue;
        }

        const { shouldKeep, reason } = await mediaCheckStrategy.shouldKeep({
          id: media.Id,
          tmdbId: tmdbId,
          mediaType: library.type,
        });

        if (!shouldKeep) {
          // --- LOGIQUE DE PERSISTENCE ---

          // On vérifie si le média est DÉJÀ dans la file d'attente (non supprimé)
          const existingInQueue = await MediaQueue.query()
            .where("tmdbId", tmdbId)
            .first();

          if (!existingInQueue) {
            // Nouveau média : on crée l'entrée avec le compte à rebours
            await MediaQueue.create({
              tmdbId: tmdbId,
              name: media.Name,
              jellyfinId: media.Id,
              libraryId: library.id,
              strategyName: mediaCheckStrategy.name,
              deletionPlannedAt: DateTime.now().plus({
                days: library.gracePeriodDays,
              }),
            });
            logger.info(
              `[QUEUED] ${media.Name}. Deletion in ${library.gracePeriodDays} days.`,
            );
            markedCount++;
          } else {
            // Déjà en attente
            logger.info(
              `[ALREADY QUEUED] ${media.Name} (Expires on ${existingInQueue.deletionPlannedAt.toFormat("dd/MM/yyyy")})`,
            );
            alreadyMarkedCount++;
          }
        } else {
          logger.info(reason);
        }
      }
    }

    logger.info(
      `Done! ${markedCount} new medias added to the deletion queue. ${alreadyMarkedCount} medias already in the queue.`,
    );
  }

  async completed() {
    this.endTime = process.hrtime.bigint();
    const apiDuration = Number(this.endTime - this.startTime) / 1e6;
    logger.info(`Took ${apiDuration} ms.`);
  }
}
