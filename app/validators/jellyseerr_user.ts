import vine from "@vinejs/vine";
import type { Infer } from "@vinejs/vine/types";

const jellyseerrUser = vine.object({
  id: vine.number(),
  jellyfinUserId: vine.string().nullable(),
});

const jellyseerrUserArr = vine.array(jellyseerrUser);

export const jellyseerrUsersValidator = vine.create(jellyseerrUserArr);

export type JellyseerrUser = Infer<typeof jellyseerrUser>;
