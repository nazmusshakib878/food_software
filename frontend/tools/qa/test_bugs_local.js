const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    let errors = [];
    page.on('pageerror', err => errors.push('JS ERROR: ' + err.toString()));
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push('CONSOLE ERROR: ' + msg.text());
    });
    
    await page.goto('https://food-software-sigma.vercel.app/', { waitUntil: 'networkidle2' });
    
    // Login
    const loginModal = await page.$('#loginModal');
    if (loginModal) {
        for (let i = 1; i <= 6; i++) {
            await page.click('button.kiosk-numpad-btn:nth-child(' + i + ')');
            await new Promise(r => setTimeout(r, 50));
        }
        await page.click('button.kiosk-login-btn');
        await new Promise(r => setTimeout(r, 500));
    }
    
    // Test POS
    await page.evaluate(() => {
        if(typeof filterCategory === 'function') filterCategory('sandwiches', null);
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Add to cart
    await page.evaluate(() => {
        if(typeof addToCart === 'function') addToCart('item_hashi_kebab');
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Go to admin
    await page.evaluate(() => {
        if(typeof switchMainScreen === 'function') switchMainScreen('admin');
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Go to returns
    await page.evaluate(() => {
        if(typeof switchMainScreen === 'function') switchMainScreen('returns');
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Open settings
    await page.evaluate(() => {
        if(typeof switchAdminTab === 'function') switchAdminTab('settings', null);
    });
    await new Promise(r => setTimeout(r, 500));
    
    console.log(JSON.stringify(errors, null, 2));
    
    await browser.close();
})();
