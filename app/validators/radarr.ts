import vine from "@vinejs/vine";
import type { Infer } from "@vinejs/vine/types";

const radarrLookupInfo = vine.array(
  vine.object({
    id: vine.number().optional(),
    title: vine.string(),
    tmdbId: vine.number(),
    path: vine.string().optional(),
    hasFile: vine.boolean().optional(),
    sizeOnDisk: vine.number().optional(),
  }),
);

export type RadarrLookup = Infer<typeof radarrLookupInfo>;
export const radarrLookupValidator = vine.create(radarrLookupInfo);

const radarrHistory = vine.object({
  records: vine.array(
    vine.object({
      eventType: vine.string(),
      sourceTitle: vine.string().optional(),
      date: vine.string(),
    }),
  ),
});

export type RadarrHistory = Infer<typeof radarrHistory>;
export const radarrHistoryValidator = vine.create(radarrHistory);
