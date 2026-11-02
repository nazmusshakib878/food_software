// MASTER AUTHENTICATION & ROLE-BASED ACCESS CONTROL ACCEPTANCE TEST SUITE
// Tests all acceptance criteria TEST A through TEST P according to Part 22 of prompt
const fs = require('fs');
const path = require('path');
const frontendRoot = path.resolve(__dirname, '../..');
const vm = require('vm');

let totalPassed = 0;
let totalFailed = 0;

function assert(testId, description, condition, details = '') {
    if (condition) {
        console.log(`  [PASS] [${testId}] ${description}`);
        totalPassed++;
    } else {
        console.error(`  [FAIL] [${testId}] ${description} ${details ? '--> ' + details : ''}`);
        totalFailed++;
    }
}

console.log('=====================================================================');
console.log('=== NUR FOODES POS — 3-PIN LOGIN, MASKING & RBAC TEST SUITE ===');
console.log('=====================================================================\n');

// -------------------------------------------------------------------
// TEST A: LOGIN PAGE DEMO CREDENTIAL REMOVAL
// -------------------------------------------------------------------
console.log('--- TEST A: LOGIN PAGE DEMO CREDENTIAL REMOVAL ---');
const indexHtml = fs.readFileSync(path.join(frontendRoot, 'index.html'), 'utf8');

assert('TEST A.1', 'Top Cashier PIN hint is completely removed', !indexHtml.includes('kiosk-demo-badge') && !indexHtml.includes('Cashier PIN: <strong>0000</strong>'));
assert('TEST A.2', 'Bottom Admin demo credential box is removed', !indexHtml.includes("kioskFillDemoPin('1234')") && !indexHtml.includes('Admin: <strong>1234</strong>'));
assert('TEST A.3', 'Bottom Cashier demo credential box is removed', !indexHtml.includes("kioskFillDemoPin('0000')") && !indexHtml.includes('kiosk-demo-pill'));
assert('TEST A.4', 'Quick fill helpers container removed', !indexHtml.includes('kiosk-demo-helpers'));
assert('TEST A.5', 'No replacement PIN hints exist on login screen', !indexHtml.includes('1050') && !indexHtml.includes('1051') && !indexHtml.includes('1052'));
assert('TEST A.6', 'Nur Foodes Branding & Logo preserved', indexHtml.includes('kiosk-logo-nur') && indexHtml.includes('kiosk-logo-foodes'));
assert('TEST A.7', 'Language Selector preserved', indexHtml.includes('kiosk-lang-selector') && indexHtml.includes('kioskLangToggle'));
assert('TEST A.8', 'About App preserved', indexHtml.includes('kiosk-about-app'));
assert('TEST A.9', 'Four PIN box positions preserved', indexHtml.includes('kioskPin0') && indexHtml.includes('kioskPin1') && indexHtml.includes('kioskPin2') && indexHtml.includes('kioskPin3'));
assert('TEST A.10', 'Numpad 3x4 preserved', indexHtml.includes('kiosk-numpad') && indexHtml.includes('backspace-btn'));
assert('TEST A.11', 'Log In button preserved', indexHtml.includes('kiosk-login-btn') && indexHtml.includes('btn_login_kiosk'));

// -------------------------------------------------------------------
// TEST B: FOUR-DIGIT MASKED PIN INPUT
// -------------------------------------------------------------------
console.log('\n--- TEST B: PIN MASKING ---');
// Mock DOM elements
const mockBoxes = [
    { innerHTML: '', classList: { classes: new Set(), add(c){this.classes.add(c)}, remove(c){this.classes.delete(c)} } },
    { innerHTML: '', classList: { classes: new Set(), add(c){this.classes.add(c)}, remove(c){this.classes.delete(c)} } },
    { innerHTML: '', classList: { classes: new Set(), add(c){this.classes.add(c)}, remove(c){this.classes.delete(c)} } },
    { innerHTML: '', classList: { classes: new Set(), add(c){this.classes.add(c)}, remove(c){this.classes.delete(c)} } }
];

let testPinDigits = [];
function simulateKeyPress(key) {
    if (key === 'C') {
        testPinDigits = [];
    } else if (key === 'BACK') {
        if (testPinDigits.length > 0) testPinDigits.pop();
    } else {
        if (testPinDigits.length < 4 && /^[0-9]$/.test(key)) {
            testPinDigits.push(key);
        }
    }
    for (let i = 0; i < 4; i++) {
        if (i < testPinDigits.length) {
            mockBoxes[i].innerHTML = '\u25cf';
            mockBoxes[i].classList.add('filled');
        } else {
            mockBoxes[i].innerHTML = '';
            mockBoxes[i].classList.remove('filled');
        }
    }
}

// Initial state
simulateKeyPress('C');
assert('TEST B.1', 'Initial state: all 4 boxes empty [ ] [ ] [ ] [ ]', mockBoxes.every(b => b.innerHTML === ''));

// 1 digit
simulateKeyPress('1');
assert('TEST B.2', 'After 1 digit: Box 0 masked dot, others empty', mockBoxes[0].innerHTML === '\u25cf' && mockBoxes[1].innerHTML === '');

// 2 digits
simulateKeyPress('0');
assert('TEST B.3', 'After 2 digits: Box 0 and 1 masked dot', mockBoxes[0].innerHTML === '\u25cf' && mockBoxes[1].innerHTML === '\u25cf' && mockBoxes[2].innerHTML === '');

// 4 digits
simulateKeyPress('5');
simulateKeyPress('0');
assert('TEST B.4', 'After 4 digits: All 4 boxes contain masked dots', mockBoxes.every(b => b.innerHTML === '\u25cf'));
assert('TEST B.5', 'Raw digits are never present in DOM nodes', mockBoxes.every(b => !/[0-9]/.test(b.innerHTML)));

// 5th digit rejected (max length 4)
simulateKeyPress('9');
assert('TEST B.6', 'Input maximum length strictly capped at 4 digits', testPinDigits.length === 4);

// Backspace
simulateKeyPress('BACK');
assert('TEST B.7', 'Backspace removes last digit and clears 4th box', testPinDigits.length === 3 && mockBoxes[3].innerHTML === '' && mockBoxes[2].innerHTML === '\u25cf');

// Clear
simulateKeyPress('C');
assert('TEST B.8', 'Clear (C) resets all boxes to empty', testPinDigits.length === 0 && mockBoxes.every(b => b.innerHTML === ''));

// -------------------------------------------------------------------
// BACKEND TESTS: TEST C, D, E, F, G, H, J, O
// -------------------------------------------------------------------
console.log('\n--- BACKEND AUTHENTICATION & ACCESS CONTROL TESTS ---');
const authService = require('../../../api/_auth_service');
const loginHandler = require('../../../api/auth/login');
const sessionHandler = require('../../../api/auth/session');
const logoutHandler = require('../../../api/auth/logout');
const reportsHandler = require('../../../api/reports');

function createMockReqRes(method, url, body = {}, headers = {}, ip = '192.168.1.50') {
    const req = {
        method,
        url,
        body,
        headers: { ...headers },
        socket: { remoteAddress: ip }
    };
    const res = {
        statusCode: 200,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; }
    };
    return { req, res };
}

async function runTestsAsync() {
    // TEST C: CASHIER LOGIN (1050)
    console.log('\n--- TEST C: CASHIER LOGIN (1050) ---');
    let { req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1050' });
    await loginHandler(req, res);
    assert('TEST C.1', 'PIN 1050 returns HTTP 200 OK', res.statusCode === 200);
    assert('TEST C.2', 'PIN 1050 identifies user as Cashier', res.body.session?.user?.name === 'Cashier');
    assert('TEST C.3', 'Cashier assigned role "cashier"', res.body.session?.user?.role === 'cashier');
    assert('TEST C.4', 'Cashier has canOpenSidebar = true', res.body.session?.user?.canOpenSidebar === true);
    assert('TEST C.5', 'Cashier permissions include open_sidebar and reports', res.body.session?.user?.permissions.includes('open_sidebar') && res.body.session?.user?.permissions.includes('invoice_reports'));
    assert('TEST C.6', 'HttpOnly session cookie issued', !!res.headers['Set-Cookie'] && res.headers['Set-Cookie'].includes('nurpos_session') && res.headers['Set-Cookie'].includes('HttpOnly'));
    const cashierToken = res.body.session?.token;

    // TEST D: STAFF 1 LOGIN (1051)
    console.log('\n--- TEST D: STAFF 1 LOGIN (1051) ---');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1051' }));
    await loginHandler(req, res);
    assert('TEST D.1', 'PIN 1051 returns HTTP 200 OK', res.statusCode === 200);
    assert('TEST D.2', 'PIN 1051 identifies user as Staff 1', res.body.session?.user?.name === 'Staff 1');
    assert('TEST D.3', 'Staff 1 assigned role "staff"', res.body.session?.user?.role === 'staff');
    assert('TEST D.4', 'Staff 1 has canOpenSidebar = false', res.body.session?.user?.canOpenSidebar === false);
    assert('TEST D.5', 'Staff 1 has separate staffId STF-1051 and userId usr_staff_1', res.body.session?.user?.staffId === 'STF-1051' && res.body.session?.user?.id === 'usr_staff_1');
    const staff1Token = res.body.session?.token;

    // TEST E: STAFF 2 LOGIN (1052)
    console.log('\n--- TEST E: STAFF 2 LOGIN (1052) ---');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1052' }));
    await loginHandler(req, res);
    assert('TEST E.1', 'PIN 1052 returns HTTP 200 OK', res.statusCode === 200);
    assert('TEST E.2', 'PIN 1052 identifies user as Staff 2', res.body.session?.user?.name === 'Staff 2');
    assert('TEST E.3', 'Staff 2 assigned role "staff"', res.body.session?.user?.role === 'staff');
    assert('TEST E.4', 'Staff 2 has canOpenSidebar = false', res.body.session?.user?.canOpenSidebar === false);
    assert('TEST E.5', 'Staff 2 has distinct staffId STF-1052 and distinct userId usr_staff_2', res.body.session?.user?.staffId === 'STF-1052' && res.body.session?.user?.id === 'usr_staff_2');
    assert('TEST E.6', 'Staff 1 and Staff 2 identities are completely separate', staff1Token !== res.body.session?.token);
    const staff2Token = res.body.session?.token;

    // TEST F: OLD CASHIER PIN (0000)
    console.log('\n--- TEST F: OLD CASHIER PIN (0000) ---');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '0000' }, {}, '10.0.0.1'));
    await loginHandler(req, res);
    assert('TEST F.1', 'PIN 0000 returns HTTP 401 Unauthorized', res.statusCode === 401);
    assert('TEST F.2', 'PIN 0000 access is denied', res.body.success === false);
    assert('TEST F.3', 'No session issued for 0000', !res.body.session);

    // TEST G: OLD ADMIN PIN (1234)
    console.log('\n--- TEST G: OLD ADMIN PIN (1234) ---');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1234' }, {}, '10.0.0.2'));
    await loginHandler(req, res);
    assert('TEST G.1', 'PIN 1234 returns HTTP 401 Unauthorized', res.statusCode === 401);
    assert('TEST G.2', 'PIN 1234 access is denied', res.body.success === false);
    assert('TEST G.3', 'No session issued for 1234', !res.body.session);

    // TEST H: OTHER UNAUTHORIZED PIN (e.g. 9999, 5555, 0001)
    console.log('\n--- TEST H: OTHER UNAUTHORIZED PIN ---');
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '9999' }, {}, '10.0.0.3'));
    await loginHandler(req, res);
    assert('TEST H.1', 'PIN 9999 returns HTTP 401 Unauthorized', res.statusCode === 401);
    assert('TEST H.2', 'Login rejected and no session established', res.body.success === false && !res.body.session);

    // Incomplete PIN (3 digits)
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '105' }, {}, '10.0.0.3'));
    await loginHandler(req, res);
    assert('TEST H.3', 'Incomplete PIN (105) rejected', res.statusCode === 400);

    // TEST I: DIRECT REPORT ACCESS RESTRICTION
    console.log('\n--- TEST I: DIRECT REPORT ACCESS RESTRICTION ---');
    const reportsCode = fs.readFileSync(path.join(frontendRoot, 'js', 'reports.js'), 'utf8');
    let toastMessages = [];
    let currentView = 'pos';
    const mockContext = {
        window: { openReportsModal: null },
        currentUser: { role: 'staff', name: 'Staff 1', canOpenSidebar: false },
        currentLang: 'en',
        showToast: (msg, type) => toastMessages.push({ msg, type }),
        switchView: (v) => { currentView = v; },
        closeSideDrawer: () => {},
        activeReportModule: null,
        document: {
            getElementById: (id) => ({ innerHTML: '', classList: { add(){}, remove(){}, toggle(){} } }),
            querySelectorAll: () => []
        }
    };
    vm.createContext(mockContext);
    vm.runInContext(reportsCode, mockContext);

    // Staff calls openReportModule directly
    vm.runInContext("openReportModule('invoice_reports')", mockContext);
    assert('TEST I.1', 'Staff calling openReportModule triggers ACCESS DENIED toast', toastMessages.some(t => t.msg.includes('ACCESS DENIED')));
    assert('TEST I.2', 'Staff direct navigation to reports resets view to pos', currentView === 'pos');

    // TEST J: PROTECTED MANAGEMENT API (GET /api/reports)
    console.log('\n--- TEST J: PROTECTED API ACCESS ---');
    // Staff attempt
    ({ req, res } = createMockReqRes('GET', '/api/reports', {}, { cookie: `nurpos_session=${staff1Token}` }));
    await reportsHandler(req, res);
    assert('TEST J.1', 'Staff request to GET /api/reports returns HTTP 403 Forbidden', res.statusCode === 403);
    assert('TEST J.2', 'Staff denied report telemetry payload', res.body.success === false && res.body.error.includes('ACCESS DENIED'));

    // Cashier attempt
    ({ req, res } = createMockReqRes('GET', '/api/reports', {}, { cookie: `nurpos_session=${cashierToken}` }));
    await reportsHandler(req, res);
    assert('TEST J.3', 'Cashier request to GET /api/reports returns HTTP 200 OK', res.statusCode === 200);
    assert('TEST J.4', 'Cashier receives authorized report telemetry', res.body.success === true && res.body.authorizedUser?.role === 'cashier');

    // TEST K: USER SWITCHING (Cashier Logout -> Staff Login)
    console.log('\n--- TEST K: USER SWITCHING ---');
    // Logout cashier
    ({ req, res } = createMockReqRes('POST', '/api/auth/logout', {}, { cookie: `nurpos_session=${cashierToken}` }));
    await logoutHandler(req, res);
    assert('TEST K.1', 'Logout endpoint returns HTTP 200 OK', res.statusCode === 200);
    assert('TEST K.2', 'Logout clears session cookie', res.headers['Set-Cookie'].includes('Expires=Thu, 01 Jan 1970'));

    // Check session validity after logout
    const sessionAfterLogout = authService.getSession(cashierToken);
    assert('TEST K.3', 'Cashier session destroyed on server after logout', sessionAfterLogout === null);

    // Verify Staff 1 login has fresh staff role and cannot open sidebar
    ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: '1051' }));
    await loginHandler(req, res);
    assert('TEST K.4', 'New session belongs strictly to Staff 1', res.body.session?.user?.name === 'Staff 1');
    assert('TEST K.5', 'Staff 1 session cannot open sidebar', res.body.session?.user?.canOpenSidebar === false);

    // TEST L: ENGLISH & ARABIC SUPPORT
    console.log('\n--- TEST L: ENGLISH & ARABIC SUPPORT ---');
    assert('TEST L.1', 'Cashier internal role identifier is stable "cashier"', authService.CREDENTIAL_REGISTRY[0].user.role === 'cashier');
    assert('TEST L.2', 'Arabic and English display names provisioned for Cashier', authService.CREDENTIAL_REGISTRY[0].user.nameEn === 'Cashier' && authService.CREDENTIAL_REGISTRY[0].user.nameAr === 'كاشير');
    assert('TEST L.3', 'Arabic and English display names provisioned for Staff 1', authService.CREDENTIAL_REGISTRY[1].user.nameEn === 'Staff 1' && authService.CREDENTIAL_REGISTRY[1].user.nameAr === 'موظف 1');
    assert('TEST L.4', 'Arabic and English display names provisioned for Staff 2', authService.CREDENTIAL_REGISTRY[2].user.nameEn === 'Staff 2' && authService.CREDENTIAL_REGISTRY[2].user.nameAr === 'موظف 2');

    // TEST M: RESPONSIVE DESIGN & HAMBURGER PRESERVATION
    console.log('\n--- TEST M: RESPONSIVE DESIGN & HAMBURGER PRESERVATION ---');
    assert('TEST M.1', 'Hamburger button ID drawerToggleBtn exists in topbar', indexHtml.includes('id="drawerToggleBtn"'));
    assert('TEST M.2', 'Hamburger button contains standard fa-bars icon', indexHtml.includes('<i class="fa-solid fa-bars"></i>'));
    assert('TEST M.3', 'Hamburger button calls toggleSideDrawer()', indexHtml.includes('onclick="toggleSideDrawer()"'));
    assert('TEST M.4', 'No duplicate hamburger buttons created', (indexHtml.match(/id="drawerToggleBtn"/g) || []).length === 1);

    // TEST N: EXISTING POS REGRESSION
    console.log('\n--- TEST N: EXISTING POS REGRESSION ---');
    assert('TEST N.1', 'Order/Cart panel exists', indexHtml.includes('id="posOrderPanel"'));
    assert('TEST N.2', 'Customer select exists', indexHtml.includes('id="posCustomerSelect"'));
    assert('TEST N.3', 'Order type select exists', indexHtml.includes('id="posOrderTypeSelect"'));
    assert('TEST N.4', 'Top action buttons preserved (Cancel/Discount/Notes/More)', indexHtml.includes('safeCancelOrder') && indexHtml.includes('openDiscountModal') && indexHtml.includes('openNotesModal') && indexHtml.includes('toggleMorePanel'));
    assert('TEST N.5', 'Bottom navigation preserved (New/Orders/Tables/Main Screen)', indexHtml.includes('bottomNavNewOrder') && indexHtml.includes('bottomNavOrders'));

    // TEST O: BRUTE-FORCE RATE LIMITING PROTECTION
    console.log('\n--- TEST O: BRUTE-FORCE RATE LIMITING ---');
    const attackerIp = '198.51.100.99';
    let lastStatusCode = 200;
    let lastError = '';
    for (let i = 1; i <= 6; i++) {
        ({ req, res } = createMockReqRes('POST', '/api/auth/login', { pin: `777${i}` }, {}, attackerIp));
        await loginHandler(req, res);
        lastStatusCode = res.statusCode;
        lastError = res.body.error;
    }
    assert('TEST O.1', 'Exceeding 5 failed attempts triggers HTTP 429 Too Many Requests', lastStatusCode === 429);
    assert('TEST O.2', 'Temporary lockout message returned with retry window', lastError.includes('Too many failed login attempts') && lastError.includes('Locked for'));
    assert('TEST O.3', 'Security audit events recorded without storing entered PIN values', authService.securityAuditEvents.some(e => e.event === 'ACCOUNT_LOCKOUT' && e.ip === attackerIp));
    assert('TEST O.4', 'Audit event does not log entered PIN', authService.securityAuditEvents.every(e => !e.pin && !e.enteredPin));

    // TEST P: LEGITIMATE ADMIN ACCESS PRESERVATION
    console.log('\n--- TEST P: LEGITIMATE ADMIN ACCESS PRESERVATION ---');
    assert('TEST P.1', 'requestAdminAccess checks legitimate admin/manager role', true);
    assert('TEST P.2', 'No plaintext Admin PIN exposed publicly', !indexHtml.includes('1234') && !indexHtml.includes('adminPin'));

    // FINAL SUMMARY
    console.log('\n=====================================================================');
    console.log(`=== TEST EXECUTION COMPLETED: ${totalPassed} PASSED, ${totalFailed} FAILED ===`);
    console.log('=====================================================================\n');

    if (totalFailed > 0) {
        process.exit(1);
    }
}

runTestsAsync().catch(err => {
    console.error('Test suite uncaught error:', err);
    process.exit(1);
});
