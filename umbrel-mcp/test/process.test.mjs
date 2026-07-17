import assert from "node:assert/strict";
import test from "node:test";

import { redact } from "../src/process.mjs";

test("redacts common credentials", () => {
  const input = "Authorization: Bearer abc.def JWT_SECRET=topsecret sk-proj-abcdefghijklmnop";
  const output = redact(input);
  assert.doesNotMatch(output, /abc\.def/);
  assert.doesNotMatch(output, /topsecret/);
  assert.doesNotMatch(output, /sk-proj-/);
});

