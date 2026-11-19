import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./a11y',
  testMatch:'orca-screen-reader.spec.js',
  workers:1,
  retries:0,
  timeout:180_000,
  outputDir:'test-results-orca',
  use:{
    baseURL:'http://127.0.0.1:4173',
    headless:false,
    viewport:{width:1536,height:864},
    serviceWorkers:'block',
    launchOptions:{args:['--force-renderer-accessibility','--disable-features=Translate']},
    screenshot:'only-on-failure',
    trace:'retain-on-failure',
  },
  webServer:{command:'npm run build && npm run serve',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:30_000},
});
