import type { LibraryType } from "#models/library";

export type TmdbMediaType = (typeof LibraryType)[keyof typeof LibraryType];
export type MediaInfo = {
  id: string;
  tmdbId: string;
  mediaType: TmdbMediaType;
};
export type MediaCheckResult = { shouldKeep: boolean; reason: string | null };

/**
 * The base class for all strategies to judge if a media has been played.
 */
export abstract class MediaCheckStrategy {
  /**
   * The name of the strategy. Helps to identify the strategy.
   */
  abstract readonly name: string;
  /**
   * Check if a media has been played by at least one user.
   *
   * @param media The media to check against a specified strategy
   * @returns hasBeenPlayed: true if at least one user has seen the media, false otherwise
   * @returns by: the username of the user who has seen the media
   */
  abstract shouldKeep(media: MediaInfo): Promise<MediaCheckResult>;
}
