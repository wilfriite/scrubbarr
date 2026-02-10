import logger from "@adonisjs/core/services/logger";
import { radarrClient } from "#start/api-clients";
import { type RadarrLookup, radarrLookupValidator } from "#validators/radarr";
import { type Result, safe } from "../utils/safe.js";

export class RadarrService {
  async getMovieByTmdbId(
    tmdbId: number,
  ): Promise<Result<RadarrLookup[number]>> {
    logger.debug(`[Radarr] Looking up TMDB:${tmdbId}`);

    const [data, fetchErr] = await safe(
      radarrClient.get("movie", { searchParams: { tmdbId } }).json<unknown>(),
    );

    if (fetchErr) return [null, fetchErr];

    const [movies, validationErr] = await safe(
      radarrLookupValidator.validate(data),
    );
    if (validationErr) return [null, validationErr];

    const movie = movies[0] || null;
    if (!movie)
      return [null, new Error(`Movie TMDB:${tmdbId} not found in Radarr`)];

    return [movie, null];
  }

  async deleteMovie(tmdbId: number): Promise<Result<boolean>> {
    const [movie, lookupErr] = await this.getMovieByTmdbId(tmdbId);

    if (lookupErr) {
      return [null, lookupErr];
    }

    const [_, deleteErr] = await safe(
      radarrClient
        .delete(`movie/${movie.id}`, {
          searchParams: {
            deleteFiles: "true",
            addImportExclusion: "false",
          },
        })
        .json(),
    );

    if (deleteErr) return [null, deleteErr];

    logger.info(`[Radarr] Successfully deleted "${movie.title}"`);
    return [true, null];
  }

  async isDownloaded(tmdbId: number): Promise<Result<boolean>> {
    const [movie, lookupErr] = await this.getMovieByTmdbId(tmdbId);
    if (lookupErr) return [null, lookupErr];

    return [!!movie.hasFile, null];
  }
}
