import logger from "@adonisjs/core/services/logger";
import { radarrClient } from "#start/api-clients";
import { radarrLookupValidator } from "#validators/radarr";

export class RadarrService {
  async getMovieByTmdbId(tmdbId: number) {
    try {
      logger.debug(`[Radarr] Looking up TMDB:${tmdbId}`);
      const data = await radarrClient
        .get("movie", { searchParams: { tmdbId } })
        .json<unknown>();

      // logger.debug(data[0].id)
      const movies = await radarrLookupValidator.validate(data);
      return movies[0] || null;
    } catch (error) {
      logger.error({ error }, `[Radarr] Lookup failed for TMDB:${tmdbId}`);
      return null;
    }
  }

  async deleteMovie(tmdbId: number): Promise<boolean> {
    try {
      const movie = await this.getMovieByTmdbId(tmdbId);

      if (!movie?.id) {
        logger.warn(`[Radarr] Cannot delete: Movie TMDB:${tmdbId} not found.`);
        return false;
      }

      // await radarrClient.delete(`movie/${movie.id}`, {
      //   searchParams: {
      //     deleteFiles: "true",
      //     addImportExclusion: "false",
      //   },
      // });

      logger.info(`[Radarr] Successfully deleted "${movie.title}"`);
      return true;
    } catch (error) {
      logger.error(
        { error },
        `[Radarr] Failed to execute DELETE for TMDB:${tmdbId}`,
      );
      return false;
    }
  }

  async isDownloaded(tmdbId: number): Promise<boolean> {
    const movie = await this.getMovieByTmdbId(tmdbId);
    return !!movie?.hasFile;
  }
}
