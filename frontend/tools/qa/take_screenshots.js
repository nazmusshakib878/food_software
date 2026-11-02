const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    console.log('Navigating to vercel app...');
    await page.goto('https://food-software-sigma.vercel.app/', { waitUntil: 'networkidle2' });
    
    // Login
    const loginModal = await page.$('#loginModal');
    if (loginModal) {
        console.log('Entering PIN...');
        // Try to click buttons (assuming 6 digits 123456)
        for (let i = 1; i <= 6; i++) {
            await page.click(`button.kiosk-numpad-btn:nth-child(${i})`);
            await new Promise(r => setTimeout(r, 100));
        }
        await page.click('button.kiosk-login-btn'); // click login
        await new Promise(r => setTimeout(r, 2000));
    }
    
    // Take screenshot of POS screen
    await page.screenshot({ path: 'vercel_pos_screen.png' });
    console.log('Saved vercel_pos_screen.png');
    
    // Navigate to Admin Screen
    await page.evaluate(() => {
        if(typeof switchMainScreen === 'function') switchMainScreen('admin');
    });
    await new Promise(r => setTimeout(r, 2000));
    
    // Switch to orders tab
    await page.evaluate(() => {
        if(typeof switchAdminTab === 'function') switchAdminTab('orders', null);
    });
    await new Promise(r => setTimeout(r, 2000));
    
    await page.screenshot({ path: 'vercel_admin_orders.png' });
    console.log('Saved vercel_admin_orders.png');
    
    await browser.close();
})();
