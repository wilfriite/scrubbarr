import logger from "@adonisjs/core/services/logger";
import { sonarrClient } from "#start/api-clients";
import env from "#start/env";
import { type SonarrLookup, sonarrLookupValidator } from "#validators/sonarr";
import { type Result, safe } from "../utils/safe.js";

export class SonarrService {
  async getSeriesByTvdbId(
    tvdbId: number,
  ): Promise<Result<SonarrLookup[number]>> {
    logger.debug(`[Sonarr] Looking up TVDB:${tvdbId}`);

    const [data, fetchErr] = await safe(
      sonarrClient
        .get("series/lookup", { searchParams: { term: `tvdb:${tvdbId}` } })
        .json<unknown>(),
    );

    if (fetchErr) return [null, fetchErr];

    const [seriesList, validationErr] = await safe(
      sonarrLookupValidator.validate(data),
    );
    if (validationErr) return [null, validationErr];

    const series = seriesList[0] || null;
    if (!series)
      return [null, new Error(`Series TVDB:${tvdbId} not found in Sonarr`)];

    return [series, null];
  }

  async deleteSeries(tvdbId: number): Promise<Result<boolean>> {
    const [series, lookupErr] = await this.getSeriesByTvdbId(tvdbId);

    if (lookupErr) {
      return [null, lookupErr];
    }

    if (env.get("DRY_RUN")) {
      logger.info(`[Sonarr] [DRY RUN] Would have deleted "${series.title}"`);
      return [true, null];
    }

    const [_, deleteErr] = await safe(
      sonarrClient
        .delete(`series/${series.id}`, {
          searchParams: {
            deleteFiles: "true",
            addImportListExclusion: "false",
          },
        })
        .json(),
    );

    if (deleteErr) return [null, deleteErr];

    logger.info(`[Sonarr] Successfully deleted "${series.title}"`);
    return [true, null];
  }

  async isDownloaded(tvdbId: number): Promise<Result<boolean>> {
    const [series, lookupErr] = await this.getSeriesByTvdbId(tvdbId);
    if (lookupErr) return [null, lookupErr];

    return [
      !!(series.statistics && (series.statistics.episodeFileCount ?? 0) > 0),
      null,
    ];
  }
}
