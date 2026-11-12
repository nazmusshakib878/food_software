const assert = require('assert');
const puppeteer = require('puppeteer');

const baseUrl = process.env.NURPOS_QA_URL || 'http://127.0.0.1:3000/';
const browserPath = process.env.NURPOS_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    const browser = await puppeteer.launch({
        executablePath: browserPath,
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    const pageErrors = [];
    const apiRequests = [];
    let reportRequests = 0;
    let invoiceRequests = 0;
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (!request.url().includes('/api/')) return request.continue();
        const url = new URL(request.url());
        apiRequests.push({ path: url.pathname, query: url.searchParams.toString() });
        let payload = { success: true };
        if (url.pathname === '/api/auth/session') {
            payload = { success: true, user: { id: 'qa-admin', name: 'QA Admin', nameEn: 'QA Admin', role: 'admin', permissions: ['reports'], canOpenSidebar: true, companyId: 'CMP-QA', branchId: 'BR-QA' } };
        } else if (url.pathname === '/api/reports/invoices') {
            invoiceRequests += 1;
            payload = {
                success: true,
                invoices: [{ id: 'QA-INV-1', order_number: 'QA-INV-1', created_at: new Date().toISOString(), order_type_name: 'Delivery', method: 'Cash', customer_name: 'QA Customer', user_id: 'QA User', grand_total: 100, subtotal: 100, tax: 15, discount: 0 }],
                pagination: { currentPage: 1, lastPage: 1, perPage: 50, total: 1 },
                summary: { invoiceCount: 1, totalSales: 100, totalReturns: 0, totalDiscount: 0, totalTax: 15 }
            };
        } else if (url.pathname === '/api/reports') {
            reportRequests += 1;
            const from = url.searchParams.get('from');
            const grandTotal = from === '2026-11-10' ? 111 : (from === '2026-11-09' ? 222 : 150);
            const createdAt = `${from}T10:00:00.000Z`;
            payload = {
                success: true,
                orders: [
                    { id: 'QA-OPEN-1', order_number: 'QA-OPEN-1', created_at: createdAt, order_type_id: 'delivery', order_type_name: 'Delivery', status: 'preparing', method: 'Cash', customer_name: 'QA Customer', user_id: 'QA User', grand_total: grandTotal, subtotal: grandTotal, tax: grandTotal * 0.15, discount: 0, paid: grandTotal, items: [] }
                ],
                paymentTransactions: [], shifts: [], damagedMovements: [], catalog: [], business: {}
            };
        }
        const respond = () => request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
        if (url.pathname === '/api/reports' && url.searchParams.get('from') === '2026-11-10') setTimeout(respond, 450);
        else respond();
    });

    try {
        await page.setViewport({ width: 1366, height: 900 });
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.currentUser && window.currentUser.role === 'admin', { timeout: 20000 });
        const sidebarReports = await page.evaluate(() => {
            document.getElementById('loginModal')?.classList.remove('open', 'active');
            const entry = document.querySelector('.drawer-menu-item[onclick="openReportsPage()"]');
            if (!entry) return null;
            const state = { label: entry.textContent.trim(), hasChevron: Boolean(entry.querySelector('.fa-chevron-down, .fa-chevron-up')), legacySubmenu: Boolean(document.getElementById('drawerReportsSubmenu')) };
            entry.click();
            return state;
        });
        assert.deepStrictEqual(sidebarReports, { label: 'Reports', hasChevron: false, legacySubmenu: false }, 'Main Sidebar Reports is a direct item with no arrow or submenu');
        const initialNavigation = await page.evaluate(() => ({
            groups: [...document.querySelectorAll('.reports-navigation-group')].map(button => ({ label: button.textContent.trim(), expanded: button.getAttribute('aria-expanded') })),
            topLevelCount: document.querySelectorAll('#reportsNavigationList > .reports-navigation-group, #reportsNavigationList > .reports-navigation-item').length,
            zakatVisible: Boolean(document.querySelector('.reports-navigation-item[data-report-id="zakat_invoices_report"]')),
            selectedReport: document.querySelector('#reportModuleContent .report-screen-title')?.textContent.trim() || null
        }));
        assert.deepStrictEqual(initialNavigation.groups.map(group => group.expanded), ['false', 'false', 'false'], 'Reports opens with each accordion collapsed');
        assert.strictEqual(initialNavigation.topLevelCount, 4, 'Reports rail has exactly four top-level entries');
        assert.ok(initialNavigation.zakatVisible, 'Zakat report is a direct top-level item');
        assert.strictEqual(initialNavigation.selectedReport, null, 'Reports landing does not open an unrelated report');
        await page.click('.reports-navigation-group[aria-controls="reports-group-sales"]');
        const salesExpanded = await page.evaluate(() => [...document.querySelectorAll('#reports-group-sales .reports-navigation-item')].map(item => item.dataset.reportId));
        assert.deepStrictEqual(salesExpanded, ['invoice_reports', 'items_report', 'daily_shifts', 'damaged_items', 'application_reports', 'service_durations', 'totals_report'], 'Sales accordion exposes its existing report children');
        await page.click('.reports-navigation-group[aria-controls="reports-group-sales"]');
        assert.strictEqual(await page.$eval('.reports-navigation-group[aria-controls="reports-group-sales"]', node => node.getAttribute('aria-expanded')), 'false', 'Sales accordion toggles closed');
        await page.click('.reports-navigation-group[aria-controls="reports-group-active-meals"]');
        const activeMealsChildren = await page.evaluate(() => [...document.querySelectorAll('#reports-group-active-meals .reports-navigation-item')].map(item => item.dataset.reportId));
        assert.deepStrictEqual(activeMealsChildren, ['active_meals', 'active_invoices_report', 'active_items_report'], 'Active Meals has its own report children');
        await page.click('.reports-navigation-group[aria-controls="reports-group-meals"]');
        const mealsChildren = await page.evaluate(() => [...document.querySelectorAll('#reports-group-meals .reports-navigation-item')].map(item => item.dataset.reportId));
        assert.deepStrictEqual(mealsChildren, ['meals_reports', 'outgoing_invoices_report', 'outgoing_items_report', 'outgoing_returns_report', 'outgoing_damaged_report'], 'Meals has its own report children');
        await page.evaluate(() => window.openReportModule('invoice_reports'));
        await page.waitForSelector('.reports-navigation-item[data-report-id="invoice_reports"].active');
        await page.waitForSelector('.invoice-report-screen');

        const reportIds = [
            'invoice_reports', 'items_report', 'daily_shifts', 'damaged_items', 'application_reports',
            'service_durations', 'totals_report', 'active_meals', 'active_invoices_report', 'active_items_report',
            'meals_reports', 'outgoing_invoices_report', 'outgoing_items_report', 'outgoing_returns_report',
            'outgoing_damaged_report', 'zakat_invoices_report', 'payment_type_report', 'balancing_payments',
            'applications_review', 'internal_orders', 'inventory_auditing', 'daily_inventory', 'daily_stock_calculator'
        ];
        const reports = [];
        for (const id of reportIds) {
            await page.evaluate(moduleId => window.openReportModule(moduleId), id);
            await wait(100);
            const result = await page.evaluate(() => ({
                viewActive: document.getElementById('reportsView').classList.contains('active'),
                railVisible: !document.querySelector('.reports-navigation').hidden,
                activeId: document.querySelector('.reports-navigation-item.active')?.dataset.reportId || null,
                content: document.querySelector('#reportModuleContent .report-screen-title, #reportModuleContent .breadcrumb-current, #reportModuleContent .access-denied-box')?.textContent.trim()
                    || document.querySelector('#reportModuleContent .report-table-card')?.textContent.trim().slice(0, 80)
            }));
            assert.strictEqual(result.viewActive, true, id + ' keeps its own page active');
            assert.strictEqual(result.railVisible, ['invoice_reports','items_report','daily_shifts','damaged_items','application_reports','service_durations','totals_report','active_meals','active_invoices_report','active_items_report','meals_reports','outgoing_invoices_report','outgoing_items_report','outgoing_returns_report','outgoing_damaged_report','zakat_invoices_report'].includes(id), id + ' shows the Reports rail only for report-page items');
            if (result.railVisible) assert.strictEqual(result.activeId, id, id + ' is highlighted in the rail');
            else assert.strictEqual(result.activeId, null, id + ' does not show an unrelated Reports navigation rail');
            assert.ok(result.content, id + ' renders its existing content');
            reports.push({ id, title: result.content });
        }
        assert.strictEqual(reportRequests, 1, 'Switching reports reuses the loaded date-range data');
        assert.strictEqual(invoiceRequests, 1, 'Invoice report loads once while switching reports');

        const group = { topLevelCount: initialNavigation.topLevelCount, initialExpanded: initialNavigation.groups.map(group => group.expanded), listenerBound: await page.$eval('#reportsNavigationList', node => node.dataset.eventsBound) };
        await page.evaluate(() => window.openReportModule('totals_report'));
        await page.waitForSelector('.report-summary-cards');
        const totals = await page.$eval('.report-summary-cards', node => node.textContent);
        assert.ok(totals.includes('150'), 'Totals report calculates from isolated fixture orders');
        await page.evaluate(() => {
            window.__qaPrint = null;
            window.routePrintJob = (channel, html, title) => { window.__qaPrint = { channel, html, title }; };
            window.printCurrentReport('Totals Report');
        });
        await page.waitForFunction(() => window.__qaPrint !== null);
        const print = await page.evaluate(() => window.__qaPrint);
        assert.strictEqual(print.channel, 'reports', 'Print routes to the reports printer');
        assert.ok(print.html.includes('Totals Report'), 'Print contains selected report');
        assert.ok(!print.html.includes('reports-navigation'), 'Print excludes the navigation rail');

        const requestsBeforeDate = apiRequests.filter(item => item.path === '/api/reports').length;
        await page.evaluate(() => {
            const from = document.querySelector('#repDateFromInput');
            const to = document.querySelector('#repDateToInput');
            const chosen = new Date().toISOString().slice(0, 10);
            from.value = chosen;
            to.value = chosen;
            window.onReportDateChange();
        });
        await wait(400);
        assert.ok(apiRequests.filter(item => item.path === '/api/reports').length > requestsBeforeDate, 'Date filter requests the selected range');

        await page.evaluate(() => {
            const from = document.querySelector('#repDateFromInput');
            const to = document.querySelector('#repDateToInput');
            from.value = '2026-11-10'; to.value = '2026-11-10'; window.onReportDateChange();
        });
        await wait(30);
        await page.evaluate(() => {
            const from = document.querySelector('#repDateFromInput');
            const to = document.querySelector('#repDateToInput');
            from.value = '2026-11-09'; to.value = '2026-11-09'; window.onReportDateChange();
        });
        await wait(650);
        const latestRangeSummary = await page.$eval('.report-summary-cards', node => node.textContent.replace(/\s+/g, ' '));
        assert.ok(latestRangeSummary.includes('222'), `A slower stale date response cannot replace the latest date range: ${latestRangeSummary}`);

        await page.evaluate(() => window.openReportModule('active_meals'));
        const activeMealsTitle = await page.$eval('#reportModuleContent .report-screen-title', node => node.textContent.trim());
        assert.strictEqual(activeMealsTitle, 'Active Meals Reports', 'Active Meals has its own English heading');
        await page.evaluate(() => window.changeLanguage('ar'));
        const rtl = await page.evaluate(() => {
            const rail = document.querySelector('.reports-navigation').getBoundingClientRect();
            return { dir: document.documentElement.dir, x: Math.round(rail.x), right: Math.round(rail.right), width: Math.round(rail.width) };
        });
        assert.strictEqual(rtl.dir, 'rtl', 'Arabic language sets RTL direction');
        assert.ok(Math.abs(rtl.right - 1366) <= 1, 'Arabic keeps the navigation rail on the physical right');
        await page.evaluate(() => window.openReportModule('active_meals'));
        const activeMealsArabic = await page.$eval('#reportModuleContent .report-screen-title', node => node.textContent.trim());
        assert.strictEqual(activeMealsArabic, '\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0648\u062c\u0628\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629', 'Active Meals has its Arabic heading');

        const viewports = [];
        for (const [width, height, label, expectHorizontal] of [
            [1366, 900, 'Desktop', false], [1180, 820, 'iPad landscape', false], [1024, 768, 'iPad landscape compact', false],
            [768, 1024, 'iPad portrait', false], [800, 1280, 'Android tablet', false], [390, 844, 'Mobile', false]
        ]) {
            await page.setViewport({ width, height });
            const layout = await page.evaluate(() => {
                const rail = document.querySelector('.reports-navigation').getBoundingClientRect();
                const items = [...document.querySelectorAll('.reports-navigation-item:not([hidden])')].slice(0, 2).map(item => item.getBoundingClientRect());
                return { x: Math.round(rail.x), right: Math.round(rail.right), width: Math.round(rail.width), horizontal: Boolean(items[1] && Math.abs(items[1].top - items[0].top) < 2), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
            });
            assert.strictEqual(layout.horizontal, expectHorizontal, `${label} uses the expected navigation orientation`);
            assert.strictEqual(layout.overflow, false, `${label} has no page-level horizontal overflow`);
            if (!expectHorizontal) assert.ok(Math.abs(layout.right - width) <= 1, `${label} rail is on physical right`);
            viewports.push({ label, ...layout });
        }

        await page.evaluate(() => { window.openReportModule('totals_report'); window.backFromReports(); });
        const backView = await page.evaluate(() => currentView);
        assert.strictEqual(backView, 'pos', 'Back returns to the previous POS view');

        await page.evaluate(() => {
            currentUser = { id: 'qa-staff', name: 'QA Staff', role: 'staff', permissions: ['pos_orders'] };
            window.openReportModule('items_report');
        });
        const permission = await page.evaluate(() => ({ view: currentView, reportActive: document.getElementById('reportsView').classList.contains('active') }));
        assert.strictEqual(permission.view, 'pos', 'Unauthorized staff cannot open report modules');
        assert.strictEqual(permission.reportActive, false, 'Unauthorized user is returned to POS');
        assert.deepStrictEqual(pageErrors, [], 'Browser reports no uncaught page errors');

        console.log(JSON.stringify({ result: 'PASS', reportModules: reports, group, viewports, activeMealsTitle, activeMealsArabic, print: { channel: print.channel, title: print.title }, apiRequests, pageErrors }, null, 2));
    } finally {
        await browser.close();
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
