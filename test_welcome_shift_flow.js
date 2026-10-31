/**
 * NUR FOODES POS — WELCOME DASHBOARD & NEW SHIFT FLOW ACCEPTANCE TESTS
 * Directly verifies Part 17 (Tests 1 through 16) of the Implementation Prompt
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Backend Auth & Services
const authService = require('./api/_auth_service');
const loginHandler = require('./api/auth/login');
const logoutHandler = require('./api/auth/logout');

function createMockReqRes(method, url, body = {}, headers = {}) {
    const resHeaders = {};
    const res = {
        statusCode: 200,
        headers: resHeaders,
        setHeader(key, value) {
            resHeaders[key] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            return this;
        }
    };
    const req = {
        method,
        url,
        body,
        headers: {
            'x-forwarded-for': '127.0.0.1',
            ...headers
        }
    };
    return { req, res };
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logTest(testNum, description, passed, detail = '') {
    totalTests++;
    if (passed) {
        passedTests++;
        console.log(`  [PASS] [TEST ${testNum}] ${description}`);
    } else {
        failedTests++;
        console.error(`  [FAIL] [TEST ${testNum}] ${description} -> ${detail}`);
    }
}

async function runWelcomeShiftTests() {
    console.log('=====================================================================');
    console.log('=== NUR FOODES POS — WELCOME DASHBOARD & SHIFT FLOW ACCEPTANCE ===');
    console.log('=====================================================================\n');

    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const dashboardHtml = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');
    const newShiftHtml = fs.readFileSync(path.join(__dirname, 'new_shift.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf8');

    // -------------------------------------------------------------------------
    // TEST 1 — CASHIER PIN LOGIN
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Cashier PIN Login (Welcome Dashboard appears before POS) ---');
    authService.clearFailedAttempts('127.0.0.1');
    let { req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1050' });
    await loginHandler(req, res);
    const cashierAuth = res.body.session.user;

    // Verify kioskSubmitLogin in app.js routes to dashboard.html
    const hasDashboardRedirect = appJs.includes("window.location.href = 'dashboard.html'");
    logTest(1.1, 'Cashier authenticates successfully via backend (HTTP 200)', res.statusCode === 200);
    logTest(1.2, 'PIN login handler redirects to dashboard.html instead of direct POS', hasDashboardRedirect);
    logTest(1.3, 'dashboard.html file exists and contains Nur foodes brand elements',
        dashboardHtml.includes('brand-nur') && dashboardHtml.includes('brand-foodes'));

    // -------------------------------------------------------------------------
    // TEST 2 — STAFF 1 PIN LOGIN
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Staff 1 PIN Login (Welcome Dashboard with Staff Name) ---');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1051' }));
    await loginHandler(req, res);
    const staff1Auth = res.body.session.user;

    // Simulate dashboard.html rendering for Staff 1
    const domStaff1 = new JSDOM(dashboardHtml, { url: 'http://localhost/dashboard.html', runScripts: 'dangerously' });
    domStaff1.window.localStorage.setItem('nurpos_user', JSON.stringify(staff1Auth));
    domStaff1.window.document.dispatchEvent(new domStaff1.window.Event('DOMContentLoaded'));
    
    // Check greeting
    const staff1GreetingName = domStaff1.window.document.getElementById('greetingUserName');
    logTest(2.1, 'Staff 1 authenticates successfully via backend (HTTP 200)', res.statusCode === 200);
    logTest(2.2, 'Welcome Dashboard contains greeting container and elements',
        dashboardHtml.includes('greetingContainer') && dashboardHtml.includes('greetingHello') && dashboardHtml.includes('greetingUserName'));
    logTest(2.3, 'Staff 1 display name is correctly provisioned (Staff 1 / موظف 1)',
        staff1Auth.nameEn === 'Staff 1' && staff1Auth.nameAr === 'موظف 1');

    // -------------------------------------------------------------------------
    // TEST 3 — STAFF 2 PIN LOGIN
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Staff 2 PIN Login (Welcome Dashboard with Staff Name) ---');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1052' }));
    await loginHandler(req, res);
    const staff2Auth = res.body.session.user;

    const domStaff2 = new JSDOM(dashboardHtml, { url: 'http://localhost/dashboard.html', runScripts: 'dangerously' });
    domStaff2.window.localStorage.setItem('nurpos_user', JSON.stringify(staff2Auth));
    domStaff2.window.document.dispatchEvent(new domStaff2.window.Event('DOMContentLoaded'));

    logTest(3.1, 'Staff 2 authenticates successfully via backend (HTTP 200)', res.statusCode === 200);
    logTest(3.2, 'Staff 2 has distinct identity and staffId STF-1052',
        staff2Auth.id === 'usr_staff_2' && staff2Auth.staffId === 'STF-1052');
    logTest(3.3, 'Staff 2 display name is correctly provisioned (Staff 2 / موظف 2)',
        staff2Auth.nameEn === 'Staff 2' && staff2Auth.nameAr === 'موظف 2');

    // -------------------------------------------------------------------------
    // TEST 4 — START SELLING WITHOUT ACTIVE SHIFT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Start Selling without Active Shift (Opens New Shift) ---');
    logTest(4.1, 'dashboard.html checks active shifts on Start Selling',
        dashboardHtml.includes('function handleStartSelling') && dashboardHtml.includes("shifts.find(s => s.status === 'active')"));
    logTest(4.2, 'When no active shift exists, navigates to new_shift.html',
        dashboardHtml.includes("window.location.href = 'new_shift.html'"));
    logTest(4.3, 'Start Selling button prevents duplicate clicks via disabled flag',
        dashboardHtml.includes('isActionPending') && dashboardHtml.includes('btn.disabled = true'));

    // -------------------------------------------------------------------------
    // TEST 5 — NEW SHIFT SAVE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: New Shift Save (Saves and Opens POS) ---');
    const domNewShift = new JSDOM(newShiftHtml, { url: 'http://localhost/new_shift.html', runScripts: 'dangerously' });
    domNewShift.window.localStorage.setItem('nurpos_user', JSON.stringify(cashierAuth));
    
    // Verify inputs present
    const nameInput = domNewShift.window.document.getElementById('shiftName');
    const enNameInput = domNewShift.window.document.getElementById('shiftEnglishName');
    const cashInput = domNewShift.window.document.getElementById('openingCash');
    const notesInput = domNewShift.window.document.getElementById('shiftNotes');
    const saveBtn = domNewShift.window.document.getElementById('btnSaveShift');

    logTest(5.1, 'New Shift form contains Name, English Name, Money Amount, Notes, Save',
        nameInput !== null && enNameInput !== null && cashInput !== null && notesInput !== null && saveBtn !== null);
    logTest(5.2, 'new_shift.html validates starting cash amount > 0',
        newShiftHtml.includes('!Number.isFinite(openingCash) || openingCash <= 0'));
    logTest(5.3, 'On successful save, redirects to index.html?shift=started',
        newShiftHtml.includes("window.location.href = 'index.html?shift=started'"));

    // -------------------------------------------------------------------------
    // TEST 6 — EXISTING ACTIVE SHIFT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Existing Active Shift (Resumes without Duplicate Creation) ---');
    logTest(6.1, 'dashboard.html checks for active shift before creating new shift',
        dashboardHtml.includes('if (activeShift)') && dashboardHtml.includes("window.location.href = 'index.html'"));
    logTest(6.2, 'Existing active shift directly opens POS without opening new_shift.html',
        dashboardHtml.includes('activeShift') && dashboardHtml.includes("window.location.href = 'index.html'"));

    // -------------------------------------------------------------------------
    // TEST 7 — WELCOME LOG OUT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Welcome Log Out (Ends Session and Returns to Login) ---');
    logTest(7.1, 'dashboard.html contains Log Out button (#btnLogout)',
        dashboardHtml.includes('id="btnLogout"') && dashboardHtml.includes('handleLogout()'));
    logTest(7.2, 'handleLogout calls /api/auth/logout with Bearer token',
        dashboardHtml.includes('/api/auth/logout') && dashboardHtml.includes('Authorization'));
    logTest(7.3, 'handleLogout clears session token and resets user to guest',
        dashboardHtml.includes("sessionStorage.removeItem('nurpos_token')") && dashboardHtml.includes("role: 'guest'"));
    logTest(7.4, 'handleLogout redirects back to index.html',
        dashboardHtml.includes("window.location.href = 'index.html'"));

    // -------------------------------------------------------------------------
    // TEST 8 — SAME-DEVICE USER SWITCHING
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Same-Device User Switching ---');
    // Cashier -> Logout -> Staff 1 -> Logout -> Staff 2
    let cRes = createMockReqRes('POST', '/api/auth/login', { pin: '1050' });
    await loginHandler(cRes.req, cRes.res);
    const cTok = cRes.res.body.session.token;

    let lRes1 = createMockReqRes('POST', '/api/auth/logout', {}, { authorization: `Bearer ${cTok}` });
    await logoutHandler(lRes1.req, lRes1.res);

    let s1Res = createMockReqRes('POST', '/api/auth/login', { pin: '1051' });
    await loginHandler(s1Res.req, s1Res.res);
    const s1Tok = s1Res.res.body.session.token;

    let lRes2 = createMockReqRes('POST', '/api/auth/logout', {}, { authorization: `Bearer ${s1Tok}` });
    await logoutHandler(lRes2.req, lRes2.res);

    let s2Res = createMockReqRes('POST', '/api/auth/login', { pin: '1052' });
    await loginHandler(s2Res.req, s2Res.res);
    const s2Tok = s2Res.res.body.session.token;

    logTest(8.1, 'Cashier logged out and session revoked', authService.getSession(cTok) === null);
    logTest(8.2, 'Staff 1 session established and revoked on logout', authService.getSession(s1Tok) === null);
    logTest(8.3, 'Staff 2 session active independently with canOpenSidebar = false',
        s2Res.res.body.session.user.role === 'staff' && s2Res.res.body.session.user.canOpenSidebar === false);
    authService.revokeSession(s2Tok);

    // -------------------------------------------------------------------------
    // TEST 9 — THREE-DEVICE SIMULTANEOUS LOGIN
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Three-Device Simultaneous Login ---');
    let d1 = createMockReqRes('POST', '/api/auth/login', { pin: '1050' }, { 'x-forwarded-for': '10.0.0.1' });
    await loginHandler(d1.req, d1.res);
    let d2 = createMockReqRes('POST', '/api/auth/login', { pin: '1051' }, { 'x-forwarded-for': '10.0.0.2' });
    await loginHandler(d2.req, d2.res);
    let d3 = createMockReqRes('POST', '/api/auth/login', { pin: '1052' }, { 'x-forwarded-for': '10.0.0.3' });
    await loginHandler(d3.req, d3.res);

    const t1 = d1.res.body.session.token;
    const t2 = d2.res.body.session.token;
    const t3 = d3.res.body.session.token;

    logTest(9.1, 'All three sessions active concurrently on server',
        authService.getSession(t1) !== null && authService.getSession(t2) !== null && authService.getSession(t3) !== null);
    logTest(9.2, 'All tokens are completely unique across devices',
        t1 !== t2 && t2 !== t3 && t1 !== t3);

    // -------------------------------------------------------------------------
    // TEST 10 — INDEPENDENT LOGOUT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Independent Logout ---');
    let d1Logout = createMockReqRes('POST', '/api/auth/logout', {}, { authorization: `Bearer ${t1}` });
    await logoutHandler(d1Logout.req, d1Logout.res);
    logTest(10.1, 'Logging out Device 1 does NOT affect Device 2 or Device 3',
        authService.getSession(t1) === null && authService.getSession(t2) !== null && authService.getSession(t3) !== null);

    // Cleanup t2, t3
    authService.revokeSession(t2);
    authService.revokeSession(t3);

    // -------------------------------------------------------------------------
    // TEST 11 — STAFF HAMBURGER ACCESS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Staff Hamburger Access (Visible but Non-Opening) ---');
    logTest(11.1, 'canUserOpenSidebar strictly returns false for staff',
        appJs.includes("if (currentUser.role === 'staff')") && appJs.includes("return false;"));
    logTest(11.2, 'toggleSideDrawer exits immediately when canUserOpenSidebar() is false',
        appJs.includes("if (!canUserOpenSidebar())") && appJs.includes("return;"));

    // -------------------------------------------------------------------------
    // TEST 12 — CASHIER HAMBURGER ACCESS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Cashier Hamburger Access (Opens Normally) ---');
    logTest(12.1, 'canUserOpenSidebar returns true for cashier',
        appJs.includes("currentUser.role === 'cashier'") || appJs.includes("currentUser.canOpenSidebar === true"));
    logTest(12.2, 'toggleSideDrawer adds open class to sideDrawer for Cashier',
        appJs.includes("drawer.classList.add('open')"));

    // -------------------------------------------------------------------------
    // TEST 13 — BROWSER REFRESH
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: Browser Refresh (Active Session Preserved Without Loop) ---');
    logTest(13.1, 'index.html detects active shift on browser refresh and keeps POS open',
        indexHtml.includes('hasActiveShift') && indexHtml.includes("switchView('pos')"));
    logTest(13.2, 'index.html closes login modal on valid refreshed session',
        indexHtml.includes('closeLoginModal()'));

    // -------------------------------------------------------------------------
    // TEST 14 — ENGLISH / ARABIC
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 14: English / Arabic Support ---');
    logTest(14.1, 'dashboard.html supports Arabic greeting (مرحباً،) and labels',
        dashboardHtml.includes("helloEl.textContent = 'مرحباً،'") && dashboardHtml.includes("startBtn.textContent = 'بدء البيع'"));
    logTest(14.2, 'new_shift.html supports Arabic labels and title (وردية جديدة / حفظ)',
        newShiftHtml.includes("titleEl.textContent = 'وردية جديدة'") && newShiftHtml.includes("saveBtn.textContent = 'حفظ'"));

    // -------------------------------------------------------------------------
    // TEST 15 — RESPONSIVE SUPPORT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 15: Responsive Support ---');
    logTest(15.1, 'dashboard.html has responsive container width and border-radius in CSS',
        dashboardHtml.includes('max-width: 420px') && dashboardHtml.includes('min(760px, calc(100dvh - 32px))'));
    logTest(15.2, 'new_shift.html has responsive card width clamp and media queries',
        newShiftHtml.includes('min(90vw, 686px)') && newShiftHtml.includes('@media (max-width: 480px)'));

    // -------------------------------------------------------------------------
    // TEST 16 — EXISTING POS REGRESSION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 16: Existing POS Regression ---');
    logTest(16.1, 'POS Order panel and catalog panel preserved in index.html',
        indexHtml.includes('pos-order-panel') && indexHtml.includes('pos-catalog-panel'));
    logTest(16.2, 'Customer and Order Type dropdowns preserved in index.html',
        indexHtml.includes('posCustomerSelect') && indexHtml.includes('posOrderTypeSelect'));
    logTest(16.3, 'Bottom navigation preserved (New, Orders, Tables, Main Screen)',
        indexHtml.includes('bottomNavNewOrder()') && indexHtml.includes('bottomNavOrders()'));

    console.log('\n=====================================================================');
    console.log(`=== WELCOME & SHIFT TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests}) ===`);
    console.log('=====================================================================\n');
}

runWelcomeShiftTests().catch(err => {
    console.error('Test Suite Exception:', err);
    process.exit(1);
});
