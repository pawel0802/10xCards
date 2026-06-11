# ts-fsrs Compatibility Smoke Test

Date: 2026-05-30

Summary:
- Node runtime: Importing `ts-fsrs` and calling `scheduler.next()` in Node succeeded. Quick smoke script `context/changes/spaced-repetition-review/test-ts-fsrs.mjs` runs and returns a scheduler result (smoke output observed: `ts-fsrs smoke test: SUCCESS`).
- Bundling for Cloudflare Workers: esbuild was used to bundle the same test script for the browser/worker target. `esbuild --platform=browser` produced a bundle without errors (`dist-test-bundle.js`).

Conclusion:
- `ts-fsrs` works in Node and can be bundled for Worker runtime with esbuild. This suggests Cloudflare Workers compatibility is likely, but a final verification should run the bundle inside a Worker dev runtime (wrangler dev) or an equivalent Worker runner to validate global/polyfill differences (e.g., globalThis, crypto). If that final run fails, fallback is to run the scheduler in a Node serverless environment (Cloudflare Worker -> Node fallback path documented below).

Next steps / Notes:
- Recommended final verification: run `wrangler dev` with a small Worker that imports the bundled file and executes `scheduler.next()` to confirm runtime behavior.

Node fallback (if Workers incompatible):
- Keep `ts-fsrs` usage server-side in a Node runtime (Cloudflare Functions / serverless or a small service behind an internal API). Use the Supabase service-role key for transactions or keep the RPC pattern and call the scheduler in the Node service. Document secret handling (service key storage and rotation) in the deployment README.

Artifacts created during this test:
- `context/changes/spaced-repetition-review/test-ts-fsrs.mjs` — smoke script used for tests
- `context/changes/spaced-repetition-review/dist-test-bundle.js` — esbuild output bundle

Recorded-by: Copilot
