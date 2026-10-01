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
    
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('file:///c:/Users/User/Desktop/APP/index.html?shift=started', { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Switch to split view
    await page.evaluate(() => {
        const splitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('POS Split View'));
        if(splitBtn) splitBtn.click();
        
        const wrapper = document.getElementById('posCartTableWrapper');
        if (wrapper) {
            let html = '<table style="width:100%"><tbody>';
            for(let i=0; i<30; i++) {
                html += '<tr><td style="padding:20px; border-bottom: 1px solid #ccc;">Item '+i+'</td></tr>';
            }
            html += '</tbody></table>';
            wrapper.innerHTML = html;
        }
    });
    
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'laptop_split_view.png' });
    
    console.log('Laptop screenshot taken.');
    await browser.close();
})();
