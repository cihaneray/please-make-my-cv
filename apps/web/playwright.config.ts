import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:3101",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "uv run uvicorn app.main:app --host 127.0.0.1 --port 8101",
      cwd: "../api",
      url: "http://127.0.0.1:8101/api/health",
      env: {
        DATABASE_URL: "sqlite:///./e2e.db",
        SEED_DEMO: "false",
        AI_CONFIG_PATH: "data/e2e-ai-settings.json",
      },
      reuseExistingServer: false,
    },
    {
      command: "npm run build && npm run start -- --port 3101",
      url: "http://127.0.0.1:3101",
      env: { API_INTERNAL_URL: "http://127.0.0.1:8101", CV_E2E: "1" },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
