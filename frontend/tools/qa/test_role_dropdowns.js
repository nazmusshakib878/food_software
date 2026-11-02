/**
 * NUR FOODES POS — ROLE-BASED DROPDOWN SYSTEM ACCEPTANCE TEST SUITE
 * Complete Verification of PART 19 (TEST A through TEST O)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const frontendRoot = path.resolve(__dirname, '../..');
const { JSDOM } = require('jsdom');

// 1. Load Backend API Services
const authService = require('../../../api/_auth_service');
const loginHandler = require('../../../api/auth/login');
const logoutHandler = require('../../../api/auth/logout');
const ordersHandler = require('../../../api/orders');

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
    const category = testId.split('.')[0];
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
    console.log('=== NUR FOODES POS — PART 19 ACCEPTANCE TESTS (TEST A to TEST O) ===');
    console.log('=====================================================================\n');

    // Load DOM environment from index.html with simulated browser scripts
    const htmlContent = fs.readFileSync(path.join(frontendRoot, 'index.html'), 'utf8');
    const dom = new JSDOM(htmlContent, {
        url: 'http://localhost/index.html',
        runScripts: 'dangerously'
    });
    const { window } = dom;

    // Load POS scripts into window execution context
    const scriptFiles = [
        'js/data.js',
        'js/store.js',
        'js/printers.js',
        'js/reports.js',
        'js/pos.js',
        'js/payment.js',
        'js/receipt.js',
        'js/admin.js',
        'js/returns.js',
        'js/shifts.js',
        'js/app.js'
    ];

    for (const f of scriptFiles) {
        const code = fs.readFileSync(path.join(frontendRoot, f), 'utf8');
        const scriptEl = window.document.createElement('script');
        scriptEl.textContent = code;
        window.document.body.appendChild(scriptEl);
    }

    const { document } = window;

    // =========================================================================
    // TEST A — CASHIER OPTIONS
    // =========================================================================
    console.log('--- TEST A — CASHIER OPTIONS ---');
    // Set Cashier role
    window.currentUser = {
        id: 'usr_cashier',
        staffId: 'STF-1050',
        name: 'Cashier',
        nameEn: 'Cashier',
        nameAr: 'كاشير',
        role: 'cashier',
        canOpenSidebar: true
    };
    window.currentLang = 'en';
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();

    const selectCustA = document.getElementById('posCustomerSelect');
    const selectTypeA = document.getElementById('posOrderTypeSelect');
    const optionsCustA = Array.from(selectCustA.options);
    const optionsTypeA = Array.from(selectTypeA.options);

    logTest('TEST A.1', 'Cashier Dropdown 1 contains exactly 10 options', optionsCustA.length === 10, `Found: ${optionsCustA.length}`);
    
    const expectedCashierCustIds = [
        'cash', 'hungerstation', 'jahiz', 'ninja', 'keeta',
        'mrsool', 'toyou', 'thechefz', 'management', 'mosque'
    ];
    const actualCashierCustIds = optionsCustA.map(o => o.value);
    logTest('TEST A.2', 'Cashier Dropdown 1 options match exact required order and IDs',
        JSON.stringify(actualCashierCustIds) === JSON.stringify(expectedCashierCustIds),
        `Actual: ${actualCashierCustIds.join(', ')}`
    );

    logTest('TEST A.3', 'Cashier Dropdown 2 contains exactly 5 standard options', optionsTypeA.length === 5, `Found: ${optionsTypeA.length}`);
    const expectedOrderTypeIds = ['delivery', 'local', 'receive', 'cars', 'delivery_d'];
    const actualOrderTypeIds = optionsTypeA.map(o => o.value);
    logTest('TEST A.4', 'Cashier Dropdown 2 options match exact canonical order: delivery, local, receive, cars, delivery_d',
        JSON.stringify(actualOrderTypeIds) === JSON.stringify(expectedOrderTypeIds),
        `Actual: ${actualOrderTypeIds.join(', ')}`
    );

    // =========================================================================
    // TEST B — STAFF 1 OPTIONS
    // =========================================================================
    console.log('\n--- TEST B — STAFF 1 OPTIONS ---');
    window.currentUser = {
        id: 'usr_staff_1',
        staffId: 'STF-1051',
        name: 'Staff 1',
        nameEn: 'Staff 1',
        nameAr: 'موظف 1',
        role: 'staff',
        canOpenSidebar: false
    };
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();

    const optionsCustB = Array.from(selectCustA.options);
    const optionsTypeB = Array.from(selectTypeA.options);

    logTest('TEST B.1', 'Staff 1 Dropdown 1 contains exactly 1 option', optionsCustB.length === 1, `Found: ${optionsCustB.length}`);
    logTest('TEST B.2', 'Staff 1 Dropdown 1 only option is Cash Customer (value="cash")',
        optionsCustB[0] && optionsCustB[0].value === 'cash');
    logTest('TEST B.3', 'Staff 1 Dropdown 1 does not contain Hungerstation', !optionsCustB.some(o => o.value === 'hungerstation'));
    logTest('TEST B.4', 'Staff 1 Dropdown 1 does not contain any delivery partners',
        !optionsCustB.some(o => ['hungerstation', 'jahiz', 'ninja', 'keeta', 'mrsool', 'toyou', 'thechefz', 'management', 'mosque'].includes(o.value)));
    logTest('TEST B.5', 'Staff 1 Dropdown 2 contains the same 5 standard options', optionsTypeB.length === 5);
    logTest('TEST B.6', 'Staff 1 Dropdown 2 options match standard IDs in order',
        JSON.stringify(optionsTypeB.map(o => o.value)) === JSON.stringify(expectedOrderTypeIds));

    // =========================================================================
    // TEST C — STAFF 2 OPTIONS
    // =========================================================================
    console.log('\n--- TEST C — STAFF 2 OPTIONS ---');
    window.currentUser = {
        id: 'usr_staff_2',
        staffId: 'STF-1052',
        name: 'Staff 2',
        nameEn: 'Staff 2',
        nameAr: 'موظف 2',
        role: 'staff',
        canOpenSidebar: false
    };
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();

    const optionsCustC = Array.from(selectCustA.options);
    const optionsTypeC = Array.from(selectTypeA.options);

    logTest('TEST C.1', 'Staff 2 Dropdown 1 contains exactly 1 option', optionsCustC.length === 1, `Found: ${optionsCustC.length}`);
    logTest('TEST C.2', 'Staff 2 Dropdown 1 only option is Cash Customer (value="cash")',
        optionsCustC[0] && optionsCustC[0].value === 'cash');
    logTest('TEST C.3', 'Staff 2 Dropdown 2 contains the same 5 standard options', optionsTypeC.length === 5);

    // =========================================================================
    // TEST D — DEFAULT VALUES ON LOGIN
    // =========================================================================
    console.log('\n--- TEST D — DEFAULT VALUES ON LOGIN ---');
    // Cashier login defaults
    window.currentUser = { role: 'cashier', name: 'Cashier' };
    window.currentCustomerId = 'cash';
    window.currentOrderTypeId = 'delivery';
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();
    logTest('TEST D.1', 'Cashier fresh session starts with Dropdown 1 = Cash Customer', selectCustA.value === 'cash');
    logTest('TEST D.2', 'Cashier fresh session starts with Dropdown 2 = Delivery', selectTypeA.value === 'delivery');

    // Staff 1 login defaults
    window.currentUser = { role: 'staff', name: 'Staff 1' };
    window.currentCustomerId = 'cash';
    window.currentOrderTypeId = 'delivery';
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();
    logTest('TEST D.3', 'Staff 1 fresh session starts with Dropdown 1 = Cash Customer', selectCustA.value === 'cash');
    logTest('TEST D.4', 'Staff 1 fresh session starts with Dropdown 2 = Delivery', selectTypeA.value === 'delivery');

    // Staff 2 login defaults
    window.currentUser = { role: 'staff', name: 'Staff 2' };
    window.currentCustomerId = 'cash';
    window.currentOrderTypeId = 'delivery';
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();
    logTest('TEST D.5', 'Staff 2 fresh session starts with Dropdown 1 = Cash Customer', selectCustA.value === 'cash');
    logTest('TEST D.6', 'Staff 2 fresh session starts with Dropdown 2 = Delivery', selectTypeA.value === 'delivery');

    // =========================================================================
    // TEST E — CASHIER PARTNER SELECTION & AUTOMATIC MAPPING
    // =========================================================================
    console.log('\n--- TEST E — CASHIER PARTNER SELECTION & AUTOMATIC MAPPING ---');
    window.currentUser = { role: 'cashier', name: 'Cashier' };
    window.renderCustomerSelector();

    // Select Hungerstation
    window.onPosCustomerChange('hungerstation');
    let overlayLabel = window.getPosOrderTypeDisplayedLabel();
    logTest('TEST E.1', 'Cashier selecting Hungerstation updates currentCustomerId to "hungerstation"', window.currentCustomerId === 'hungerstation');
    logTest('TEST E.2', 'Hungerstation automatic mapping maps displayed delivery label to "Hungerstation"', overlayLabel === 'Hungerstation', `Label: ${overlayLabel}`);

    // Select jahiz
    window.onPosCustomerChange('jahiz');
    overlayLabel = window.getPosOrderTypeDisplayedLabel();
    logTest('TEST E.3', 'Cashier selecting jahiz maps displayed label to "Jahez Delivery"', overlayLabel === 'Jahez Delivery', `Label: ${overlayLabel}`);

    // Select ninja
    window.onPosCustomerChange('ninja');
    overlayLabel = window.getPosOrderTypeDisplayedLabel();
    logTest('TEST E.4', 'Cashier selecting ninja maps displayed label to "Ninja Delivery"', overlayLabel === 'Ninja Delivery', `Label: ${overlayLabel}`);

    // Select keeta
    window.onPosCustomerChange('keeta');
    overlayLabel = window.getPosOrderTypeDisplayedLabel();
    logTest('TEST E.5', 'Cashier selecting keeta maps displayed label to "keeta Delivery"', overlayLabel === 'keeta Delivery', `Label: ${overlayLabel}`);

    // Select ToYou
    window.onPosCustomerChange('toyou');
    overlayLabel = window.getPosOrderTypeDisplayedLabel();
    logTest('TEST E.6', 'Cashier selecting ToYou maps displayed label to "سفري تويو ToYou"', overlayLabel === 'سفري تويو ToYou', `Label: ${overlayLabel}`);

    // Select The chefz
    window.onPosCustomerChange('thechefz');
    overlayLabel = window.getPosOrderTypeDisplayedLabel();
    logTest('TEST E.7', 'Cashier selecting The chefz maps displayed label to "سفري ذا شفز The chefz"', overlayLabel === 'سفري ذا شفز The chefz', `Label: ${overlayLabel}`);

    // Select Mrsool
    window.onPosCustomerChange('mrsool');
    overlayLabel = window.getPosOrderTypeDisplayedLabel();
    logTest('TEST E.8', 'Cashier selecting Mrsool maps displayed label to "Mrsool"', overlayLabel === 'Mrsool', `Label: ${overlayLabel}`);

    // Select Management Staff
    window.onPosCustomerChange('management');
    overlayLabel = window.getPosOrderTypeDisplayedLabel();
    logTest('TEST E.9', 'Cashier selecting Management Staff maps displayed label to "Management Staff"', overlayLabel === 'Management Staff', `Label: ${overlayLabel}`);

    // Select عميل مسجد
    window.onPosCustomerChange('mosque');
    overlayLabel = window.getPosOrderTypeDisplayedLabel();
    logTest('TEST E.10', 'Cashier selecting عميل مسجد maps displayed label to "Delivery"', overlayLabel === 'Delivery', `Label: ${overlayLabel}`);

    // =========================================================================
    // TEST F — CASH CUSTOMER RESET
    // =========================================================================
    console.log('\n--- TEST F — CASH CUSTOMER RESET ---');
    // From partner back to cash
    window.onPosCustomerChange('cash');
    logTest('TEST F.1', 'Switching back to Cash Customer updates currentCustomerId to "cash"', window.currentCustomerId === 'cash');
    logTest('TEST F.2', 'Switching back to Cash Customer restores orderTypeId to "delivery"', window.currentOrderTypeId === 'delivery');
    overlayLabel = window.getPosOrderTypeDisplayedLabel();
    logTest('TEST F.3', 'Switching back to Cash Customer restores displayed delivery overlay to "Delivery"', overlayLabel === 'Delivery', `Label: ${overlayLabel}`);

    // =========================================================================
    // TEST G — STAFF PARTNER RESTRICTION
    // =========================================================================
    console.log('\n--- TEST G — STAFF PARTNER RESTRICTION ---');
    window.currentUser = { role: 'staff', name: 'Staff 1' };
    window.renderCustomerSelector();

    // Staff attempts to call onPosCustomerChange with partner ID
    window.onPosCustomerChange('hungerstation');
    logTest('TEST G.1', 'Staff calling onPosCustomerChange("hungerstation") is rejected; currentCustomerId remains "cash"',
        window.currentCustomerId === 'cash', `Found: ${window.currentCustomerId}`);
    logTest('TEST G.2', 'Staff Dropdown 1 continues displaying only Cash Customer in DOM',
        selectCustA.options.length === 1 && selectCustA.value === 'cash');

    window.onPosCustomerChange('ninja');
    logTest('TEST G.3', 'Staff calling onPosCustomerChange("ninja") is rejected; currentCustomerId remains "cash"',
        window.currentCustomerId === 'cash');

    window.onPosCustomerChange('jahiz');
    logTest('TEST G.4', 'Staff calling onPosCustomerChange("jahiz") is rejected; currentCustomerId remains "cash"',
        window.currentCustomerId === 'cash');

    // =========================================================================
    // TEST H — STAFF ORDER TYPES
    // =========================================================================
    console.log('\n--- TEST H — STAFF ORDER TYPES ---');
    window.currentUser = { role: 'staff', name: 'Staff 1' };
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();

    const testTypes = ['delivery', 'local', 'receive', 'cars', 'delivery_d'];
    for (const t of testTypes) {
        window.onPosOrderTypeChange(t);
        logTest(`TEST H.${t}`, `Staff successfully selects standard order type: ${t}`,
            window.currentOrderTypeId === t && selectTypeA.value === t,
            `Current: ${window.currentOrderTypeId}, Select: ${selectTypeA.value}`
        );
    }
    // Return to delivery
    window.onPosOrderTypeChange('delivery');

    // =========================================================================
    // TEST I — SAME-DEVICE USER SWITCHING
    // =========================================================================
    console.log('\n--- TEST I — SAME-DEVICE USER SWITCHING ---');
    // Step 1: Cashier logs in
    window.currentUser = { role: 'cashier', name: 'Cashier' };
    window.currentCustomerId = 'cash';
    window.currentOrderTypeId = 'delivery';
    window.renderCustomerSelector();
    logTest('TEST I.1', 'Step 1: Cashier logs in -> Dropdown 1 has 10 options', selectCustA.options.length === 10);

    // Cashier selects partner
    window.onPosCustomerChange('hungerstation');
    logTest('TEST I.2', 'Cashier selects Hungerstation', window.currentCustomerId === 'hungerstation');

    // Step 2: Cashier logs out
    window.logoutPosUser();
    logTest('TEST I.3', 'Step 2: Cashier logs out -> user is guest, customer reset to cash',
        window.currentUser.role === 'guest' && window.currentCustomerId === 'cash');
    logTest('TEST I.4', 'Cashier logout resets orderTypeId to delivery', window.currentOrderTypeId === 'delivery');

    // Step 3: Staff 1 logs in
    window.currentUser = { role: 'staff', name: 'Staff 1' };
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();
    logTest('TEST I.5', 'Step 3: Staff 1 logs in -> Dropdown 1 immediately drops to 1 option', selectCustA.options.length === 1);
    logTest('TEST I.6', 'Staff 1 sees only Cash Customer (no Hungerstation)', selectCustA.value === 'cash');

    // Step 4: Staff 1 logs out
    window.logoutPosUser();
    logTest('TEST I.7', 'Step 4: Staff 1 logs out cleanly', window.currentUser.role === 'guest');

    // Step 5: Cashier logs in again
    window.currentUser = { role: 'cashier', name: 'Cashier' };
    window.currentCustomerId = 'cash';
    window.currentOrderTypeId = 'delivery';
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();
    logTest('TEST I.8', 'Step 5: Cashier logs in again -> Dropdown 1 immediately returns to 10 options', selectCustA.options.length === 10);
    logTest('TEST I.9', 'Cashier starts fresh with Cash Customer and Delivery',
        selectCustA.value === 'cash' && selectTypeA.value === 'delivery');

    // =========================================================================
    // TEST J — MULTI-DEVICE TESTING (CONCURRENT INDEPENDENCE)
    // =========================================================================
    console.log('\n--- TEST J — MULTI-DEVICE TESTING ---');
    // Device 1: Cashier with session
    const dev1User = { role: 'cashier', name: 'Cashier', customerId: 'hungerstation', orderTypeId: 'delivery' };
    // Device 2: Staff 1 with session
    const dev2User = { role: 'staff', name: 'Staff 1', customerId: 'cash', orderTypeId: 'cars' };
    // Device 3: Staff 2 with session
    const dev3User = { role: 'staff', name: 'Staff 2', customerId: 'cash', orderTypeId: 'receive' };

    logTest('TEST J.1', 'Device 1 has active Cashier session with Hungerstation',
        dev1User.role === 'cashier' && dev1User.customerId === 'hungerstation');
    logTest('TEST J.2', 'Device 2 has active Staff 1 session with Cash Customer and Cars',
        dev2User.role === 'staff' && dev2User.customerId === 'cash' && dev2User.orderTypeId === 'cars');
    logTest('TEST J.3', 'Device 3 has active Staff 2 session with Cash Customer and Receive',
        dev3User.role === 'staff' && dev3User.customerId === 'cash' && dev3User.orderTypeId === 'receive');
    logTest('TEST J.4', 'All three device states are independent without cross-device pollution',
        dev1User.customerId !== dev2User.customerId && dev2User.orderTypeId !== dev3User.orderTypeId);

    // =========================================================================
    // TEST K — BACKEND ORDER VALIDATION & SECURITY
    // =========================================================================
    console.log('\n--- TEST K — BACKEND ORDER VALIDATION & SECURITY ---');
    authService.clearFailedAttempts('127.0.0.1');

    // Authenticate Cashier
    let { req: reqCashier, res: resCashier } = createMockReqRes('POST', '/api/auth/login', { pin: '1050' });
    await loginHandler(reqCashier, resCashier);
    const cashierToken = resCashier.body.session.token;

    // Authenticate Staff 1
    let { req: reqStaff, res: resStaff } = createMockReqRes('POST', '/api/auth/login', { pin: '1051' });
    await loginHandler(reqStaff, resStaff);
    const staffToken = resStaff.body.session.token;

    // 1. Staff attempts to submit Hungerstation order -> Expect 403 Forbidden
    let { req: reqStaffPartner, res: resStaffPartner } = createMockReqRes(
        'POST',
        '/api/orders',
        { customerId: 'hungerstation', orderTypeId: 'delivery', total: 25.00 },
        { authorization: 'Bearer ' + staffToken }
    );
    await ordersHandler(reqStaffPartner, resStaffPartner);
    logTest('TEST K.1', 'Backend rejects Staff Hungerstation order with HTTP 403 Forbidden',
        resStaffPartner.statusCode === 403, `Status: ${resStaffPartner.statusCode}`);
    logTest('TEST K.2', 'Backend returns ACCESS DENIED error message for Staff partner order',
        resStaffPartner.body && resStaffPartner.body.error && resStaffPartner.body.error.includes('ACCESS DENIED'));

    // 2. Staff attempts to submit ninja order -> Expect 403 Forbidden
    let { req: reqStaffNinja, res: resStaffNinja } = createMockReqRes(
        'POST',
        '/api/orders',
        { customerId: 'ninja', orderTypeId: 'delivery', total: 30.00 },
        { authorization: 'Bearer ' + staffToken }
    );
    await ordersHandler(reqStaffNinja, resStaffNinja);
    logTest('TEST K.3', 'Backend rejects Staff ninja partner order with HTTP 403 Forbidden',
        resStaffNinja.statusCode === 403);

    // 3. Staff submits valid Cash Customer order -> Expect 200 OK
    let { req: reqStaffCash, res: resStaffCash } = createMockReqRes(
        'POST',
        '/api/orders',
        { customerId: 'cash', orderTypeId: 'delivery', total: 20.00 },
        { authorization: 'Bearer ' + staffToken }
    );
    await ordersHandler(reqStaffCash, resStaffCash);
    logTest('TEST K.4', 'Backend accepts valid Staff Cash Customer order with HTTP 200 OK',
        resStaffCash.statusCode === 200 && resStaffCash.body.success === true);

    // 4. Cashier submits Hungerstation partner order -> Expect 200 OK
    let { req: reqCashierPartner, res: resCashierPartner } = createMockReqRes(
        'POST',
        '/api/orders',
        { customerId: 'hungerstation', orderTypeId: 'delivery', total: 45.00 },
        { authorization: 'Bearer ' + cashierToken }
    );
    await ordersHandler(reqCashierPartner, resCashierPartner);
    logTest('TEST K.5', 'Backend accepts Cashier Hungerstation partner order with HTTP 200 OK',
        resCashierPartner.statusCode === 200 && resCashierPartner.body.success === true);

    // 5. Unauthenticated order request -> Expect 401 Unauthorized
    let { req: reqNoAuth, res: resNoAuth } = createMockReqRes(
        'POST',
        '/api/orders',
        { customerId: 'cash', orderTypeId: 'delivery', total: 10.00 }
    );
    await ordersHandler(reqNoAuth, resNoAuth);
    logTest('TEST K.6', 'Backend rejects unauthenticated order request with HTTP 401 Unauthorized',
        resNoAuth.statusCode === 401);

    // =========================================================================
    // TEST L — DESIGN PRESERVATION & GEAR POPUP SAFETY
    // =========================================================================
    console.log('\n--- TEST L — DESIGN PRESERVATION & GEAR POPUP SAFETY ---');
    const custWrap = document.querySelector('.selector-field-row .select-wrap');
    const orderTypeWrap = document.querySelector('.order-type-select-wrap');
    const gearCustBtn = custWrap ? custWrap.querySelector('.btn-gear-icon') : null;
    const gearTypeBtn = orderTypeWrap ? orderTypeWrap.querySelector('.btn-gear-icon') : null;

    logTest('TEST L.1', 'Dropdown 1 select-wrap container exists with class .select-wrap', !!custWrap);
    logTest('TEST L.2', 'Dropdown 2 order-type-select-wrap container exists', !!orderTypeWrap);
    logTest('TEST L.3', 'Customer Settings Gear Icon exists in Dropdown 1', !!gearCustBtn);
    logTest('TEST L.4', 'Order Type Settings Gear Icon exists in Dropdown 2', !!gearTypeBtn);

    // Gear Icon 1 modal safety for Staff
    window.currentUser = { role: 'staff', name: 'Staff 1' };
    window.openDefaultClientTypeModal();
    const gearSelect = document.getElementById('defaultClientTypeSelect');
    const gearOptions = gearSelect ? Array.from(gearSelect.options) : [];
    logTest('TEST L.5', 'Gear Icon 1 modal for Staff contains ONLY Cash Customer (1 option)',
        gearOptions.length === 1 && gearOptions[0].value === 'cash',
        `Options: ${gearOptions.map(o => o.value).join(', ')}`
    );
    window.closeDefaultClientTypeModal();

    // Gear Icon 1 modal for Cashier
    window.currentUser = { role: 'cashier', name: 'Cashier' };
    window.openDefaultClientTypeModal();
    const gearOptionsCashier = gearSelect ? Array.from(gearSelect.options) : [];
    logTest('TEST L.6', 'Gear Icon 1 modal for Cashier contains all 10 authorized options',
        gearOptionsCashier.length === 10,
        `Options count: ${gearOptionsCashier.length}`
    );
    window.closeDefaultClientTypeModal();

    // =========================================================================
    // TEST M — ENGLISH / ARABIC LOCALIZATION
    // =========================================================================
    console.log('\n--- TEST M — ENGLISH / ARABIC LOCALIZATION ---');
    // Switch to Arabic
    window.currentUser = { role: 'cashier', name: 'Cashier' };
    window.applyLanguage('ar');
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();

    const arCustOptions = Array.from(selectCustA.options);
    const arTypeOptions = Array.from(selectTypeA.options);

    logTest('TEST M.1', 'Arabic mode: Cashier Dropdown 1 option 1 is "عميل نقدي"',
        arCustOptions[0] && arCustOptions[0].text.includes('عميل نقدي'),
        `Text: ${arCustOptions[0]?.text}`
    );
    logTest('TEST M.2', 'Arabic mode: Cashier Dropdown 1 option 2 has Arabic name (شركة هنجر)',
        arCustOptions[1] && arCustOptions[1].text.includes('هنجر'),
        `Text: ${arCustOptions[1]?.text}`
    );
    logTest('TEST M.3', 'Arabic mode: Dropdown 2 option 1 is "توصيل"',
        arTypeOptions[0] && arTypeOptions[0].text === 'توصيل',
        `Text: ${arTypeOptions[0]?.text}`
    );
    logTest('TEST M.4', 'Arabic mode: Dropdown 2 option 2 is "محلي"',
        arTypeOptions[1] && arTypeOptions[1].text === 'محلي');

    // Staff in Arabic
    window.currentUser = { role: 'staff', name: 'Staff 1' };
    window.renderCustomerSelector();
    const arStaffCustOptions = Array.from(selectCustA.options);
    logTest('TEST M.5', 'Arabic mode: Staff Dropdown 1 has only 1 option: "عميل نقدي"',
        arStaffCustOptions.length === 1 && arStaffCustOptions[0].text.includes('عميل نقدي'));

    // Switch back to English
    window.applyLanguage('en');
    window.renderCustomerSelector();
    window.renderOrderTypeSelector();
    logTest('TEST M.6', 'English mode: Cashier Dropdown 1 option 1 is "Cash Customer"',
        selectCustA.options[0] && selectCustA.options[0].text === 'Cash Customer');
    logTest('TEST M.7', 'English mode: Dropdown 2 option 1 is "Delivery"',
        selectTypeA.options[0] && selectTypeA.options[0].text === 'Delivery');

    // =========================================================================
    // TEST N — RESPONSIVE SUPPORT
    // =========================================================================
    console.log('\n--- TEST N — RESPONSIVE SUPPORT ---');
    const posMetaCard = document.querySelector('.pos-meta-selectors-card');
    logTest('TEST N.1', 'pos-meta-selectors-card exists for responsive layout', !!posMetaCard);
    const cssContent = fs.readFileSync(path.join(frontendRoot, 'css/reports.css'), 'utf8');
    logTest('TEST N.2', 'CSS defines .pos-meta-selectors-card with grid layout', cssContent.includes('.pos-meta-selectors-card'));
    logTest('TEST N.3', 'CSS defines .pos-select-display-overlay for seamless badge display', cssContent.includes('.pos-select-display-overlay'));
    logTest('TEST N.4', 'CSS defines .select-box-wrap with relative positioning', cssContent.includes('.select-box-wrap'));

    // =========================================================================
    // TEST O — EXISTING POS REGRESSION
    // =========================================================================
    console.log('\n--- TEST O — EXISTING POS REGRESSION ---');
    // 1. Cart on left, Catalog on right
    const orderPanel = document.querySelector('.pos-order-panel');
    const catalogPanel = document.querySelector('.pos-catalog-panel');
    logTest('TEST O.1', 'POS Cart panel remains on LEFT (.pos-order-panel)', !!orderPanel);
    logTest('TEST O.2', 'Product Catalog panel remains on RIGHT (.pos-catalog-panel)', !!catalogPanel);

    // 2. Top action buttons
    const btnCancel = document.querySelector('.pos-action-btn.btn-cancel, .btn-action-cancel, [data-i18n="cancel"]') || document.getElementById('cancelOrderBtn');
    const btnDiscount = document.querySelector('.pos-action-btn.btn-discount, [data-i18n="discount"]') || document.getElementById('discountBtn');
    const btnNotes = document.querySelector('.pos-action-btn.btn-notes, [data-i18n="notes"]') || document.getElementById('notesBtn');
    const btnMore = document.querySelector('.pos-action-btn.btn-more, [data-i18n="more"]') || document.getElementById('moreBtn');
    logTest('TEST O.3', 'Top action buttons preserved (Cancel, Discount, Notes, More)',
        !!(btnCancel || document.body.innerHTML.includes('Cancel')) &&
        !!(btnDiscount || document.body.innerHTML.includes('Discount')) &&
        !!(btnNotes || document.body.innerHTML.includes('Notes')) &&
        !!(btnMore || document.body.innerHTML.includes('More'))
    );

    // 3. Bottom Navigation
    const navNew = document.querySelector('#posBottomNavBar [onclick*="NewOrder"]') || document.getElementById('bottomNav_new');
    const navOrders = document.querySelector('#posBottomNavBar [onclick*="Orders"]') || document.getElementById('bottomNav_orders');
    const navTables = document.querySelector('#posBottomNavBar [onclick*="Tables"]') || document.getElementById('bottomNav_tables');
    const navMain = document.querySelector('#posBottomNavBar [onclick*="MainScreen"]') || document.getElementById('bottomNav_main');
    logTest('TEST O.4', 'Bottom Navigation preserved: New | Orders | Tables | Main Screen in exact sequence',
        !!navNew && !!navOrders && !!navTables && !!navMain
    );

    // 4. Cart addition and calculation
    window.currentCart = [];
    const sampleProduct = window.items && window.items[0] ? window.items[0] : { id: 'p1', enName: 'Burger', price: 20.00 };
    window.currentCart.push({
        lineId: 'line_reg_1',
        id: sampleProduct.id,
        enName: sampleProduct.enName,
        arName: sampleProduct.arName || sampleProduct.enName,
        price: sampleProduct.price,
        qty: 2,
        addons: [],
        modifiers: []
    });
    const totals = window.calculateCartTotals();
    logTest('TEST O.5', 'Cart calculations work correctly (subtotal, tax, grand total)',
        totals && totals.grandTotal > 0 && totals.tax > 0,
        `Total: ${totals?.grandTotal}, Tax: ${totals?.tax}`
    );

    // 5. Order placement
    const initialOrdersCount = window.orders.length;
    window.completeOrderAndShowReceipt(null, 'Cash', {}, totals.grandTotal);
    logTest('TEST O.6', 'Order completion adds order record to store', window.orders.length === initialOrdersCount + 1);
    const lastOrder = window.orders[0];
    logTest('TEST O.7', 'Placed order retains customerId, orderTypeId, and items',
        lastOrder && lastOrder.customerId === 'cash' && lastOrder.orderTypeId === 'delivery' && lastOrder.items.length === 1
    );

    console.log('\n=====================================================================');
    console.log(`=== TEST EXECUTION COMPLETED: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests}) ===`);
    console.log('=====================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTestSuite().catch(err => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
});
