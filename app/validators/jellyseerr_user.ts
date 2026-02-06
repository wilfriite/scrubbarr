import vine from "@vinejs/vine";
import type { Infer } from "@vinejs/vine/types";

const jellyseerrUser = vine.object({
  // id: vine.literal("ba1434fed0f04ea7a4a8cac0a9f2f772"),
  id: vine.number(),
  jellyfinUserId: vine.string().nullable(),
});

const jellyseerrUserArr = vine.array(jellyseerrUser);

export const jellyseerrUsersValidator = vine.create(jellyseerrUserArr);

export type JellyseerrUser = Infer<typeof jellyseerrUser>;
