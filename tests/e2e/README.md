# E2E Tests

## Auth & Storage State

E2E tests require an authenticated Playwright session. The suite uses `storageState` (cookie-based session) to authenticate.

### Local Development

1. **Generate storage state locally:**
   ```bash
   npm run build
   npm run preview -- --port 4173 &
   E2E_BASE_URL=http://localhost:4173 E2E_TEST_USER=your@email.com E2E_TEST_PASS=YourPassword node ./scripts/ci/generate-storage-state.js
   ```

2. **Run tests:**
   ```bash
   npm run test:e2e
   ```

### CI/CD

The `e2e-smoke` job in `.github/workflows/ci.yml` requires two repository secrets:

- **`E2E_TEST_USER`** — Email of a valid test user account in the shared dev Supabase instance
- **`E2E_TEST_PASS`** — Password for that test user

Before tests run, the CI script:
1. Builds the app
2. Starts the preview server
3. Generates `tests/e2e/storageState.json` using the test credentials
4. Runs Playwright with the authenticated session

### Rotating Credentials

If the test user credentials are compromised or need rotation:

1. Update the test user password in Supabase
2. Update the `E2E_TEST_USER` and `E2E_TEST_PASS` secrets in GitHub repo settings
3. Re-run the `e2e-smoke` job to regenerate the storage state

### Troubleshooting

If tests fail with "User is not authenticated":

1. Verify `E2E_TEST_USER` and `E2E_TEST_PASS` are set in the environment
2. Confirm the test user exists in the Supabase instance
3. Check that the password is correct and the account is not suspended
4. Regenerate storage state and retry
