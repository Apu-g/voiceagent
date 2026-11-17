import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
 testDir:"./tests",
 testMatch:"e2e.spec.mjs",
 timeout:30000,
 expect:{timeout:10000},
 fullyParallel:false,
 workers:1,
 reporter:"line",
 outputDir:"test-results",
 use:{...devices["Desktop Chrome"],baseURL:"http://localhost:3000",trace:"retain-on-failure"},
 webServer:{command:"npm run dev -- -p 3000",url:"http://localhost:3000",reuseExistingServer:!process.env.CI,timeout:45000}
});
