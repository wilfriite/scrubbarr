import vine from "@vinejs/vine";
import type { Infer } from "@vinejs/vine/types";

const sonarrLookupInfo = vine.array(
  vine.object({
    id: vine.number().optional(),
    title: vine.string(),
    tvdbId: vine.number(),
    path: vine.string().optional(),
    monitored: vine.boolean().optional(),
    statistics: vine
      .object({
        episodeFileCount: vine.number().optional(),
        episodeCount: vine.number().optional(),
        totalEpisodeCount: vine.number().optional(),
        sizeOnDisk: vine.number().optional(),
      })
      .optional(),
  }),
);

export type SonarrLookup = Infer<typeof sonarrLookupInfo>;
export const sonarrLookupValidator = vine.create(sonarrLookupInfo);

const sonarrHistory = vine.object({
  records: vine.array(
    vine.object({
      eventType: vine.string(),
      sourceTitle: vine.string().optional(),
      date: vine.string(),
    }),
  ),
});

export type SonarrHistory = Infer<typeof sonarrHistory>;
export const sonarrHistoryValidator = vine.create(sonarrHistory);
