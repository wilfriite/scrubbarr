/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from "@adonisjs/core/env";

export default await Env.create(new URL("../", import.meta.url), {
  NODE_ENV: Env.schema.enum(["development", "production", "test"] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: "host" }),
  LOG_LEVEL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: "host" }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring API connections
  |----------------------------------------------------------
  */
  RADARR_API_KEY: Env.schema.string(),
  RADARR_URL: Env.schema.string({ format: "url" }),

  SONARR_API_KEY: Env.schema.string(),
  SONARR_URL: Env.schema.string({ format: "url" }),

  JELLYFIN_API_KEY: Env.schema.string(),
  JELLYFIN_URL: Env.schema.string({ format: "url" }),

  JELLYSTATS_API_KEY: Env.schema.string(),
  JELLYSTATS_URL: Env.schema.string({ format: "url" }),

  JELLYSEERR_API_KEY: Env.schema.string(),
  JELLYSEERR_URL: Env.schema.string({ format: "url" }),

  MEDIA_CHECK_STRATEGY: Env.schema.enum.optional([
    "everyone",
    "requester",
  ] as const),
});
