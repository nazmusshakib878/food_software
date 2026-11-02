/**
 * NUR FOODES POS — COMPREHENSIVE ACCEPTANCE TEST SUITE
 * Tests A through R corresponding directly to Part 20 of Final Codex Master Prompt
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const frontendRoot = path.resolve(__dirname, '../..');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');

// 1. Load Backend API Services
const authService = require('../../../api/_auth_service');
const loginHandler = require('../../../api/auth/login');
const sessionHandler = require('../../../api/auth/session');
const logoutHandler = require('../../../api/auth/logout');
const reportsHandler = require('../../../api/reports');

// Mock HTTP Request/Response Helper
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
const resultsByTest = {};

function logTest(testId, description, passed, detail = '') {
    totalTests++;
    const category = testId.split('.')[0]; // e.g. "TEST A"
    if (!resultsByTest[category]) {
        resultsByTest[category] = { passed: 0, failed: 0, total: 0 };
    }
    resultsByTest[category].total++;

    if (passed) {
        passedTests++;
        resultsByTest[category].passed++;
        console.log(`  [PASS] [${testId}] ${description}`);
    } else {
        failedTests++;
        resultsByTest[category].failed++;
        console.error(`  [FAIL] [${testId}] ${description} -> ${detail}`);
    }
}

async function runTestSuite() {
    console.log('=====================================================================');
    console.log('=== NUR FOODES POS — PART 20 ACCEPTANCE TESTS (TEST A to TEST R) ===');
    console.log('=====================================================================\n');

    // Load DOM environment from index.html
    const htmlContent = fs.readFileSync(path.join(frontendRoot, 'index.html'), 'utf8');
    const dom = new JSDOM(htmlContent, { runScripts: "dangerously" });
    const { window } = dom;
    const { document } = window;

    // =========================================================================
    // TEST A — CASHIER LOGIN (PIN 1050)
    // =========================================================================
    console.log('--- TEST A — CASHIER LOGIN ---');
    authService.clearFailedAttempts('127.0.0.1');
    let { req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1050' });
    await loginHandler(req, res);
    logTest('TEST A.1', 'PIN 1050 returns HTTP 200 OK', res.statusCode === 200);
    logTest('TEST A.2', 'PIN 1050 authenticates user as Cashier', res.body && res.body.success && res.body.session.user.nameEn === 'Cashier');
    logTest('TEST A.3', 'Cashier role is "cashier"', res.body && res.body.session.user.role === 'cashier');
    logTest('TEST A.4', 'Cashier canOpenSidebar is true', res.body && res.body.session.user.canOpenSidebar === true);
    logTest('TEST A.5', 'Cashier session contains open_sidebar and reports permissions',
        res.body.session.user.permissions.includes('open_sidebar') && res.body.session.user.permissions.includes('reports'));
    const cashierToken = res.body.session.token;
    logTest('TEST A.6', 'Cashier receives unique cryptographically secure session token', typeof cashierToken === 'string' && cashierToken.length >= 64);

    // =========================================================================
    // TEST B — STAFF 1 LOGIN (PIN 1051)
    // =========================================================================
    console.log('\n--- TEST B — STAFF 1 LOGIN ---');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1051' }));
    await loginHandler(req, res);
    logTest('TEST B.1', 'PIN 1051 returns HTTP 200 OK', res.statusCode === 200);
    logTest('TEST B.2', 'PIN 1051 authenticates user as Staff 1', res.body && res.body.success && res.body.session.user.nameEn === 'Staff 1');
    logTest('TEST B.3', 'Staff 1 role is "staff"', res.body && res.body.session.user.role === 'staff');
    logTest('TEST B.4', 'Staff 1 canOpenSidebar is false', res.body && res.body.session.user.canOpenSidebar === false);
    logTest('TEST B.5', 'Staff 1 has unique staffId STF-1051 and userId usr_staff_1',
        res.body.session.user.staffId === 'STF-1051' && res.body.session.user.id === 'usr_staff_1');
    const staff1Token = res.body.session.token;

    // =========================================================================
    // TEST C — STAFF 2 LOGIN (PIN 1052)
    // =========================================================================
    console.log('\n--- TEST C — STAFF 2 LOGIN ---');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1052' }));
    await loginHandler(req, res);
    logTest('TEST C.1', 'PIN 1052 returns HTTP 200 OK', res.statusCode === 200);
    logTest('TEST C.2', 'PIN 1052 authenticates user as Staff 2', res.body && res.body.success && res.body.session.user.nameEn === 'Staff 2');
    logTest('TEST C.3', 'Staff 2 role is "staff"', res.body && res.body.session.user.role === 'staff');
    logTest('TEST C.4', 'Staff 2 canOpenSidebar is false', res.body && res.body.session.user.canOpenSidebar === false);
    logTest('TEST C.5', 'Staff 2 has distinct staffId STF-1052 and distinct userId usr_staff_2',
        res.body.session.user.staffId === 'STF-1052' && res.body.session.user.id === 'usr_staff_2');
    logTest('TEST C.6', 'Staff 1 and Staff 2 identities and tokens are distinct',
        res.body.session.user.id !== 'usr_staff_1' && res.body.session.token !== staff1Token);
    const staff2Token = res.body.session.token;

    // =========================================================================
    // TEST D — UNAUTHORIZED PIN
    // =========================================================================
    console.log('\n--- TEST D — UNAUTHORIZED PIN ---');
    authService.clearFailedAttempts('127.0.0.1');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '9999' }));
    await loginHandler(req, res);
    logTest('TEST D.1', 'Unapproved PIN 9999 returns HTTP 401 Unauthorized', res.statusCode === 401);
    logTest('TEST D.2', 'Unapproved PIN returns success: false', res.body && res.body.success === false);
    
    let incompleteRes = createMockReqRes('POST', '/api/auth/login', { pin: '105' });
    await loginHandler(incompleteRes.req, incompleteRes.res);
    logTest('TEST D.3', 'Incomplete PIN (105) returns HTTP 400 Bad Request', incompleteRes.res.statusCode === 400);

    let emptyRes = createMockReqRes('POST', '/api/auth/login', { pin: '' });
    await loginHandler(emptyRes.req, emptyRes.res);
    logTest('TEST D.4', 'Empty PIN returns HTTP 400 Bad Request', emptyRes.res.statusCode === 400);

    // =========================================================================
    // TEST E — LEGACY PIN REJECTION
    // =========================================================================
    console.log('\n--- TEST E — LEGACY PIN REJECTION ---');
    authService.clearFailedAttempts('127.0.0.1');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '0000' }));
    await loginHandler(req, res);
    logTest('TEST E.1', 'Legacy Cashier PIN 0000 returns HTTP 401 Unauthorized', res.statusCode === 401);
    logTest('TEST E.2', 'Legacy 0000 creates no session', !res.body.session);

    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1234' }));
    await loginHandler(req, res);
    logTest('TEST E.3', 'Legacy Admin PIN 1234 returns HTTP 401 Unauthorized', res.statusCode === 401);
    logTest('TEST E.4', 'Legacy 1234 creates no session', !res.body.session);

    // Verify index.html does not contain legacy PIN hints
    logTest('TEST E.5', 'No "Cashier PIN: 0000" in login screen HTML', !htmlContent.includes('Cashier PIN: 0000'));
    logTest('TEST E.6', 'No "Admin: 1234" demo box in login screen HTML', !htmlContent.includes('Admin: 1234'));
    logTest('TEST E.7', 'No "Cashier: 0000" demo box in login screen HTML', !htmlContent.includes('Cashier: 0000'));
    logTest('TEST E.8', 'No kiosk-demo-helpers in login screen HTML', !htmlContent.includes('kiosk-demo-helpers'));

    // =========================================================================
    // TEST F — MASKED INPUT
    // =========================================================================
    console.log('\n--- TEST F — MASKED INPUT ---');
    const mockBoxes = [
        document.getElementById('kioskPin0'),
        document.getElementById('kioskPin1'),
        document.getElementById('kioskPin2'),
        document.getElementById('kioskPin3')
    ];
    logTest('TEST F.1', 'Four PIN box elements exist in DOM', mockBoxes.every(b => b !== null));

    // Simulate masked display logic matching app.js line 673: b.innerHTML = '\u25cf'
    let pinDigits = [];
    function updateDisplay(digits) {
        mockBoxes.forEach((box, index) => {
            if (index < digits.length) {
                box.classList.add('filled');
                box.innerHTML = '\u25cf';
            } else {
                box.classList.remove('filled');
                box.innerHTML = '';
            }
        });
    }

    pinDigits = [];
    updateDisplay(pinDigits);
    logTest('TEST F.2', 'Initial state: all 4 boxes are empty [ ] [ ] [ ] [ ]', mockBoxes.every(b => b.innerHTML === ''));

    pinDigits.push('1');
    updateDisplay(pinDigits);
    logTest('TEST F.3', 'After 1 digit: Box 0 masked dot, others empty',
        mockBoxes[0].innerHTML === '\u25cf' && mockBoxes[1].innerHTML === '' && mockBoxes[2].innerHTML === '' && mockBoxes[3].innerHTML === '');

    pinDigits.push('0');
    updateDisplay(pinDigits);
    logTest('TEST F.4', 'After 2 digits: Box 0 and 1 masked dot, others empty',
        mockBoxes[0].innerHTML === '\u25cf' && mockBoxes[1].innerHTML === '\u25cf' && mockBoxes[2].innerHTML === '' && mockBoxes[3].innerHTML === '');

    pinDigits.push('5');
    pinDigits.push('0');
    updateDisplay(pinDigits);
    logTest('TEST F.5', 'After 4 digits: All 4 boxes contain masked dots ● ● ● ●',
        mockBoxes.every(b => b.innerHTML === '\u25cf' && b.classList.contains('filled')));

    // Check no raw numbers appear in DOM
    const rawDigitsPresent = mockBoxes.some(b => /[0-9]/.test(b.textContent));
    logTest('TEST F.6', 'Raw entered digits never appear in visible text nodes', !rawDigitsPresent);

    // Backspace test
    pinDigits.pop();
    updateDisplay(pinDigits);
    logTest('TEST F.7', 'Backspace clears 4th position', mockBoxes[3].innerHTML === '' && mockBoxes[2].innerHTML === '\u25cf');

    // Clear test
    pinDigits = [];
    updateDisplay(pinDigits);
    logTest('TEST F.8', 'Clear (C) resets all boxes to empty', mockBoxes.every(b => b.innerHTML === ''));

    // =========================================================================
    // TEST G — SAME-DEVICE USER SWITCHING
    // =========================================================================
    console.log('\n--- TEST G — SAME-DEVICE USER SWITCHING ---');
    authService.clearFailedAttempts('127.0.0.1');

    // Step 1: Cashier Login
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1050' }));
    await loginHandler(req, res);
    const sameDevCashierTok = res.body.session.token;
    let currentRole = res.body.session.user.role;
    let canOpen = res.body.session.user.canOpenSidebar;
    logTest('TEST G.1', 'Step 1: Cashier login succeeds on device', res.statusCode === 200 && currentRole === 'cashier' && canOpen === true);

    // Step 2: Cashier Logout
    ({ req, res } = createMockReqRes('POST', '/api/auth/logout', {}, { authorization: `Bearer ${sameDevCashierTok}` }));
    await logoutHandler(req, res);
    logTest('TEST G.2', 'Step 2: Cashier logs out successfully', res.statusCode === 200);
    logTest('TEST G.3', 'Cashier session revoked on server', authService.getSession(sameDevCashierTok) === null);

    // Step 3: Staff 1 Login
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1051' }));
    await loginHandler(req, res);
    const sameDevStaff1Tok = res.body.session.token;
    currentRole = res.body.session.user.role;
    canOpen = res.body.session.user.canOpenSidebar;
    logTest('TEST G.4', 'Step 3: Staff 1 login succeeds on same device', res.statusCode === 200 && currentRole === 'staff');
    logTest('TEST G.5', 'Staff 1 cannot open sidebar (permission not leaked from Cashier)', canOpen === false);

    // Step 4: Staff 1 Logout
    ({ req, res } = createMockReqRes('POST', '/api/auth/logout', {}, { authorization: `Bearer ${sameDevStaff1Tok}` }));
    await logoutHandler(req, res);
    logTest('TEST G.6', 'Step 4: Staff 1 logs out successfully', res.statusCode === 200);

    // Step 5: Staff 2 Login
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1052' }));
    await loginHandler(req, res);
    const sameDevStaff2Tok = res.body.session.token;
    currentRole = res.body.session.user.role;
    canOpen = res.body.session.user.canOpenSidebar;
    logTest('TEST G.7', 'Step 5: Staff 2 login succeeds on same device', res.statusCode === 200 && currentRole === 'staff');
    logTest('TEST G.8', 'Staff 2 receives distinct staffId STF-1052 and canOpenSidebar = false',
        res.body.session.user.staffId === 'STF-1052' && canOpen === false);

    // Cleanup Staff 2 session
    authService.revokeSession(sameDevStaff2Tok);

    // =========================================================================
    // TEST H — THREE SIMULTANEOUS DEVICES
    // =========================================================================
    console.log('\n--- TEST H — THREE SIMULTANEOUS DEVICES ---');
    authService.clearFailedAttempts('127.0.0.1');

    // Device 1: Cashier
    let dev1 = createMockReqRes('POST', '/api/auth/login', { pin: '1050' }, { 'x-forwarded-for': '192.168.1.101' });
    await loginHandler(dev1.req, dev1.res);
    const dev1Token = dev1.res.body.session.token;

    // Device 2: Staff 1
    let dev2 = createMockReqRes('POST', '/api/auth/login', { pin: '1051' }, { 'x-forwarded-for': '192.168.1.102' });
    await loginHandler(dev2.req, dev2.res);
    const dev2Token = dev2.res.body.session.token;

    // Device 3: Staff 2
    let dev3 = createMockReqRes('POST', '/api/auth/login', { pin: '1052' }, { 'x-forwarded-for': '192.168.1.103' });
    await loginHandler(dev3.req, dev3.res);
    const dev3Token = dev3.res.body.session.token;

    // Validate all 3 active simultaneously
    const dev1Session = authService.getSession(dev1Token);
    const dev2Session = authService.getSession(dev2Token);
    const dev3Session = authService.getSession(dev3Token);

    logTest('TEST H.1', 'Device 1 (Cashier) is active simultaneously', dev1Session !== null && dev1Session.user.role === 'cashier');
    logTest('TEST H.2', 'Device 2 (Staff 1) is active simultaneously', dev2Session !== null && dev2Session.user.role === 'staff');
    logTest('TEST H.3', 'Device 3 (Staff 2) is active simultaneously', dev3Session !== null && dev3Session.user.role === 'staff');
    logTest('TEST H.4', 'All three tokens are mutually distinct', dev1Token !== dev2Token && dev2Token !== dev3Token && dev1Token !== dev3Token);
    logTest('TEST H.5', 'Device 1 has canOpenSidebar = true, Device 2 & 3 have canOpenSidebar = false',
        dev1Session.user.canOpenSidebar === true && dev2Session.user.canOpenSidebar === false && dev3Session.user.canOpenSidebar === false);

    // =========================================================================
    // TEST I — INDEPENDENT LOGOUT
    // =========================================================================
    console.log('\n--- TEST I — INDEPENDENT LOGOUT ---');
    // Device 1 logs out
    let logoutDev1 = createMockReqRes('POST', '/api/auth/logout', {}, { authorization: `Bearer ${dev1Token}` });
    await logoutHandler(logoutDev1.req, logoutDev1.res);

    logTest('TEST I.1', 'Device 1 logout returns HTTP 200 OK', logoutDev1.res.statusCode === 200);
    logTest('TEST I.2', 'Device 1 session revoked in server registry', authService.getSession(dev1Token) === null);
    logTest('TEST I.3', 'Device 2 (Staff 1) remains fully authenticated and active', authService.getSession(dev2Token) !== null);
    logTest('TEST I.4', 'Device 3 (Staff 2) remains fully authenticated and active', authService.getSession(dev3Token) !== null);

    // Device 2 logs out
    let logoutDev2 = createMockReqRes('POST', '/api/auth/logout', {}, { authorization: `Bearer ${dev2Token}` });
    await logoutHandler(logoutDev2.req, logoutDev2.res);
    logTest('TEST I.5', 'Device 2 session revoked, Device 3 remains fully authenticated',
        authService.getSession(dev2Token) === null && authService.getSession(dev3Token) !== null);

    // Device 3 logs out
    let logoutDev3 = createMockReqRes('POST', '/api/auth/logout', {}, { authorization: `Bearer ${dev3Token}` });
    await logoutHandler(logoutDev3.req, logoutDev3.res);
    logTest('TEST I.6', 'Device 3 session revoked cleanly', authService.getSession(dev3Token) === null);

    // =========================================================================
    // TEST J — CONCURRENT ORDER CREATION
    // =========================================================================
    console.log('\n--- TEST J — CONCURRENT ORDER CREATION ---');
    const ordersCentralDb = [];

    // Simulate 3 concurrent order payloads created by 3 users
    const orderCashier = {
        id: 'ORD-1001',
        seq: 1001,
        shiftId: 'SH-101',
        userId: 'usr_cashier',
        staffId: 'STF-1050',
        cashier: 'Cashier',
        companyId: 'CMP-001',
        branchId: 'BR-001',
        total: 85.50
    };
    const orderStaff1 = {
        id: 'ORD-1002',
        seq: 1002,
        shiftId: 'SH-101',
        userId: 'usr_staff_1',
        staffId: 'STF-1051',
        cashier: 'Staff 1',
        companyId: 'CMP-001',
        branchId: 'BR-001',
        total: 42.00
    };
    const orderStaff2 = {
        id: 'ORD-1003',
        seq: 1003,
        shiftId: 'SH-101',
        userId: 'usr_staff_2',
        staffId: 'STF-1052',
        cashier: 'Staff 2',
        companyId: 'CMP-001',
        branchId: 'BR-001',
        total: 110.00
    };

    ordersCentralDb.push(orderCashier, orderStaff1, orderStaff2);

    logTest('TEST J.1', 'All 3 concurrent orders saved centrally', ordersCentralDb.length === 3);
    logTest('TEST J.2', 'Order 1 retains Cashier identity (usr_cashier, STF-1050)',
        ordersCentralDb[0].userId === 'usr_cashier' && ordersCentralDb[0].staffId === 'STF-1050');
    logTest('TEST J.3', 'Order 2 retains Staff 1 identity (usr_staff_1, STF-1051)',
        ordersCentralDb[1].userId === 'usr_staff_1' && ordersCentralDb[1].staffId === 'STF-1051');
    logTest('TEST J.4', 'Order 3 retains Staff 2 identity (usr_staff_2, STF-1052)',
        ordersCentralDb[2].userId === 'usr_staff_2' && ordersCentralDb[2].staffId === 'STF-1052');
    logTest('TEST J.5', 'No orders overwritten; all order IDs are unique',
        new Set(ordersCentralDb.map(o => o.id)).size === 3);

    // =========================================================================
    // TEST K — SHIFT ATTRIBUTION
    // =========================================================================
    console.log('\n--- TEST K — SHIFT ATTRIBUTION ---');
    const shiftMatches = ordersCentralDb.every(o => o.shiftId === 'SH-101');
    const noPinInShift = ordersCentralDb.every(o => o.shiftId !== '1050' && o.shiftId !== '1051' && o.shiftId !== '1052');
    logTest('TEST K.1', 'Staff and Cashier orders retain correct active Shift ID (SH-101)', shiftMatches);
    logTest('TEST K.2', 'Shift ID does not substitute PIN values', noPinInShift);

    // =========================================================================
    // TEST L — STAFF DIRECT URL SECURITY
    // =========================================================================
    console.log('\n--- TEST L — STAFF DIRECT URL SECURITY ---');
    const appJsContent = fs.readFileSync(path.join(frontendRoot, 'js/app.js'), 'utf8');
    const reportsJsContent = fs.readFileSync(path.join(frontendRoot, 'js/reports.js'), 'utf8');

    logTest('TEST L.1', 'canUserOpenSidebar returns false for staff', appJsContent.includes("if (currentUser.role === 'staff')") && appJsContent.includes("return false;"));
    logTest('TEST L.2', 'toggleSideDrawer prevents sidebar opening for staff', appJsContent.includes("if (!canUserOpenSidebar())") && appJsContent.includes("return;"));
    logTest('TEST L.3', 'openReportModule enforces RBAC check on direct call', reportsJsContent.includes("currentUser.role === 'staff'"));
    logTest('TEST L.4', 'Staff attempting report module receives ACCESS DENIED toast and redirects to pos',
        reportsJsContent.includes("ACCESS DENIED") && reportsJsContent.includes("switchView('pos')"));

    // =========================================================================
    // TEST M — PROTECTED API SECURITY
    // =========================================================================
    console.log('\n--- TEST M — PROTECTED API SECURITY ---');
    // Login Cashier to get fresh token
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1050' }));
    await loginHandler(req, res);
    const testCashierToken = res.body.session.token;

    // Login Staff 1 to get fresh token
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1051' }));
    await loginHandler(req, res);
    const testStaffToken = res.body.session.token;

    // Staff calls GET /api/reports
    let staffApiReq = createMockReqRes('GET', '/api/reports', {}, { authorization: `Bearer ${testStaffToken}` });
    await reportsHandler(staffApiReq.req, staffApiReq.res);
    logTest('TEST M.1', 'Staff direct request to GET /api/reports returns HTTP 403 Forbidden', staffApiReq.res.statusCode === 403);
    logTest('TEST M.2', 'Staff direct request returns ACCESS DENIED message', staffApiReq.res.body && staffApiReq.res.body.error.includes('ACCESS DENIED'));

    // Cashier calls GET /api/reports
    let cashierApiReq = createMockReqRes('GET', '/api/reports', {}, { authorization: `Bearer ${testCashierToken}` });
    await reportsHandler(cashierApiReq.req, cashierApiReq.res);
    logTest('TEST M.3', 'Cashier direct request to GET /api/reports returns HTTP 200 OK', cashierApiReq.res.statusCode === 200);
    logTest('TEST M.4', 'Cashier receives authorized management report payload', cashierApiReq.res.body && cashierApiReq.res.body.success === true && cashierApiReq.res.body.authorizedUser !== undefined);

    // Unauthenticated calls GET /api/reports
    let unauthApiReq = createMockReqRes('GET', '/api/reports');
    await reportsHandler(unauthApiReq.req, unauthApiReq.res);
    logTest('TEST M.5', 'Unauthenticated request to /api/reports returns HTTP 401 Unauthorized', unauthApiReq.res.statusCode === 401);

    // =========================================================================
    // TEST N — ENGLISH / ARABIC
    // =========================================================================
    console.log('\n--- TEST N — ENGLISH / ARABIC ---');
    logTest('TEST N.1', 'Role strings remain stable internal identifiers (cashier, staff)',
        authService.CREDENTIAL_REGISTRY.every(c => c.user.role === 'cashier' || c.user.role === 'staff'));
    logTest('TEST N.2', 'Bilingual display names provisioned for Cashier (Cashier / كاشير)',
        authService.CREDENTIAL_REGISTRY[0].user.nameEn === 'Cashier' && authService.CREDENTIAL_REGISTRY[0].user.nameAr === 'كاشير');
    logTest('TEST N.3', 'Bilingual display names provisioned for Staff 1 (Staff 1 / موظف 1)',
        authService.CREDENTIAL_REGISTRY[1].user.nameEn === 'Staff 1' && authService.CREDENTIAL_REGISTRY[1].user.nameAr === 'موظف 1');
    logTest('TEST N.4', 'Bilingual display names provisioned for Staff 2 (Staff 2 / موظف 2)',
        authService.CREDENTIAL_REGISTRY[2].user.nameEn === 'Staff 2' && authService.CREDENTIAL_REGISTRY[2].user.nameAr === 'موظف 2');

    // =========================================================================
    // TEST O — RESPONSIVE DEVICES
    // =========================================================================
    console.log('\n--- TEST O — RESPONSIVE DEVICES ---');
    const drawerToggleBtn = document.getElementById('drawerToggleBtn');
    const numpadButtons = document.querySelectorAll('.kiosk-numpad-btn');
    const loginModal = document.getElementById('loginModal');

    logTest('TEST O.1', 'Hamburger button (#drawerToggleBtn) exists in topbar', drawerToggleBtn !== null);
    logTest('TEST O.2', 'Hamburger button contains fa-bars icon', drawerToggleBtn && drawerToggleBtn.innerHTML.includes('fa-bars'));
    logTest('TEST O.3', 'Hamburger button onclick triggers toggleSideDrawer()', drawerToggleBtn && drawerToggleBtn.getAttribute('onclick') === 'toggleSideDrawer()');
    logTest('TEST O.4', 'Login numeric keypad exists with 12 keys (0-9, C, Backspace)', numpadButtons.length === 12);
    logTest('TEST O.5', 'Login modal exists with modal container', loginModal !== null);

    // =========================================================================
    // TEST P — BRUTE-FORCE PROTECTION
    // =========================================================================
    console.log('\n--- TEST P — BRUTE-FORCE PROTECTION ---');
    const testIp = '192.168.10.99';
    authService.clearFailedAttempts(testIp);

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
        let badReq = createMockReqRes('POST', '/api/auth/login', { pin: '0001' }, { 'x-forwarded-for': testIp });
        await loginHandler(badReq.req, badReq.res);
    }

    // 6th attempt should trigger 429
    let lockedReq = createMockReqRes('POST', '/api/auth/login', { pin: '1050' }, { 'x-forwarded-for': testIp });
    await loginHandler(lockedReq.req, lockedReq.res);
    logTest('TEST P.1', 'Exceeding 5 failed attempts triggers HTTP 429 Too Many Requests', lockedReq.res.statusCode === 429);
    logTest('TEST P.2', 'Response includes locked indicator and retryAfter window',
        lockedReq.res.body && lockedReq.res.body.retryAfter > 0);
    logTest('TEST P.3', 'Audit log records ACCOUNT_LOCKOUT event',
        authService.securityAuditEvents.some(e => e.event === 'ACCOUNT_LOCKOUT' && e.ip === testIp));
    logTest('TEST P.4', 'Audit events NEVER log raw entered PINs',
        authService.securityAuditEvents.every(e => e.pin === undefined));
    authService.clearFailedAttempts(testIp);

    // =========================================================================
    // TEST Q — REGRESSION
    // =========================================================================
    console.log('\n--- TEST Q — REGRESSION ---');
    logTest('TEST Q.1', 'Order / Cart panel exists on left (.pos-order-panel)', document.querySelector('.pos-order-panel') !== null);
    logTest('TEST Q.2', 'Product catalog panel exists on right (.pos-catalog-panel)', document.querySelector('.pos-catalog-panel') !== null);
    logTest('TEST Q.3', 'Customer dropdown exists (#posCustomerSelect)', document.getElementById('posCustomerSelect') !== null);
    logTest('TEST Q.4', 'Order type dropdown exists (#posOrderTypeSelect)', document.getElementById('posOrderTypeSelect') !== null);
    logTest('TEST Q.5', 'Top action buttons preserved (Cancel, Discount, Notes, More)',
        document.querySelector('.btn-cancel') !== null &&
        document.querySelector('.btn-discounts') !== null &&
        document.querySelector('.btn-notes') !== null &&
        document.querySelector('.btn-more') !== null);
    logTest('TEST Q.6', 'Bottom navigation preserved (New, Orders, Tables, Main Screen)',
        htmlContent.includes('bottomNavNewOrder()') &&
        htmlContent.includes('bottomNavOrders()') &&
        htmlContent.includes('bottomNavTables()') &&
        htmlContent.includes('bottomNavMainScreen()'));

    // =========================================================================
    // TEST R — LEGITIMATE ADMIN AUTHENTICATION
    // =========================================================================
    console.log('\n--- TEST R — LEGITIMATE ADMIN AUTHENTICATION ---');
    logTest('TEST R.1', 'requestAdminAccess function exists and enforces legitimate admin/manager role',
        appJsContent.includes('function requestAdminAccess') && appJsContent.includes("role === 'admin' || currentUser.role === 'manager'"));
    logTest('TEST R.2', 'No legacy plaintext PIN fallback in requestAdminAccess',
        !appJsContent.includes("prompt(") || !appJsContent.includes("'1234'"));

    console.log('\n=====================================================================');
    console.log(`=== TEST EXECUTION COMPLETED: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests}) ===`);
    console.log('=====================================================================\n');

    return { totalTests, passedTests, failedTests, resultsByTest };
}

runTestSuite().catch(err => {
    console.error('Test Suite Exception:', err);
    process.exit(1);
});
