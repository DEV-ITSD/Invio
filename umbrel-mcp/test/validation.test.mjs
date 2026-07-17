import assert from "node:assert/strict";
import test from "node:test";

import YAML from "yaml";

import { renderComposeWithImages, validation } from "../src/invio.mjs";

test("accepts versioned Invio release tags", () => {
  assert.match("v2.1.1-swiss.2", validation.releaseTagPattern);
  assert.match("v3.0.0", validation.releaseTagPattern);
});

test("rejects release-tag injection and arbitrary image references", () => {
  for (const value of ["latest", "latest;rm -rf /", "ghcr.io/evil/image:latest", "../tag", "tag with space"]) {
    assert.doesNotMatch(value, validation.releaseTagPattern);
  }
});

test("accepts only generated backup IDs", () => {
  assert.match("20260717T230000Z-0123abcd", validation.backupIdPattern);
  assert.doesNotMatch("../../data", validation.backupIdPattern);
});

test("changes only the fixed backend and frontend image fields", () => {
  const source = `services:\n  app_proxy:\n    environment:\n      APP_PORT: 8000\n  backend:\n    image: old-backend\n    environment:\n      ADMIN_USER: admin\n  frontend:\n    image: old-frontend\n`;
  const rendered = renderComposeWithImages(
    source,
    "ghcr.io/dev-itsd/invio-backend:v3@sha256:abc",
    "ghcr.io/dev-itsd/invio-frontend:v3@sha256:def",
  );
  const parsed = YAML.parse(rendered);
  assert.equal(parsed.services.backend.image, "ghcr.io/dev-itsd/invio-backend:v3@sha256:abc");
  assert.equal(parsed.services.frontend.image, "ghcr.io/dev-itsd/invio-frontend:v3@sha256:def");
  assert.equal(parsed.services.backend.environment.ADMIN_USER, "admin");
  assert.equal(parsed.services.app_proxy.environment.APP_PORT, 8000);
});
