import { execFile } from "node:child_process";

const DEFAULT_MAX_BUFFER = 2 * 1024 * 1024;

export function redact(value) {
  return String(value ?? "")
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s"']+/gi, "$1[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_OPENAI_KEY]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(/((?:admin_pass|jwt_secret|app_seed|password|secret|token)\s*[:=]\s*)[^\s,"']+/gi, "$1[REDACTED]");
}

export function runFile(file, args = [], options = {}) {
  const {
    cwd,
    env = process.env,
    timeout = 60_000,
    maxBuffer = DEFAULT_MAX_BUFFER,
  } = options;

  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        cwd,
        env,
        timeout,
        maxBuffer,
        encoding: "utf8",
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ stdout, stderr });
          return;
        }

        const exitDescription = error.killed
          ? `timed out after ${timeout} ms`
          : `exited with code ${error.code ?? "unknown"}`;
        const detail = redact(stderr || stdout).trim().slice(-8_000);
        const wrapped = new Error(
          `${file} ${exitDescription}${detail ? `: ${detail}` : ""}`,
          { cause: error },
        );
        wrapped.code = error.code;
        reject(wrapped);
      },
    );
  });
}

