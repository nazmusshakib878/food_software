const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    await page.setViewport({ width: 1280, height: 800 });
    console.log('Navigating to vercel app...');
    
    // We are going to localhost first, because the Vercel app might not have pulled the latest changes yet
    // Actually, the user asked to check the vercel app specifically. So let's check vercel.
    await page.goto('https://food-software-sigma.vercel.app/', { waitUntil: 'networkidle2' });
    
    // Check if login modal is visible
    const loginModal = await page.$('#loginModal');
    if (loginModal) {
        console.log('Login modal is present.');
        // Try to click buttons. Note: On Vercel, the PIN might still be 4 digits because Vercel might not have deployed the 6-digit fix yet! 
        // We just pushed the 6 digit fix 5 minutes ago.
        await page.click('button.kiosk-numpad-btn:nth-child(1)'); // 1
        await page.click('button.kiosk-numpad-btn:nth-child(2)'); // 2
        await page.click('button.kiosk-numpad-btn:nth-child(3)'); // 3
        await page.click('button.kiosk-numpad-btn:nth-child(4)'); // 4
        await page.click('button.kiosk-numpad-btn:nth-child(5)'); // 5
        await page.click('button.kiosk-numpad-btn:nth-child(6)'); // 6
        await new Promise(r => setTimeout(r, 1000));
        
        const loginVisible = await page.evaluate(() => {
            const el = document.getElementById('loginModal');
            return el && window.getComputedStyle(el).display !== 'none';
        });
        console.log('Login modal visible after PIN entry:', loginVisible);
    }
    
    await browser.close();
})();
