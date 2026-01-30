import vine from "@vinejs/vine";
import type { Infer } from "@vinejs/vine/types";
import { LibraryType } from "#models/library";

const jellyfinLibrary = vine.object({
  ItemId: vine.string(),
  Name: vine.string(),
  CollectionType: vine.enum([...Object.values(LibraryType), "boxsets"]),
});

const jellyfinLibraries = vine.array(jellyfinLibrary);

export const jellyfinLibrariesValidator = vine.create(jellyfinLibraries);

export type JellyfinLibrary = Infer<typeof jellyfinLibrary>;
