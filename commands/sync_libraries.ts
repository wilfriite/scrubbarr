import { BaseCommand } from "@adonisjs/core/ace";
import logger from "@adonisjs/core/services/logger";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import Library from "#models/library";
import { jellyfinApiClient } from "#start/api-clients";
import {
  type JellyfinLibrary,
  jellyfinLibrariesValidator,
} from "#validators/jellyfin_library";

export default class SyncLibraries extends BaseCommand {
  static commandName = "sync:libraries";
  static description = "Sync Jellyfin libraries to the database.";

  static aliases = ["s:l"];

  static options: CommandOptions = {
    startApp: true,
  };

  private libraries: JellyfinLibrary[] = [];

  async prepare() {
    logger.info("Preparing the syncing of libraries…");
    this.libraries = await jellyfinApiClient
      .get("Library/VirtualFolders")
      .json()
      .then(jellyfinLibrariesValidator.validate);
    logger.info(
      `Found ${this.libraries.length} libraries in Jellyfin. Processing to cross-match now…`,
    );
  }

  async run() {
    const libraries = this.libraries.filter(
      (l) => l.CollectionType !== "boxsets", // Keep boxsets here cause we need to filter them out (API sends them too)
    );
    logger.info(
      `Found ${libraries.length} effective libraries in Jellyfin. Moving onto the syncing…`,
    );

    for (const library of libraries) {
      const found = await Library.findBy({ jellyfinId: library.ItemId });
      if (found) {
        logger.info(
          `Library ${library.Name} is already in the database. Updating…`,
        );
        await found.merge({ name: library.Name }).save();
      } else {
        logger.info(
          `Library ${library.Name} is not in the database. Creating…`,
        );
        await Library.create({
          jellyfinId: library.ItemId,
          name: library.Name,
          type: library.CollectionType as "movies" | "tvshows",
        });
      }
    }
  }

  async completed() {
    logger.info("Syncing libraries completed!");
  }
}
