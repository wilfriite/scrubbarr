type MediaInfo = { id: string; tmdbId: string };

export abstract class MediaCheckStrategy {
  abstract hasBeenPlayed(
    media: MediaInfo,
  ): Promise<{ hasBeenPlayed: boolean; by: string }>;
}
