import logger from "@adonisjs/core/services/logger";
import { jellyseerrApiClient } from "#start/api-clients";
import {
  type JellyseerrMedia,
  jellyseerrMediasValidator,
} from "#validators/jellyseerr_media";
import { type Result, safe } from "../utils/safe.js";

export class MediaRequestService {
  async getAllRequests(): Promise<Result<JellyseerrMedia[]>> {
    let mediaRequests: JellyseerrMedia[] = [];
    let currentPage = 1;
    let hasNextPage = true;
    let totalPages = 1;

    while (hasNextPage) {
      const [data, fetchErr] = await safe(
        jellyseerrApiClient
          .get("request", {
            searchParams: {
              skip: 10 * (currentPage - 1),
              filter: "available",
            },
          })
          .json<{
            pageInfo: { pages: number; page: number };
            results: unknown;
          }>(),
      );

      if (fetchErr) {
        return [null, fetchErr];
      }

      totalPages = data.pageInfo.pages;
      logger.info(`Page ${currentPage} of ${totalPages}`);

      const [medias, validationErr] = await safe(
        jellyseerrMediasValidator.validate(data.results),
      );

      if (validationErr) {
        return [null, validationErr];
      }

      mediaRequests = [...mediaRequests, ...medias];

      if (data.pageInfo.page < totalPages) {
        currentPage++;
      } else {
        hasNextPage = false;
      }
    }

    return [mediaRequests, null];
  }
}
