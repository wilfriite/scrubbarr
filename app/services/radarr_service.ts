import logger from "@adonisjs/core/services/logger";
import { radarrClient } from "#start/api-clients";
import env from "#start/env";
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

    if (movies.length === 0)
      return [null, new Error(`Movie TMDB:${tmdbId} not found in Radarr`)];

    if (movies.length > 1) {
      return [
        null,
        new Error(
          `Multiple movies found in Radarr for TMDB:${tmdbId} (${movies.map((m) => `"${m.title}"`).join(", ")}). Skipping to avoid deleting the wrong file.`,
        ),
      ];
    }

    return [movies[0], null];
  }

  async deleteMovie(tmdbId: number): Promise<Result<boolean>> {
    const [movie, lookupErr] = await this.getMovieByTmdbId(tmdbId);

    if (lookupErr) {
      return [null, lookupErr];
    }

    if (env.get("DRY_RUN")) {
      logger.info(`[Radarr] [DRY RUN] Would have deleted "${movie.title}"`);
      return [true, null];
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
