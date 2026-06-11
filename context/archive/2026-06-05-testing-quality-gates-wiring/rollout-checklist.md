# Rollout checklist — enable e2e-smoke gate

Purpose: short checklist and owner notes for promoting the e2e-smoke workflow job to a required branch-protection check.

Steps:

1. Confirm job stability
   - Run the `e2e-smoke` job on several recent PRs (3–5) to observe flakiness and false positives.
   - If flaky, stabilize the spec (increase timeouts, use stable selectors) before promoting.

2. Verify CI secrets
   - Ensure the following repository secrets exist and are owned by the platform team:
     - `PLAYWRIGHT_STORAGE_STATE` (or `E2E_TEST_USER` / `E2E_TEST_PASS` depending on auth flow)
     - `SUPABASE_URL`, `SUPABASE_KEY` and `SUPABASE_ACCESS_TOKEN` (if migrations/seed steps are run in CI)
   - How to rotate: update the secret in Settings → Secrets → Actions and trigger a test PR.

3. Validate logs & artifacts
   - Confirm the workflow run logs are reachable from PR comments (the job posts a Logs link on failure).
   - Optionally add artifact upload (Playwright report / traces) in the job for deeper diagnosis.

4. Branch protection (promotion)
   - When stable, add a Branch Protection Rule for `main` requiring the `e2e-smoke` check.
   - Recommend a staged promotion: make the check required for a short-lived release branch first.

5. Owners & communication
   - Owners: @team/platform (update to the actual owners)
   - Communicate rollout plan on the engineering channel and in PR templates.

6. Post-mortem & rollback
   - If the gate causes excessive CI noise, remove the "required" designation and iterate on test stability.

Notes:
- The `e2e-smoke` job is intentionally narrow (single spec) to minimize CI time.
- To refresh the storageState artifact for CI, run the project's storageState generation script (if available) and update the `PLAYWRIGHT_STORAGE_STATE` secret.
