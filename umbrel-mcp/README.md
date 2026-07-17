# Invio Umbrel MCP

This private operations bridge lets a ChatGPT developer-mode app inspect and maintain the Invio installation on one Umbrel through OpenAI Secure MCP Tunnel. It exposes narrowly scoped Invio tools and intentionally does not expose a shell.

## Tools

- `invio_status` and `invio_verify`
- `invio_logs`
- `invio_backup` and `invio_list_backups`
- `invio_deploy`
- `invio_restart`
- `invio_rollback`

Deployments only accept a version tag and always use the fixed public image repositories `ghcr.io/dev-itsd/invio-backend` and `ghcr.io/dev-itsd/invio-frontend`. Before changing Compose, the bridge creates a consistent SQLite snapshot and data/configuration backup. Failed deployments trigger an automatic rollback.

## Umbrel installation

Create an OpenAI tunnel and a runtime API key with Tunnels Read + Use. Run the installer with the tunnel ID; enter the runtime key only into the hidden prompt on Umbrel:

```bash
curl -fsSL https://raw.githubusercontent.com/DEV-ITSD/Invio/main/umbrel-mcp/install.sh \
  | sudo bash -s -- tunnel_0123456789abcdef0123456789abcdef
```

For a reproducible installation, use a 40-character commit SHA for both the installer URL and the optional second installer argument. The installer will then pull the matching `sha-<commit>` image tag instead of `latest`.

The installer stores secrets below `/home/umbrel/umbrel/app-data/invio-mcp/secrets` with root-only permissions. It downloads the public `ghcr.io/dev-itsd/invio-umbrel-mcp` image, falling back to a local build only if the pull fails. It publishes no host ports. Both services restart automatically unless explicitly stopped.

## Security boundaries

- OpenAI connectivity is outbound-only through `api.openai.com:443`.
- The local MCP endpoint is reachable only on the private Compose network and requires a random shared header.
- No user-controlled shell commands, file paths, image repositories, or container names are accepted.
- Logs are bounded and common credentials are redacted.
- The MCP container has access to the Docker socket and Umbrel application data because those privileges are required for deployment and rollback. Treat the image and repository as privileged infrastructure code.
- Runtime secrets are never committed to GitHub.

## Local tests

```bash
npm ci
npm test
```
