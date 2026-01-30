import vine from "@vinejs/vine";
import type { Infer } from "@vinejs/vine/types";

const jellyfinMediaUserData = vine.object({
  Played: vine.boolean(),
  IsFavorite: vine.boolean(),
  LastPlayedDate: vine.string().optional(),
});

const jellyfinMedia = vine.object({
  Id: vine.string(),
  Name: vine.string(),
  DateCreated: vine.string(),
  ProviderIds: vine.object({
    Tmdb: vine.string().optional(),
    Imdb: vine.string().optional(),
  }),
});

const jellyfinMediaArr = vine.array(jellyfinMedia);

export const jellyfinMediaValidator = vine.create(jellyfinMediaArr);

export type JellyfinMedia = Infer<typeof jellyfinMedia>;

export const mediaUserDataValidator = vine.create(jellyfinMediaUserData);

export type MediaUserData = Infer<typeof jellyfinMediaUserData>;
