const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto('file://' + __dirname + '/index.html');
    await new Promise(r => setTimeout(r, 2000));
    
    // Login to remove overlay
    await page.evaluate(() => {
        if (typeof selectLoginRole === 'function') {
            selectLoginRole('admin');
            const pinInput = document.getElementById('loginPinInput');
            if (pinInput) {
                pinInput.value = '123456';
                document.querySelector('form').dispatchEvent(new Event('submit'));
            }
        }
        if (typeof submitKioskPin === 'function') {
            submitKioskPin('0000');
        }
        if (typeof removeKioskLoginOverlay === 'function') {
             removeKioskLoginOverlay();
        }
    });

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshot.png' });
    await browser.close();
    console.log('Screenshot saved to screenshot.png');
})();
