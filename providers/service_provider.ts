import type { ApplicationService } from "@adonisjs/core/types";
import { JellyfinService } from "#services/jellyfin_service";
import { MediaRequestService } from "#services/media_request_service";
import { RadarrService } from "#services/radarr_service";
import { SonarrService } from "#services/sonarr_service";

export default class ServiceProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton(JellyfinService, () => new JellyfinService());
    this.app.container.singleton(
      MediaRequestService,
      () => new MediaRequestService(),
    );
    this.app.container.singleton(RadarrService, () => new RadarrService());
    this.app.container.singleton(SonarrService, () => new SonarrService());
  }
}
