import app from "@adonisjs/core/services/app";
import logger from "@adonisjs/core/services/logger";
import { jellyseerrApiClient } from "#start/api-clients";
import env from "#start/env";
import { safe } from "#utils/safe";

/**
 * Pre-launch checks to ensure the configuration is consistent.
 * If a strategy requires Jellyseerr but it's not configured or reachable, the app will crash.
 */
const strategy = env.get("MEDIA_CHECK_STRATEGY");
const jellyseerrUrl = env.get("JELLYSEERR_URL");
const jellyseerrApiKey = env.get("JELLYSEERR_API_KEY");

const isJellyseerrConfigured = !!(jellyseerrUrl && jellyseerrApiKey);

if (strategy === "requester") {
  if (!isJellyseerrConfigured) {
    logger.error(
      'FATAL: The "requester" strategy requires Jellyseerr configuration.',
    );
    logger.error(
      "Please set JELLYSEERR_URL and JELLYSEERR_API_KEY in your .env file.",
    );
    logger.error(
      'Alternatively, switch to the "everyone" strategy by setting MEDIA_CHECK_STRATEGY=everyone.',
    );
    await app.terminate();
    process.exit(1);
  }

  logger.info("[Checks] Verifying Jellyseerr connection...");
  const [_, err] = await safe(jellyseerrApiClient.get("status").json());

  if (err) {
    logger.error(`FATAL: Jellyseerr instance is unreachable: ${err.message}`);
    logger.error("Please check your JELLYSEERR_URL and JELLYSEERR_API_KEY.");
    process.exit(1);
  }

  logger.info("[Checks] Jellyseerr connection OK.");
} else {
  logger.info(
    `[Checks] Strategy "${strategy}" active. Jellyseerr is optional.`,
  );
}
