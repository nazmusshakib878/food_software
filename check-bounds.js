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
        if (typeof removeKioskLoginOverlay === 'function') {
             removeKioskLoginOverlay();
        }
    });
    await new Promise(r => setTimeout(r, 500));

    const bounds = await page.evaluate(() => {
        const orderPanel = document.querySelector('.pos-order-panel');
        const catalogPanel = document.querySelector('.pos-catalog-panel');
        const layout = document.querySelector('.pos-layout');
        return {
            layout: layout ? layout.getBoundingClientRect() : null,
            orderPanel: orderPanel ? orderPanel.getBoundingClientRect() : null,
            catalogPanel: catalogPanel ? catalogPanel.getBoundingClientRect() : null,
            catalogPanelDisplay: catalogPanel ? window.getComputedStyle(catalogPanel).display : null,
            catalogPanelVisibility: catalogPanel ? window.getComputedStyle(catalogPanel).visibility : null,
            catalogPanelOpacity: catalogPanel ? window.getComputedStyle(catalogPanel).opacity : null,
        };
    });

    console.log(JSON.stringify(bounds, null, 2));
    await browser.close();
})();
