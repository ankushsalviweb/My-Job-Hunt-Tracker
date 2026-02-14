import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 60000,
    expect: {
        timeout: 10000,
    },
    use: {
        baseURL: 'http://localhost:3000',
        headless: false,
        viewport: { width: 1440, height: 900 },
        actionTimeout: 10000,
        screenshot: 'on',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
    reporter: [['html', { open: 'never' }]],
});
