import vine from "@vinejs/vine";
import type { Infer } from "@vinejs/vine/types";

const jellyfinUser = vine.object({
  Id: vine.string(),
  Name: vine.string(),
  LastActivityDate: vine.string().optional(),
  Policy: vine.object({
    IsAdministrator: vine.boolean(),
  }),
});

const jellyfinUserArr = vine.array(jellyfinUser);

export const jellyfinUsersValidator = vine.create(jellyfinUserArr);

export type JellyfinUser = Infer<typeof jellyfinUser>;
