import vine from "@vinejs/vine";
import type { Infer } from "@vinejs/vine/types";

const jellyseerrMedia = vine.object({
  id: vine.number(),
  requestedBy: vine.object({
    jellyfinUserId: vine.string().nullable(),
    username: vine.string().nullable(),
  }),
  media: vine.object({
    jellyfinMediaId: vine.string().nullable(),
    tmdbId: vine.number().nullable().transform(String),
    imdbId: vine.string().nullable(),
  }),
});

const jellyseerrMediaArr = vine.array(jellyseerrMedia);

export const jellyseerrMediasValidator = vine.create(jellyseerrMediaArr);

export type JellyseerrMedia = Infer<typeof jellyseerrMedia>;
