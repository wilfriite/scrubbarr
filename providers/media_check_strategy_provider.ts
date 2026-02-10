import type { ApplicationService } from "@adonisjs/core/types";
import User from "#models/user";
import { JellyfinService } from "#services/jellyfin_service";
import { MediaCheckStrategy } from "#services/media_check/strategies/types";
import { MediaRequestService } from "#services/media_request_service";
import env from "#start/env";

export default class MediaCheckStrategyProvider {
  constructor(protected app: ApplicationService) {}

  public async boot() {
    this.app.container.bind(MediaCheckStrategy, async (resolver) => {
      const strategyType = env.get("MEDIA_CHECK_STRATEGY", "requester");
      const jellyfinService = await resolver.make(JellyfinService);
      const users = await User.all();

      if (strategyType === "everyone") {
        const { EveryoneMustSeeStrategy } = await import(
          "#services/media_check/strategies/everyone_must_see_strategy"
        );
        return new EveryoneMustSeeStrategy(jellyfinService, users);
      }

      const { OnlyRequesterMustSeeStrategy } = await import(
        "#services/media_check/strategies/only_requester_must_see_strategy"
      );
      // Par défaut : Requester strategy
      const requestService = await resolver.make(MediaRequestService);
      const [requests, err] = await requestService.getAllRequests();

      if (err) {
        throw new Error(
          `Failed to initialize OnlyRequesterMustSeeStrategy: ${err.message}`,
        );
      }

      return new OnlyRequesterMustSeeStrategy(jellyfinService, users, requests);
    });
  }
}
