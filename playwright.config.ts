import { defineConfig } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  //retries : 1,
  timeout : 40 * 1000,
  expect : {timeout : 30 * 1000,},
  reporter: 'html',
  
  use: {
    baseURL : 'https://eventhub.rahulshettyacademy.com',
    browserName : 'chromium',
    headless : false,
    screenshot : 'on',
    trace : 'retain-on-failure',
  },

});

