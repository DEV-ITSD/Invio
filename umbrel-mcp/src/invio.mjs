import crypto from "node:crypto";
import {
  constants as fsConstants,
  access,
  cp,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  statfs,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

import { config } from "./config.mjs";
import { redact, runFile } from "./process.mjs";

const RELEASE_TAG_PATTERN = /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z][0-9A-Za-z.-]{0,48})?$/;
const BACKUP_ID_PATTERN = /^\d{8}T\d{6}Z-[a-f0-9]{8}$/;
const MAX_LOG_BYTES = 50_000;
const OPERATION_LOCK_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function isoCompact(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function newBackupId() {
  return `${isoCompact()}-${crypto.randomBytes(4).toString("hex")}`;
}

function ensureReleaseTag(tag) {
  const normalized = String(tag || "").trim();
  if (!RELEASE_TAG_PATTERN.test(normalized)) {
    throw new Error("Invalid release tag. Expected a value such as v2.1.1-swiss.2.");
  }
  return normalized;
}

function ensureBackupId(id) {
  const normalized = String(id || "").trim();
  if (!BACKUP_ID_PATTERN.test(normalized)) {
    throw new Error("Invalid backup ID.");
  }
  return normalized;
}

async function ensurePaths() {
  await access(config.composePath, fsConstants.R_OK | fsConstants.W_OK);
  await access(config.dataDir, fsConstants.R_OK | fsConstants.W_OK);
  await access(config.umbrelAppScript, fsConstants.R_OK | fsConstants.X_OK);
  await mkdir(path.join(config.stateDir, "backups"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(config.stateDir, "audit"), { recursive: true, mode: 0o700 });
}

async function audit(action, detail = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    action,
    detail,
  };
  const auditPath = path.join(config.stateDir, "audit", `${isoCompact()}-${crypto.randomBytes(3).toString("hex")}.json`);
  await writeFile(auditPath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
}

async function withOperationLock(action, callback) {
  await mkdir(config.stateDir, { recursive: true, mode: 0o700 });
  const lockPath = path.join(config.stateDir, "operation.lock");
  let handle;

  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const lockStat = await stat(lockPath);
    if (Date.now() - lockStat.mtimeMs <= OPERATION_LOCK_MAX_AGE_MS) {
      throw new Error("Another Invio maintenance operation is already running.");
    }
    await rm(lockPath, { force: true });
    handle = await open(lockPath, "wx", 0o600);
  }

  try {
    await handle.writeFile(`${JSON.stringify({ action, pid: process.pid, startedAt: new Date().toISOString() })}\n`);
    return await callback();
  } finally {
    await handle.close().catch(() => {});
    await rm(lockPath, { force: true }).catch(() => {});
  }
}

async function docker(args, options = {}) {
  return runFile("docker", args, { timeout: 120_000, ...options });
}

async function containerInspect(containerName) {
  try {
    const { stdout } = await docker(["inspect", containerName]);
    const [item] = JSON.parse(stdout);
    return {
      name: containerName,
      exists: true,
      status: item?.State?.Status || "unknown",
      running: Boolean(item?.State?.Running),
      restarting: Boolean(item?.State?.Restarting),
      exitCode: item?.State?.ExitCode ?? null,
      restartCount: item?.RestartCount ?? 0,
      startedAt: item?.State?.StartedAt || null,
      image: item?.Config?.Image || null,
      imageId: item?.Image || null,
    };
  } catch (error) {
    if (String(error.message).includes("No such object")) {
      return { name: containerName, exists: false, status: "missing", running: false };
    }
    throw error;
  }
}

async function inspectEnvironment(containerName) {
  try {
    const { stdout } = await docker(["inspect", containerName]);
    const [item] = JSON.parse(stdout);
    return Object.fromEntries(
      (item?.Config?.Env || []).map((entry) => {
        const separator = entry.indexOf("=");
        return separator === -1
          ? [entry, ""]
          : [entry.slice(0, separator), entry.slice(separator + 1)];
      }),
    );
  } catch {
    return {};
  }
}

async function umbrelScriptEnvironment() {
  const [proxyEnvironment, tor] = await Promise.all([
    inspectEnvironment(config.expectedContainers.app_proxy),
    containerInspect(config.expectedContainers.tor_server),
  ]);

  return {
    ...process.env,
    SCRIPT_UMBREL_ROOT: config.umbrelRoot,
    SCRIPT_DOCKER_FRAGMENTS: config.dockerFragments,
    SCRIPT_APP_REPO_DIR: "",
    JWT_SECRET: proxyEnvironment.JWT_SECRET || "invio-proxy-auth-disabled",
    BITCOIN_NETWORK: "mainnet",
    TOR_PROXY_IP: "10.21.21.11",
    TOR_PROXY_PORT: "9050",
    REMOTE_TOR_ACCESS: tor.exists ? "true" : "false",
  };
}

async function runUmbrelAppScript(command, timeout = 180_000, preparedEnvironment = null) {
  const env = preparedEnvironment || (await umbrelScriptEnvironment());
  return runFile(config.umbrelAppScript, [command, config.appId], {
    env,
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
}

async function readComposeDocument() {
  const raw = await readFile(config.composePath, "utf8");
  const document = parseComposeDocument(raw);
  return { document, raw };
}

function parseComposeDocument(raw) {
  const document = YAML.parseDocument(raw);
  if (document.errors.length) {
    throw new Error(`Invio docker-compose.yml is invalid: ${document.errors[0].message}`);
  }
  return document;
}

async function currentImages() {
  const { document } = await readComposeDocument();
  return {
    backend: document.getIn(["services", "backend", "image"])?.toString() || null,
    frontend: document.getIn(["services", "frontend", "image"])?.toString() || null,
  };
}

async function writeComposeImages(backendImage, frontendImage) {
  const raw = await readFile(config.composePath, "utf8");
  const temporaryPath = `${config.composePath}.mcp-${process.pid}.tmp`;
  await writeFile(temporaryPath, renderComposeWithImages(raw, backendImage, frontendImage), { mode: 0o644 });
  await rename(temporaryPath, config.composePath);
}

export function renderComposeWithImages(raw, backendImage, frontendImage) {
  const document = parseComposeDocument(raw);
  if (!document.hasIn(["services", "backend"]) || !document.hasIn(["services", "frontend"])) {
    throw new Error("Invio docker-compose.yml must define backend and frontend services.");
  }
  document.setIn(["services", "backend", "image"], backendImage);
  document.setIn(["services", "frontend", "image"], frontendImage);
  return document.toString();
}

async function sha256File(filePath) {
  const contents = await readFile(filePath);
  return crypto.createHash("sha256").update(contents).digest("hex");
}

async function copyDataSnapshot(destination) {
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const databasePath = path.join(config.dataDir, "invio.db");
  const destinationDatabase = path.join(destination, "invio.db");

  await cp(config.dataDir, destination, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
    filter: (source) => {
      const relative = path.relative(config.dataDir, source);
      return !["invio.db", "invio.db-wal", "invio.db-shm"].includes(relative);
    },
  });

  await runFile("sqlite3", [databasePath, `.timeout 10000`, `.backup '${destinationDatabase.replaceAll("'", "''")}'`], {
    timeout: 60_000,
  });
}

export async function createBackup(reason = "manual") {
  await ensurePaths();
  return withOperationLock("backup", () => createBackupUnlocked(reason));
}

async function createBackupUnlocked(reason) {
  const backupId = newBackupId();
  const backupDir = path.join(config.stateDir, "backups", backupId);
  const backupDataDir = path.join(backupDir, "data");
  await mkdir(backupDir, { recursive: false, mode: 0o700 });

  try {
    await Promise.all([
      cp(config.composePath, path.join(backupDir, "docker-compose.yml"), { preserveTimestamps: true }),
      copyDataSnapshot(backupDataDir),
    ]);

    for (const optionalFile of ["settings.yml", "umbrel-app.yml"]) {
      const source = path.join(config.appDir, optionalFile);
      try {
        await cp(source, path.join(backupDir, optionalFile), { preserveTimestamps: true });
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }

    const metadata = {
      id: backupId,
      createdAt: new Date().toISOString(),
      reason: String(reason || "manual").slice(0, 200),
      images: await currentImages(),
      databaseSha256: await sha256File(path.join(backupDataDir, "invio.db")),
    };
    await writeFile(path.join(backupDir, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
    await audit("backup.created", { backupId, reason: metadata.reason });
    return metadata;
  } catch (error) {
    await rm(backupDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

export async function listBackups(limit = 10) {
  await ensurePaths();
  const entries = await readdir(path.join(config.stateDir, "backups"), { withFileTypes: true });
  const ids = entries
    .filter((entry) => entry.isDirectory() && BACKUP_ID_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .slice(0, Math.max(1, Math.min(50, limit)));

  const backups = [];
  for (const id of ids) {
    try {
      backups.push(JSON.parse(await readFile(path.join(config.stateDir, "backups", id, "metadata.json"), "utf8")));
    } catch {
      backups.push({ id, metadata: "unavailable" });
    }
  }
  return backups;
}

async function pullPinnedImage(repository, releaseTag) {
  const taggedImage = `${repository}:${releaseTag}`;
  await docker(["pull", taggedImage], { timeout: 10 * 60_000, maxBuffer: 8 * 1024 * 1024 });
  const { stdout } = await docker(["image", "inspect", taggedImage]);
  const [image] = JSON.parse(stdout);
  const repositoryDigest = (image?.RepoDigests || []).find((entry) => entry.startsWith(`${repository}@sha256:`));
  if (!repositoryDigest) {
    throw new Error(`Docker did not report a digest for ${taggedImage}.`);
  }
  const digest = repositoryDigest.slice(repository.length + 1);
  return `${taggedImage}@${digest}`;
}

async function waitForApplication(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let last = [];
  while (Date.now() < deadline) {
    last = await Promise.all(
      ["backend", "frontend", "app_proxy"].map((service) =>
        containerInspect(config.expectedContainers[service]),
      ),
    );
    if (last.every((container) => container.running && !container.restarting)) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const stable = await Promise.all(
        ["backend", "frontend", "app_proxy"].map((service) =>
          containerInspect(config.expectedContainers[service]),
        ),
      );
      if (stable.every((container) => container.running && !container.restarting)) return stable;
      last = stable;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Invio did not become stable before timeout: ${JSON.stringify(last)}`);
}

async function restoreBackupUnlocked(backupId, restoreData) {
  const id = ensureBackupId(backupId);
  const backupDir = path.join(config.stateDir, "backups", id);
  const backupCompose = path.join(backupDir, "docker-compose.yml");
  await access(backupCompose, fsConstants.R_OK);
  if (restoreData) await access(path.join(backupDir, "data", "invio.db"), fsConstants.R_OK);

  const rollbackSuffix = `${isoCompact()}-${crypto.randomBytes(3).toString("hex")}`;
  const previousCompose = `${config.composePath}.pre-rollback-${rollbackSuffix}`;
  const previousData = path.join(config.appDir, `data.pre-rollback-${rollbackSuffix}`);
  const umbrelEnvironment = await umbrelScriptEnvironment();
  await cp(config.composePath, previousCompose, { preserveTimestamps: true });

  await runUmbrelAppScript("stop", 180_000, umbrelEnvironment);
  let dataMoved = false;
  try {
    if (restoreData) {
      await rename(config.dataDir, previousData);
      dataMoved = true;
      await cp(path.join(backupDir, "data"), config.dataDir, {
        recursive: true,
        preserveTimestamps: true,
      });
    }
    await cp(backupCompose, config.composePath, { preserveTimestamps: true });
    await runUmbrelAppScript("start", 10 * 60_000, umbrelEnvironment);
    const containers = await waitForApplication();
    await audit("rollback.completed", { backupId: id, restoreData, previousData: dataMoved ? previousData : null });
    return { backupId: id, restoreData, containers, preservedPreviousData: dataMoved ? previousData : null };
  } catch (error) {
    await runUmbrelAppScript("stop", 180_000, umbrelEnvironment).catch(() => {});
    await cp(previousCompose, config.composePath, { preserveTimestamps: true }).catch(() => {});
    if (dataMoved) {
      const failedData = path.join(config.appDir, `data.failed-rollback-${rollbackSuffix}`);
      await rename(config.dataDir, failedData).catch(() => {});
      await rename(previousData, config.dataDir).catch(() => {});
    }
    await runUmbrelAppScript("start", 10 * 60_000, umbrelEnvironment).catch(() => {});
    await audit("rollback.failed", { backupId: id, error: redact(error.message) }).catch(() => {});
    throw error;
  }
}

export async function rollbackBackup(backupId, restoreData = true) {
  await ensurePaths();
  return withOperationLock("rollback", () => restoreBackupUnlocked(backupId, restoreData));
}

export async function deployRelease(releaseTag) {
  await ensurePaths();
  const tag = ensureReleaseTag(releaseTag);
  return withOperationLock("deploy", async () => {
    await audit("deploy.started", { releaseTag: tag });
    const [backendImage, frontendImage] = await Promise.all([
      pullPinnedImage(config.backendRepository, tag),
      pullPinnedImage(config.frontendRepository, tag),
    ]);
    const backup = await createBackupUnlocked(`before deploy ${tag}`);

    try {
      await writeComposeImages(backendImage, frontendImage);
      await runUmbrelAppScript("start", 10 * 60_000);
      const containers = await waitForApplication();
      await audit("deploy.completed", {
        releaseTag: tag,
        backupId: backup.id,
        backendImage,
        frontendImage,
      });
      return {
        releaseTag: tag,
        backupId: backup.id,
        backendImage,
        frontendImage,
        containers,
      };
    } catch (deployError) {
      let rollback;
      try {
        rollback = await restoreBackupUnlocked(backup.id, true);
      } catch (rollbackError) {
        await audit("deploy.rollback_failed", {
          releaseTag: tag,
          backupId: backup.id,
          deployError: redact(deployError.message),
          rollbackError: redact(rollbackError.message),
        }).catch(() => {});
        throw new Error(
          `Deployment failed and automatic rollback also failed. Deploy: ${redact(deployError.message)} Rollback: ${redact(rollbackError.message)}`,
        );
      }
      await audit("deploy.rolled_back", {
        releaseTag: tag,
        backupId: backup.id,
        error: redact(deployError.message),
      });
      throw new Error(
        `Deployment failed and was rolled back to backup ${backup.id}: ${redact(deployError.message)}; rollback result: ${JSON.stringify(rollback)}`,
      );
    }
  });
}

export async function restartApplication() {
  await ensurePaths();
  return withOperationLock("restart", async () => {
    await runUmbrelAppScript("restart", 10 * 60_000);
    const containers = await waitForApplication();
    await audit("application.restarted", {});
    return { containers };
  });
}

export async function getStatus() {
  await ensurePaths();
  const [containers, images, disk, backups] = await Promise.all([
    Promise.all(Object.values(config.expectedContainers).map(containerInspect)),
    currentImages(),
    statfs(config.appDir),
    listBackups(5),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    images,
    containers,
    disk: {
      totalBytes: disk.blocks * disk.bsize,
      freeBytes: disk.bavail * disk.bsize,
    },
    recentBackups: backups,
  };
}

export async function verifyApplication() {
  await ensurePaths();
  const containers = await waitForApplication(30_000);
  return {
    verifiedAt: new Date().toISOString(),
    healthy: true,
    containers,
    images: await currentImages(),
  };
}

export async function getLogs(service, tail = 100) {
  const containerName = config.expectedContainers[service];
  if (!containerName) throw new Error("Unknown Invio service.");
  const safeTail = Math.max(20, Math.min(500, Number(tail) || 100));
  const { stdout, stderr } = await docker([
    "logs",
    "--timestamps",
    "--tail",
    String(safeTail),
    containerName,
  ]);
  const combined = redact(`${stdout}${stderr}`);
  return {
    service,
    container: containerName,
    tail: safeTail,
    truncated: combined.length > MAX_LOG_BYTES,
    logs: combined.slice(-MAX_LOG_BYTES),
  };
}

export const validation = Object.freeze({
  releaseTagPattern: RELEASE_TAG_PATTERN,
  backupIdPattern: BACKUP_ID_PATTERN,
});
