import logger from "@adonisjs/core/services/logger";
import { jellyseerrApiClient } from "#start/api-clients";
import {
  type JellyseerrMedia,
  jellyseerrMediasValidator,
} from "#validators/jellyseerr_media";

export class MediaRequestService {
  async getAllRequests() {
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
        logger.info(`Page ${currentPage} of ${totalPages}`);

        const medias = await jellyseerrMediasValidator.validate(data.results);
        mediaRequests = [...mediaRequests, ...medias];

        if (data.pageInfo.page < totalPages) {
          currentPage++;
        } else {
          hasNextPage = false;
        }
      } catch (error) {
        logger.error("Erreur lors de la récupération :", error);
        hasNextPage = false; // On arrête la boucle en cas d'erreur
      }
    }

    return mediaRequests;
  }
}
