import vine from "@vinejs/vine";
import type { Infer } from "@vinejs/vine/types";

// Schema for a movie
const movieItemSchema = vine.object({
  Id: vine.string(),
  Name: vine.string(),
  Type: vine.literal("Movie"),
});

export type MovieItem = Infer<typeof movieItemSchema>;

// Schema for an episode
const episodeItemSchema = vine.object({
  Id: vine.string(),
  Name: vine.string(),
  Type: vine.literal("Episode"),
  SeriesId: vine.string(),
});

export type EpisodeItem = Infer<typeof episodeItemSchema>;

// Checking if the type is a movie or an episode and selecting the correct schema
const nowPlayingItem = vine.union([
  vine.union.if(
    (value) =>
      vine.helpers.isObject(value) && "Type" in value && value.Type === "Movie",
    movieItemSchema,
  ),
  vine.union.if(
    (value) =>
      vine.helpers.isObject(value) &&
      "Type" in value &&
      value.Type === "Episode",
    episodeItemSchema,
  ),
]);

const jellyfinSessionSchema = vine.array(
  vine.object({
    Id: vine.string(),
    UserName: vine.string(),
    NowPlayingItem: nowPlayingItem.optional(),
  }),
);

export const jellyfinSessionValidator = vine.create(jellyfinSessionSchema);

export type JellyfinSession = Infer<typeof jellyfinSessionSchema>;
