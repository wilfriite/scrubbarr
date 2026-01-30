import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import string from "@poppinss/utils/string";
import { DateTime } from "luxon";
import Library from "#models/library";
import MediaQueue from "#models/media_queue";
import User from "#models/user";
import { jellyfinApiClient, jellyseerrApiClient } from "#start/api-clients";
import {
  jellyfinMediaValidator,
  mediaUserDataValidator,
} from "#validators/jellyfin_media";
import {
  type JellyseerrMedia,
  jellyseerrMediasValidator,
} from "#validators/jellyseerr_media";

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
  private favoriteMedias: string[] = [];
  private readonly MAX_AGE_DAYS = 28;

  private startTime: bigint = 0n;
  private endTime: bigint = 0n;

  async prepare() {
    this.startTime = process.hrtime.bigint();
    this.logger.info("Preparing to verify media…");
    const res = await Promise.all([
      Library.query().where({ isActive: true }),
      User.all(),
    ]);
    this.libraries = res[0];
    this.users = res[1];
    this.logger.info(
      `Found ${this.libraries.length} ${string.pluralize("library", this.libraries.length)} and ${this.users.length} ${string.pluralize("user", this.users.length)} in the database. Processing to cross-match now…`,
    );

    // Setting up my "favorites" set
    this.logger.info("Setting up a cross-users 'favorites' set…");
    this.favoriteMedias = await this.getFavoriteMedias();

    this.logger.info(
      `Found ${this.favoriteMedias.length} favorite medias in the database.`,
    );
  }

  async run() {
    let markedCount = 0;
    let alreadyMarkedCount = 0;
    this.logger.info("Starting to verify media…");

    const requests = await this.getAllRequests();
    const adminUser = await User.findByOrFail({ isAdmin: true });
    const todayAsDate = DateTime.now();

    for (const library of this.libraries) {
      this.logger.info(
        "================================================================================",
      );
      this.logger.info(`Scanning library: ${library.name}…`);
      this.logger.info(
        "================================================================================",
      );

      const medias = await jellyfinApiClient
        .get(`Items`, {
          searchParams: {
            fields: "ProviderIds,UserData,DateCreated",
            parentId: library.jellyfinId,
          },
        })
        .json()
        .then((d) => d.Items)
        .then(jellyfinMediaValidator.validate);

      for (const media of medias) {
        // A. Sécurité TMDB
        const tmdbId = media.ProviderIds.Tmdb;
        if (!tmdbId) {
          this.logger.warning(`Media ${media.Name} has no tmdbId. Skipping…`);
          continue;
        }

        // B. Critère VETO (Favoris globaux)
        if (this.favoriteMedias.includes(tmdbId)) {
          this.logger.debug(
            `Media ${media.Name} is protected by a favorite. Skipping…`,
          );
          continue;
        }

        // C. Critère ANCIENNETÉ
        const createdAt = DateTime.fromISO(media.DateCreated);
        const diffDuration = todayAsDate.diff(createdAt, ["months", "days"]);

        if (diffDuration.as("days") < this.MAX_AGE_DAYS) {
          this.logger.debug(
            `Media ${media.Name} is too recent (${diffDuration.toHuman({ showZeros: false })}). Skipping…`,
          );
          continue;
        }

        // D. IDENTIFICATION DU PROPRIÉTAIRE
        const request = requests.find(
          (r) => r.media.tmdbId && String(r.media.tmdbId) === String(tmdbId),
        );

        // On cherche l'utilisateur correspondant dans notre liste locale
        const requester = request?.requestedBy.jellyfinUserId
          ? this.users.find(
              (u) => u.jellyfinId === request.requestedBy.jellyfinUserId,
            ) // don't use request.requestedBy.jellyfinUserId in case it's not set or obsolete
          : null;

        const mediaRequesterJellyfinId =
          requester?.jellyfinId || adminUser.jellyfinId;
        const requesterName = requester?.username || "Admin";

        this.logger.debug(`request: ${JSON.stringify(request)}`);

        this.logger.debug(`requester: ${JSON.stringify(requester)}`);

        this.logger.debug(
          `mediaRequesterJellyfinId: ${mediaRequesterJellyfinId}`,
        );

        // E. CHECK "PLAYED" (Requête ciblée)
        const mediaStateForOwner = await jellyfinApiClient
          .get(`UserItems/${media.Id}/UserData`, {
            searchParams: { userId: mediaRequesterJellyfinId },
          })
          .json()
          .then(mediaUserDataValidator.validate);

        if (mediaStateForOwner.Played) {
          // --- LOGIQUE DE PERSISTENCE ---

          // On vérifie si le média est DÉJÀ dans la file d'attente (non supprimé)
          const existingInQueue = await MediaQueue.query()
            .where("tmdbId", tmdbId)
            .whereNot("status", "DELETED")
            .first();

          if (!existingInQueue) {
            // Nouveau média : on crée l'entrée avec le compte à rebours
            await MediaQueue.create({
              tmdbId: tmdbId,
              name: media.Name,
              libraryId: library.id,
              status: "PENDING",
              deletionPlannedAt: DateTime.now().plus({
                days: library.gracePeriodDays,
              }),
            });
            this.logger.success(
              `[QUEUED] ${media.Name} (Requested by ${requesterName}). Deletion in ${library.gracePeriodDays} days.`,
            );
            markedCount++;
          } else {
            // Déjà en attente
            this.logger.debug(
              `[ALREADY QUEUED] ${media.Name} (Expires on ${existingInQueue.deletionPlannedAt.toFormat("dd/MM/yyyy")})`,
            );
            alreadyMarkedCount++;
          }
        } else {
          this.logger.debug(
            `Media ${media.Name} not yet played by owner ${requesterName}.`,
          );
        }
      }
    }

    this.logger.info(
      `Done! ${markedCount} new medias added to the deletion queue. ${alreadyMarkedCount} medias already in the queue.`,
    );
  }

  async completed() {
    this.endTime = process.hrtime.bigint();
    const apiDuration = Number(this.endTime - this.startTime) / 1e6;
    this.logger.info(`Took ${apiDuration} ms.`);
  }

  private async getFavoriteMedias() {
    const users = await User.all();
    let favMeds: string[] = [];

    for (const user of users) {
      const favoriteMediasInLibrary = await jellyfinApiClient
        .get(`Users/${user.jellyfinId}/Items`, {
          searchParams: {
            Filters: "IsFavorite",
            fields: "ProviderIds,UserData,DateCreated",
            Recursive: true,
          },
        })
        .json()
        .then((d) => d.Items)
        .then(jellyfinMediaValidator.validate);

      this.logger.info(
        `Found ${favoriteMediasInLibrary.length} favorite medias for user ${user.username}.`,
      );
      for (const media of favoriteMediasInLibrary) {
        if (
          media.ProviderIds.Tmdb &&
          favMeds.indexOf(media.ProviderIds.Tmdb) === -1
        ) {
          favMeds = [...favMeds, media.ProviderIds.Tmdb];
        }
      }
    }
    this.logger.info(JSON.stringify(favMeds));
    return [...favMeds];
  }

  private async getAllRequests() {
    let mediaRequests: JellyseerrMedia[] = [];
    let currentPage = 1;
    let hasNextPage = true;
    let totalPages = 1;

    while (hasNextPage) {
      try {
        // On ajoute le paramètre de page à l'URL
        const data = await jellyseerrApiClient
          .get("request", {
            searchParams: {
              skip: 10 * (currentPage - 1),
              filter: "available",
            },
          })
          .json();

        totalPages = data.pageInfo.pages;
        this.logger.info(`Page ${currentPage} of ${totalPages}`);

        const medias = await jellyseerrMediasValidator.validate(data.results);
        mediaRequests = [...mediaRequests, ...medias];

        if (data.pageInfo.page < totalPages) {
          currentPage++;
        } else {
          hasNextPage = false;
        }
      } catch (error) {
        this.logger.error("Erreur lors de la récupération :", error);
        hasNextPage = false; // On arrête la boucle en cas d'erreur
      }
    }

    return mediaRequests;
  }
}
