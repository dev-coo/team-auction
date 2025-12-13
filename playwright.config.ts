import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // 순차 실행 (동시 입찰 테스트에서 순서 제어 필요)
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "html",
  timeout: 120000, // 2분 (경매 전체 흐름 테스트용)

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    video: "on", // 테스트 영상 녹화
    screenshot: "on",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
