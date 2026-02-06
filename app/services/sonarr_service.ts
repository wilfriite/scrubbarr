import logger from "@adonisjs/core/services/logger";
import { sonarrClient } from "#start/api-clients";
import { sonarrLookupValidator } from "#validators/sonarr";

export class SonarrService {
  async getSeriesByTvdbId(tvdbId: number) {
    try {
      logger.debug(`[Sonarr] Looking up TVDB:${tvdbId}`);
      const data = await sonarrClient
        .get("series/lookup", { searchParams: { term: `tvdb:${tvdbId}` } })
        .json<unknown>();

      const series = await sonarrLookupValidator.validate(data);
      return series[0] || null;
    } catch (error) {
      logger.error({ error }, `[Sonarr] Lookup failed for TVDB:${tvdbId}`);
      return null;
    }
  }

  async deleteSeries(tvdbId: number): Promise<boolean> {
    try {
      const series = await this.getSeriesByTvdbId(tvdbId);

      if (!series?.id) {
        logger.warn(`[Sonarr] Cannot delete: Series TVDB:${tvdbId} not found.`);
        return false;
      }

      // await sonarrClient.delete(`series/${series.id}`, {
      //   searchParams: {
      //     deleteFiles: "true",
      //     addImportListExclusion: "false",
      //   },
      // });

      logger.info(`[Sonarr] Successfully deleted "${series.title}"`);
      return true;
    } catch (error) {
      logger.error(
        { error },
        `[Sonarr] Failed to execute DELETE for TVDB:${tvdbId}`,
      );
      return false;
    }
  }

  async isDownloaded(tvdbId: number): Promise<boolean> {
    const series = await this.getSeriesByTvdbId(tvdbId);
    return !!(
      series?.statistics && (series.statistics.episodeFileCount ?? 0) > 0
    );
  }
}
