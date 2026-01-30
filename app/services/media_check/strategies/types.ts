type MediaInfo = { id: string; tmdbId: string };

/**
 * The base class for all strategies to judge if a media has been played.
 */
export abstract class MediaCheckStrategy {
  /**
   * Check if a media has been played by at least one user.
   *
   * @param media The media to check against a specified strategy
   * @returns hasBeenPlayed: true if at least one user has seen the media, false otherwise
   * @returns by: the username of the user who has seen the media
   */
  abstract hasBeenPlayed(
    media: MediaInfo,
  ): Promise<{ hasBeenPlayed: boolean; by: string }>;
}
