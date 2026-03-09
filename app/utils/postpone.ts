import { DateTime } from "luxon";
import { LibraryType, type LibraryTypeType } from "#models/library";

/**
 * Returns the postponed deletion date based on library type.
 * Movies: +1 week, TV shows: +1 month.
 */
export function getPostponedDate(
  libraryType: LibraryTypeType,
  from: DateTime = DateTime.now(),
): DateTime {
  return libraryType === LibraryType.Movies
    ? from.plus({ week: 1 })
    : from.plus({ month: 1 });
}

export function getPostponedLabel(libraryType: LibraryTypeType): string {
  return libraryType === LibraryType.Movies ? "1 week" : "1 month";
}
