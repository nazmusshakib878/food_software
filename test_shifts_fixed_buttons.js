const puppeteer = require('puppeteer');

async function runTests() {
    console.log('=== NUR FOODES POS - SHIFTS SCREEN FIXED BOTTOM BUTTONS VERIFICATION ===\n');
    let allPassed = true;

    const browser = await puppeteer.launch({ headless: 'new' });

    try {
        const page = await browser.newPage();

        // Helper to setup page with authenticated state and sample shifts
        async function setupPage(viewport, lang = 'en', shiftCount = 3) {
            await page.setViewport(viewport);
            await page.evaluateOnNewDocument((l, count) => {
                localStorage.setItem('nurpos_user', JSON.stringify({ role: 'admin', name: 'Admin', pin: '1234' }));
                localStorage.setItem('nurpos_lang', l);
                
                const sampleShifts = [];
                const cashiers = [
                    { en: 'Nawaf Saeed Ali Saeed', ar: 'نواف سعيد علي سعيد' },
                    { en: 'Rayhan Ali', ar: 'ريحان علي' },
                    { en: 'Saddam Zain', ar: 'صدام زين' },
                    { en: 'Ahmed Al-Harbi', ar: 'أحمد الحربي' },
                    { en: 'Mustafa Omar', ar: 'مصطفى عمر' },
                    { en: 'Faisal Mansour', ar: 'فيصل منصور' }
                ];
                
                for (let i = 1; i <= count; i++) {
                    const c = cashiers[(i - 1) % cashiers.length];
                    sampleShifts.push({
                        id: 'SH-00' + i,
                        cashier: c.en,
                        cashierEn: c.en,
                        cashierAr: c.ar,
                        status: i === 1 ? 'active' : 'closed',
                        openedAt: '2026-10-12T12:37:00.000Z',
                        closedAt: i === 1 ? null : '2026-10-12T16:30:00.000Z',
                        openingCash: 200
                    });
                }
                localStorage.setItem('nurpos_shifts', JSON.stringify(sampleShifts));
            }, lang, shiftCount);

            await page.goto('file:///c:/Users/User/Desktop/APP/index.html', { waitUntil: 'networkidle0' });
            await page.evaluate((l) => {
                if (typeof closeLoginModal === 'function') closeLoginModal();
                const m = document.getElementById('loginModal');
                if (m) m.classList.remove('open', 'active');
                if (typeof applyLanguage === 'function') applyLanguage(l);
                switchView('shifts');
            }, lang);

            await new Promise(r => setTimeout(r, 400));
        }

        // Helper to get button metrics
        async function getButtonsMetrics() {
            return await page.evaluate(() => {
                const footer = document.getElementById('shiftsFooter') || document.querySelector('.shifts-footer');
                const btnClose = document.querySelector('.btn-close-branch');
                const btnPrint = document.querySelector('.btn-print-branch');
                const mainContent = document.getElementById('shiftsMainContent');
                const lastRow = document.querySelector('.shift-row:last-child');
                
                const fRect = footer ? footer.getBoundingClientRect() : null;
                const cRect = btnClose ? btnClose.getBoundingClientRect() : null;
                const pRect = btnPrint ? btnPrint.getBoundingClientRect() : null;
                const mRect = mainContent ? mainContent.getBoundingClientRect() : null;
                const lRect = lastRow ? lastRow.getBoundingClientRect() : null;
                
                const cStyle = btnClose ? window.getComputedStyle(btnClose) : null;
                const pStyle = btnPrint ? window.getComputedStyle(btnPrint) : null;

                return {
                    footerExists: !!footer,
                    windowHeight: window.innerHeight,
                    windowWidth: window.innerWidth,
                    fRect: fRect ? { top: fRect.top, bottom: fRect.bottom, height: fRect.height } : null,
                    cRect: cRect ? { left: cRect.left, right: cRect.right, top: cRect.top, bottom: cRect.bottom, width: cRect.width, height: cRect.height } : null,
                    pRect: pRect ? { left: pRect.left, right: pRect.right, top: pRect.top, bottom: pRect.bottom, width: pRect.width, height: pRect.height } : null,
                    mScroll: mainContent ? { scrollHeight: mainContent.scrollHeight, clientHeight: mainContent.clientHeight, scrollTop: mainContent.scrollTop } : null,
                    lRect: lRect ? { top: lRect.top, bottom: lRect.bottom } : null,
                    cBg: cStyle ? cStyle.backgroundColor : '',
                    pBg: pStyle ? pStyle.backgroundColor : '',
                    cText: btnClose ? btnClose.innerText.trim() : '',
                    pText: btnPrint ? btnPrint.innerText.trim() : '',
                    htmlDir: document.documentElement.getAttribute('dir')
                };
            });
        }

        // TEST 1: Desktop English - Position, Color, Alignment
        console.log('--- TEST 1: Desktop (1200x800) English Layout ---');
        await setupPage({ width: 1200, height: 800 }, 'en', 3);
        let m = await getButtonsMetrics();
        
        const t1_leftOk = m.cRect.left < m.pRect.left;
        const t1_rowOk = Math.abs(m.cRect.top - m.pRect.top) <= 2;
        const t1_heightOk = Math.abs(m.cRect.height - m.pRect.height) <= 1;
        const t1_colorOk = m.cBg.includes('20, 145, 142') && m.pBg.includes('20, 145, 142');
        const t1_fixedBottom = m.fRect.bottom <= m.windowHeight + 1 && m.fRect.bottom >= m.windowHeight - 5;

        console.log(`- Close Branch is on LEFT of Print: ${t1_leftOk} (Close: ${m.cRect.left.toFixed(1)}, Print: ${m.pRect.left.toFixed(1)})`);
        console.log(`- Both in SAME HORIZONTAL ROW: ${t1_rowOk} (Close top: ${m.cRect.top.toFixed(1)}, Print top: ${m.pRect.top.toFixed(1)})`);
        console.log(`- Matching Heights: ${t1_heightOk} (Close: ${m.cRect.height.toFixed(1)}px, Print: ${m.pRect.height.toFixed(1)}px)`);
        console.log(`- Teal/Turquoise Color: ${t1_colorOk} (${m.cBg})`);
        console.log(`- Fixed at Bottom of Viewport: ${t1_fixedBottom} (Footer bottom: ${m.fRect.bottom}, Window height: ${m.windowHeight})`);
        console.log(`- Labels: Left="${m.cText}", Right="${m.pText}"`);

        await page.screenshot({ path: 'test_result_desktop_en.png' });
        if (!t1_leftOk || !t1_rowOk || !t1_heightOk || !t1_colorOk || !t1_fixedBottom) allPassed = false;

        // TEST 2: Desktop Arabic (dir="rtl") - Positions MUST NOT FLIP!
        console.log('\n--- TEST 2: Desktop (1200x800) Arabic (RTL) Layout ---');
        await setupPage({ width: 1200, height: 800 }, 'ar', 3);
        m = await getButtonsMetrics();

        const t2_leftOk = m.cRect.left < m.pRect.left;
        const t2_rowOk = Math.abs(m.cRect.top - m.pRect.top) <= 2;
        const t2_fixedBottom = m.fRect.bottom <= m.windowHeight + 1;

        console.log(`- html dir attribute: "${m.htmlDir}"`);
        console.log(`- Close Branch (${m.cText}) is STILL on physical LEFT: ${t2_leftOk} (Close: ${m.cRect.left.toFixed(1)}, Print: ${m.pRect.left.toFixed(1)})`);
        console.log(`- Print (${m.pText}) is STILL on physical RIGHT: ${m.pRect.left > m.cRect.left}`);
        console.log(`- Both in SAME HORIZONTAL ROW in Arabic: ${t2_rowOk}`);

        await page.screenshot({ path: 'test_result_desktop_ar.png' });
        if (!t2_leftOk || !t2_rowOk || !t2_fixedBottom) allPassed = false;

        // TEST 3: Scrolling Behavior with 15 Shifts
        console.log('\n--- TEST 3: Scrolling Behavior with 15 Shifts ---');
        await setupPage({ width: 1200, height: 800 }, 'en', 15);
        m = await getButtonsMetrics();

        const initialFooterTop = m.fRect.top;
        const initialFooterBottom = m.fRect.bottom;
        const isScrollable = m.mScroll.scrollHeight > m.mScroll.clientHeight;
        console.log(`- Shifts list is scrollable: ${isScrollable} (scrollHeight=${m.mScroll.scrollHeight}, clientHeight=${m.mScroll.clientHeight})`);

        // Scroll down
        await page.evaluate(() => {
            const el = document.getElementById('shiftsMainContent');
            el.scrollTop = el.scrollHeight / 2;
        });
        await new Promise(r => setTimeout(r, 200));
        let mScrolled = await getButtonsMetrics();
        const footerStayedScrolled = Math.abs(mScrolled.fRect.top - initialFooterTop) < 1;
        console.log(`- Footer remained fixed during half-scroll: ${footerStayedScrolled}`);

        // Scroll to the bottom
        await page.evaluate(() => {
            const el = document.getElementById('shiftsMainContent');
            el.scrollTop = el.scrollHeight;
        });
        await new Promise(r => setTimeout(r, 200));
        let mBottom = await getButtonsMetrics();
        const footerStayedBottom = Math.abs(mBottom.fRect.top - initialFooterTop) < 1;
        console.log(`- Footer remained fixed at full scroll: ${footerStayedBottom}`);

        // Check last shift row is accessible and visible
        const lastRowVisible = mBottom.lRect && (mBottom.lRect.bottom <= mBottom.fRect.top + 5);
        console.log(`- Last shift row is fully visible and not hidden behind footer: ${lastRowVisible} (LastRow bottom=${mBottom.lRect?.bottom}, Footer top=${mBottom.fRect.top})`);

        await page.screenshot({ path: 'test_result_scrolling_bottom.png' });
        if (!isScrollable || !footerStayedScrolled || !footerStayedBottom) allPassed = false;

        // TEST 4: Mobile (360x640) - Phone portrait
        console.log('\n--- TEST 4: Mobile (360x640) Android/iPhone Viewport ---');
        await setupPage({ width: 360, height: 640 }, 'en', 6);
        m = await getButtonsMetrics();

        const t4_rowOk = Math.abs(m.cRect.top - m.pRect.top) <= 2;
        const t4_leftOk = m.cRect.left < m.pRect.left;
        const t4_noOverflow = m.pRect.right <= m.windowWidth + 2;
        const t4_touchTarget = m.cRect.height >= 44 && m.pRect.height >= 44;

        console.log(`- Single horizontal row (NO vertical stacking): ${t4_rowOk} (Close top: ${m.cRect.top}, Print top: ${m.pRect.top})`);
        console.log(`- Close Branch is on physical LEFT: ${t4_leftOk}`);
        console.log(`- Touch target adequate (height >= 44px): ${t4_touchTarget} (${m.cRect.height}px)`);
        console.log(`- No horizontal overflow offscreen: ${t4_noOverflow} (Print right=${m.pRect.right}, Window width=${m.windowWidth})`);

        await page.screenshot({ path: 'test_result_mobile_en.png' });
        if (!t4_rowOk || !t4_leftOk || !t4_noOverflow || !t4_touchTarget) allPassed = false;

        // TEST 5: Mobile Arabic (360x640)
        console.log('\n--- TEST 5: Mobile (360x640) Arabic Viewport ---');
        await setupPage({ width: 360, height: 640 }, 'ar', 6);
        m = await getButtonsMetrics();

        const t5_rowOk = Math.abs(m.cRect.top - m.pRect.top) <= 2;
        const t5_leftOk = m.cRect.left < m.pRect.left;
        console.log(`- Arabic mobile in ONE horizontal row: ${t5_rowOk}`);
        console.log(`- Arabic Close Branch on physical LEFT: ${t5_leftOk} (Close: ${m.cRect.left.toFixed(1)}, Print: ${m.pRect.left.toFixed(1)})`);

        await page.screenshot({ path: 'test_result_mobile_ar.png' });
        if (!t5_rowOk || !t5_leftOk) allPassed = false;

        // TEST 6: Tablet (iPad 768x1024 and Tablet 1024x768)
        console.log('\n--- TEST 6: Tablet Portrait (768x1024) & Landscape (1024x768) ---');
        await setupPage({ width: 768, height: 1024 }, 'en', 8);
        m = await getButtonsMetrics();
        const t6_tabPortRow = Math.abs(m.cRect.top - m.pRect.top) <= 2;
        const t6_tabPortLeft = m.cRect.left < m.pRect.left;
        console.log(`- Tablet 768x1024 row=${t6_tabPortRow}, left=${t6_tabPortLeft}`);

        await setupPage({ width: 1024, height: 768 }, 'en', 8);
        m = await getButtonsMetrics();
        const t6_tabLandRow = Math.abs(m.cRect.top - m.pRect.top) <= 2;
        const t6_tabLandLeft = m.cRect.left < m.pRect.left;
        console.log(`- Tablet 1024x768 row=${t6_tabLandRow}, left=${t6_tabLandLeft}`);

        await page.screenshot({ path: 'test_result_tablet_1024.png' });
        if (!t6_tabPortRow || !t6_tabPortLeft || !t6_tabLandRow || !t6_tabLandLeft) allPassed = false;

        // TEST 7: Invoices Subview Toggle
        console.log('\n--- TEST 7: Invoices Subview Toggle & Footer State ---');
        await setupPage({ width: 1200, height: 800 }, 'en', 3);
        
        // Click View Invoices on first shift
        await page.evaluate(() => {
            const viewInvBtn = document.querySelector('.shift-row .shift-pill-btn:nth-child(3)');
            viewInvBtn.click();
        });
        await new Promise(r => setTimeout(r, 200));

        let subViewActive = await page.evaluate(() => {
            const sub = document.getElementById('shiftInvoicesSubView');
            const footer = document.getElementById('shiftsFooter');
            return {
                subActive: sub && sub.classList.contains('active'),
                footerDisplay: footer ? window.getComputedStyle(footer).display : 'none'
            };
        });
        console.log(`- Subview opened: ${subViewActive.subActive}`);
        console.log(`- Footer hidden during invoices subview: ${subViewActive.footerDisplay === 'none'}`);

        // Click Back to Shifts
        await page.evaluate(() => {
            const backBtn = document.querySelector('.shift-invoices-header .shifts-back-btn');
            if (backBtn) backBtn.click();
        });
        await new Promise(r => setTimeout(r, 200));

        let returnedState = await page.evaluate(() => {
            const sub = document.getElementById('shiftInvoicesSubView');
            const footer = document.getElementById('shiftsFooter');
            return {
                subActive: sub && sub.classList.contains('active'),
                footerDisplay: footer ? window.getComputedStyle(footer).display : 'none'
            };
        });
        console.log(`- Subview closed: ${!returnedState.subActive}`);
        console.log(`- Footer restored: ${returnedState.footerDisplay !== 'none'}`);
        if (!subViewActive.subActive || subViewActive.footerDisplay !== 'none' || returnedState.subActive || returnedState.footerDisplay === 'none') {
            allPassed = false;
        }

        // TEST 8: Button Handlers
        console.log('\n--- TEST 8: Functional Verification of Bottom Actions ---');
        // Click Close Branch Shifts
        await page.evaluate(() => {
            const btnClose = document.querySelector('.btn-close-branch');
            btnClose.click();
        });
        await new Promise(r => setTimeout(r, 200));

        const modalOpen = await page.evaluate(() => {
            const overlay = document.getElementById('shiftConfirmModalOverlay');
            const title = document.getElementById('shiftModalTitle')?.innerText;
            return {
                open: overlay && overlay.classList.contains('open'),
                title
            };
        });
        console.log(`- Close Branch Shifts opens confirmation modal: ${modalOpen.open} (Title="${modalOpen.title}")`);

        // Close modal
        await page.evaluate(() => {
            closeShiftModal();
        });
        await new Promise(r => setTimeout(r, 200));

        // Click Print
        let printReportIntercepted = false;
        await page.evaluate(() => {
            window._printJobCalled = null;
            window.routePrintJob = function(type, html, title) {
                window._printJobCalled = { type, title, length: html.length };
            };
            const btnPrint = document.querySelector('.btn-print-branch');
            btnPrint.click();
        });
        await new Promise(r => setTimeout(r, 200));

        const printResult = await page.evaluate(() => window._printJobCalled);
        console.log(`- Print button invokes branch report printer: ${!!printResult && printResult.title === 'Branch Shifts Summary'} (${printResult?.title}, length=${printResult?.length})`);
        if (!modalOpen.open || !printResult) allPassed = false;

        // TEST 9: Row-level Actions Independence
        console.log('\n--- TEST 9: Individual Shift Row Actions Preservation ---');
        await page.evaluate(() => {
            window._singleShiftPrint = null;
            window.routePrintJob = function(type, html, title) {
                window._singleShiftPrint = { type, title };
            };
            // Click second button in first shift row (Print Shift)
            const rowPrintBtn = document.querySelector('.shift-row .shift-pill-btn:nth-child(2)');
            rowPrintBtn.click();
        });
        await new Promise(r => setTimeout(r, 200));
        const singlePrint = await page.evaluate(() => window._singleShiftPrint);
        console.log(`- Single row Print Shift independent: ${!!singlePrint && singlePrint.title.includes('Shift Report')} (${singlePrint?.title})`);
        if (!singlePrint || !singlePrint.title.includes('Shift Report')) allPassed = false;

        console.log(`\n========================================`);
        console.log(`OVERALL TEST RESULT: ${allPassed ? 'ALL TESTS PASSED SUCCESSFULY!' : 'SOME TESTS FAILED!'}`);
        console.log(`========================================\n`);

    } finally {
        await browser.close();
    }
}

runTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
