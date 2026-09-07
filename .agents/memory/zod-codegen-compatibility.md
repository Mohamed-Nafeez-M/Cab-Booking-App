---
name: Generated Zod compatibility
description: Compatibility constraint between the workspace OpenAPI generator and its installed Zod runtime.
---

The workspace's generated Zod client currently targets Zod 3, so OpenAPI `format: email` and `type: integer` can generate Zod 4-only helpers (`z.email()` and `z.int()`). Prefer compatible primitives or update the generator/runtime together.

**Why:** Code generation completed successfully but the chained library typecheck failed until the contract stopped emitting Zod 4-only helpers.

**How to apply:** When expanding the API contract, validate generated libraries immediately and avoid changing the Zod major version as an incidental feature change.