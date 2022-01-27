const puppeteer = require('puppeteer');

(async () => {
    await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--remote-debugging-port=42069', '--start-maximized']
    });
})()