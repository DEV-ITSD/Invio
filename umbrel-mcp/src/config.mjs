import path from "node:path";

const umbrelRoot = process.env.UMBREL_ROOT || "/home/umbrel/umbrel";
const appId = "invio";

export const config = Object.freeze({
  appId,
  umbrelRoot,
  appDir: path.join(umbrelRoot, "app-data", appId),
  dataDir: path.join(umbrelRoot, "app-data", appId, "data"),
  composePath: path.join(umbrelRoot, "app-data", appId, "docker-compose.yml"),
  umbrelAppScript:
    process.env.UMBREL_APP_SCRIPT ||
    "/opt/umbreld/source/modules/apps/legacy-compat/app-script",
  dockerFragments:
    process.env.UMBREL_DOCKER_FRAGMENTS ||
    "/opt/umbreld/source/modules/apps/legacy-compat",
  stateDir: process.env.STATE_DIR || "/state",
  sharedSecretFile:
    process.env.MCP_SHARED_SECRET_FILE || "/run/secrets/mcp-shared-secret",
  listenHost: process.env.LISTEN_HOST || "0.0.0.0",
  listenPort: Number.parseInt(process.env.PORT || "8765", 10),
  backendRepository: "ghcr.io/dev-itsd/invio-backend",
  frontendRepository: "ghcr.io/dev-itsd/invio-frontend",
  expectedContainers: Object.freeze({
    backend: "invio_backend_1",
    frontend: "invio_frontend_1",
    app_proxy: "invio_app_proxy_1",
    tor_server: "invio-tor_server-1",
  }),
});

