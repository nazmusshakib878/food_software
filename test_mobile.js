const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setViewport({ width: 375, height: 812 });
    await page.goto('https://food-software-sigma.vercel.app/', { waitUntil: 'networkidle2' });
    
    await page.screenshot({ path: 'local_mobile_login.png' });
    
    // Login
    const loginModal = await page.$('#loginModal');
    if (loginModal) {
        for (let i = 1; i <= 6; i++) {
            await page.click('button.kiosk-numpad-btn:nth-child(' + i + ')');
            await new Promise(r => setTimeout(r, 50));
        }
        await page.click('button.kiosk-login-btn');
        await new Promise(r => setTimeout(r, 1000));
    }
    
    await page.screenshot({ path: 'local_mobile_pos.png' });
    console.log('Mobile screenshots taken.');
    await browser.close();
})();
