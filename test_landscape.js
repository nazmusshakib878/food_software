const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Set localStorage to bypass login
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('nurpos_user', JSON.stringify({ role: 'admin', name: 'Admin' }));
        localStorage.setItem('nurpos_current_shift', JSON.stringify({
            name: 'Test Shift',
            englishName: 'Test Shift',
            openingCash: 100,
            notes: '',
            startedAt: new Date().toISOString()
        }));
    });
    
    await page.setViewport({ width: 640, height: 360 });
    await page.goto('file:///c:/Users/User/Desktop/APP/index.html?shift=started', { waitUntil: 'networkidle2' });
    
    // Check for login modal and close it if it's there
    try {
        await page.evaluate(() => {
            const m = document.getElementById('loginModal');
            if(m) m.classList.remove('open', 'active');
        });
    } catch(e) {}
    
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'local_mobile_pos.png' });
    
    // Open mobile cart
    try {
        await page.evaluate(() => {
            // Add some items to currentCart
            for(let i=0; i<10; i++) {
                currentCart.push({
                    id: i,
                    name: "Item " + i,
                    price: 10,
                    qty: 1
                });
            }
            renderCart();
            
            const panel = document.getElementById('posOrderPanel');
            if(panel) panel.classList.add('mobile-open');
        });
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'local_landscape_cart.png' });
    } catch(e) {}

    
    console.log('Mobile screenshots taken.');
    await browser.close();
})();
