/* =========================================================
   REPORTS.JS - All POS Reports, Balancing, Reconciliation,
   Internal Orders, Inventory Auditing & Stock Calculator
   ========================================================= */

// Active Report State
let activeReportModule = 'invoice_reports';
function reportLocalDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
let reportDateFrom = (() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return reportLocalDateValue(d);
})();
let reportDateTo = (() => {
    return reportLocalDateValue(new Date());
})();
let reportOrdersCache = null;
let reportOrdersRange = null;
let reportOrdersLoadingKey = null;
let reportSupplementalData = { paymentTransactions: [], shifts: [], damagedMovements: [], catalog: [], business: {} };
let reportCatalogLookup = new Map();
let invoiceReportPage = 1;
let invoiceReportResult = null;
let invoiceReportRequestKey = null;
let invoiceReportLoadingKey = null;
let reportsNavigationExpanded = true;

// Temporary Live Editing State for Balancing & Reconciliation
let balancingInputs = {};
let appReviewInputs = {};
let auditInputs = {};

// Production reports never seed synthetic orders.
function ensureSeedOrders() {}

// Filter orders by active date range
function getFilteredOrders() {
    ensureSeedOrders();
    const fromTime = new Date(reportDateFrom + "T00:00:00").getTime();
    const toTime = new Date(reportDateTo + "T23:59:59").getTime();

    return (reportOrdersCache || orders).filter(o => {
        if (!o.date) return true;
        const orderTime = new Date(o.date).getTime();
        return orderTime >= fromTime && orderTime <= toTime;
    });
}

async function loadReportOrdersFromServer() {
    const key = `${reportDateFrom}|${reportDateTo}`;
    if (reportOrdersRange === key && reportOrdersCache) return;
    const response = await fetch(`/api/reports?from=${encodeURIComponent(reportDateFrom)}&to=${encodeURIComponent(reportDateTo)}`, {
        credentials: 'same-origin', headers: { Accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !Array.isArray(data.orders)) {
        throw new Error(data.error || `Report request failed (${response.status})`);
    }
    if (`${reportDateFrom}|${reportDateTo}` !== key) return;
    reportSupplementalData = {
        paymentTransactions: Array.isArray(data.paymentTransactions) ? data.paymentTransactions : [],
        shifts: Array.isArray(data.shifts) ? data.shifts : [],
        damagedMovements: Array.isArray(data.damagedMovements) ? data.damagedMovements : [],
        catalog: Array.isArray(data.catalog) ? data.catalog : [],
        business: data.business || {}
    };
    reportCatalogLookup = new Map(reportSupplementalData.catalog.map(product => [product.product_id, product]));
    const transactionBreakdownByOrder = new Map();
    reportSupplementalData.paymentTransactions.forEach(transaction => {
        if (String(transaction.status || '').toLowerCase().includes('refund')) return;
        const orderId = transaction.order_id;
        if (!transactionBreakdownByOrder.has(orderId)) transactionBreakdownByOrder.set(orderId, {});
        const breakdown = transactionBreakdownByOrder.get(orderId);
        breakdown[transaction.method || 'Other'] = (Number(breakdown[transaction.method || 'Other']) || 0) + (Number(transaction.amount) || 0);
    });
    reportOrdersCache = data.orders.map(o => ({
        id: o.id, orderNumber: o.order_number || o.id, seq: o.seq, date: o.created_at, dateFormatted: o.created_at,
        type: o.order_type_id, orderTypeId: o.order_type_id, orderType: o.order_type_name || o.order_type_id,
        table: o.table, customer: o.customer_name || o.customer_id, customerId: o.customer_id,
        cashier: o.user_id, status: o.status, method: o.method, payMethod: o.method,
        shiftId: o.shift_id, paymentBreakdown: transactionBreakdownByOrder.get(o.id) || o.payment_breakdown || null,
        total: Number(o.grand_total), grandTotal: Number(o.grand_total), subtotal: Number(o.subtotal),
        tax: Number(o.tax), discount: Number(o.discount), paid: Number(o.paid), change: Number(o.change),
        companyId: o.company_id, branchId: o.branch_id,
        items: (o.items || []).map(i => {
            const product = reportCatalogLookup.get(i.item_id);
            return {
                id: i.item_id, enName: i.en_name, arName: i.ar_name,
                price: Number(i.price), qty: Number(i.qty),
                catId: product?.category_id || null,
                categoryNameEn: product?.category_name_en || null,
                categoryNameAr: product?.category_name_ar || null
            };
        })
    }));
    reportOrdersRange = key;
}

// Set Active Report Screen
function openReportModule(moduleId) {
    if (typeof canAccessReportModule === 'function' && !canAccessReportModule(moduleId)) {
        if (typeof showToast === 'function') {
            showToast(typeof currentLang !== 'undefined' && currentLang === 'ar' ? "غير مصرح: لا تملك صلاحية الوصول للتقارير" : "ACCESS DENIED: Insufficient permissions", "danger");
        }
        if (typeof switchView === 'function') switchView('pos');
        return;
    }
    activeReportModule = moduleId;
    switchView('reports_screen');
    renderActiveReport();
    closeSideDrawer();
}

function renderReportsNavigation() {
    const list = document.getElementById('reportsNavigationList');
    if (!list) return;
    const source = document.getElementById('drawerReportsSubmenu');
    if (!source) return;
    list.innerHTML = '';
    const group = document.createElement('button');
    group.type = 'button';
    group.className = 'reports-navigation-group';
    group.setAttribute('aria-expanded', String(reportsNavigationExpanded));
    group.innerHTML = `<i class="fa-solid fa-chart-line"></i><span>${escapeHtml(i18n?.[currentLang]?.drawer_rep_sales || (currentLang === 'ar' ? 'تقارير المبيعات' : 'Sales Reports'))}</span><i class="fa-solid ${reportsNavigationExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} reports-group-chevron"></i>`;
    list.appendChild(group);
    const appendReport = (item, isChild = false) => {
        const id = item.getAttribute('data-report-id');
        if (!canAccessReportModule(id)) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `reports-navigation-item${isChild ? ' reports-navigation-child' : ''}`;
        button.dataset.reportId = id;
        button.setAttribute('aria-current', id === activeReportModule ? 'page' : 'false');
        button.classList.toggle('active', id === activeReportModule);
        button.innerHTML = item.innerHTML;
        button.querySelectorAll('[data-i18n]').forEach(label => {
            const key = label.getAttribute('data-i18n');
            if (i18n?.[currentLang]?.[key]) label.textContent = i18n[currentLang][key];
        });
        button.hidden = isChild && !reportsNavigationExpanded;
        list.appendChild(button);
    };
    source.querySelectorAll('.drawer-sub-item[data-report-id]').forEach(item => appendReport(item, true));
    document.querySelectorAll('.drawer-menu-item[data-report-id]').forEach(item => {
        appendReport(item);
    });
    if (!list.dataset?.eventsBound && typeof list.addEventListener === 'function') {
        list.addEventListener('click', event => {
            if (event.target.closest('.reports-navigation-group')) {
                reportsNavigationExpanded = !reportsNavigationExpanded;
                renderReportsNavigation();
                return;
            }
            const item = event.target.closest('.reports-navigation-item[data-report-id]');
            if (item) openReportModule(item.dataset.reportId);
        });
        if (list.dataset) list.dataset.eventsBound = 'true';
    }
}

// Main Report Screen Renderer
function renderActiveReport() {
    const container = document.getElementById('reportModuleContent');
    if (!container) return;
    renderReportsNavigation();
    const reportsLabel = document.querySelector('.reports-navigation-heading [data-i18n="reports_nav"]');
    if (reportsLabel) reportsLabel.textContent = i18n?.[currentLang]?.reports_nav || (currentLang === 'ar' ? 'التقارير' : 'Reports');

    const requestedRange = `${reportDateFrom}|${reportDateTo}`;
    if (currentUser && currentUser.role !== 'guest' && reportOrdersRange !== requestedRange) {
        if (reportOrdersLoadingKey !== requestedRange) {
            reportOrdersLoadingKey = requestedRange;
            loadReportOrdersFromServer().then(() => {
                if (reportOrdersRange === requestedRange) renderActiveReport();
            }).catch(error => {
                if (`${reportDateFrom}|${reportDateTo}` === requestedRange) container.innerHTML = `<div class="access-denied-box" role="alert">${escapeHtml(error.message || 'Database reports are unavailable.')}</div>`;
            }).finally(() => {
                if (reportOrdersLoadingKey === requestedRange) reportOrdersLoadingKey = null;
            });
        }
        return;
    }

    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'staff') {
        container.innerHTML = `<div class="access-denied-box" style="padding: 60px 20px; text-align: center; color: #dc2626; font-size: 20px; font-weight: 800;">
            <i class="fa-solid fa-ban" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
            ACCESS DENIED: Management Reports are restricted
        </div>`;
        return;
    }

    // Highlight active link in side drawer (including sub-items like items_report)
    document.querySelectorAll('.drawer-menu-item, .drawer-sub-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-report-id') === activeReportModule);
    });

    const reportsContainer = document.getElementById('reportsView');
    if (reportsContainer) {
        if (activeReportModule === 'items_report') {
            reportsContainer.classList.add('items-report-mode');
            reportsContainer.classList.remove('invoice-report-mode');
            reportsContainer.classList.remove('daily-shifts-report-mode');
        } else if (activeReportModule === 'invoice_reports') {
            reportsContainer.classList.add('invoice-report-mode');
            reportsContainer.classList.remove('items-report-mode');
            reportsContainer.classList.remove('daily-shifts-report-mode');
        } else if (activeReportModule === 'daily_shifts') {
            reportsContainer.classList.add('daily-shifts-report-mode');
            reportsContainer.classList.remove('items-report-mode');
            reportsContainer.classList.remove('invoice-report-mode');
        } else {
            reportsContainer.classList.remove('items-report-mode');
            reportsContainer.classList.remove('invoice-report-mode');
            reportsContainer.classList.remove('daily-shifts-report-mode');
        }
    }

    switch (activeReportModule) {
        case 'invoice_reports':
            renderInvoiceReports(container);
            break;
        case 'items_report':
            renderItemsReport(container);
            break;
        case 'daily_shifts':
            renderDailyShiftsReport(container);
            break;
        case 'damaged_items':
            renderDamagedItemsReport(container);
            break;
        case 'application_reports':
            renderApplicationReports(container);
            break;
        case 'service_durations':
            renderServiceDurationsReport(container);
            break;
        case 'totals_report':
            renderTotalsReport(container);
            break;
        case 'active_meals':
            renderOrderFlowReport(container, 'active', false, currentLang === 'ar' ? '\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0648\u062c\u0628\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629' : 'Active Meals Reports');
            break;
        case 'active_invoices_report':
            renderOrderFlowReport(container, 'active', false);
            break;
        case 'active_items_report':
            renderOrderFlowReport(container, 'active', true);
            break;
        case 'outgoing_invoices_report':
            renderOrderFlowReport(container, 'outgoing', false);
            break;
        case 'outgoing_items_report':
            renderOrderFlowReport(container, 'outgoing', true);
            break;
        case 'outgoing_returns_report':
            renderUnavailableReport(container, 'Outgoing Returned Items', 'Return records are not stored in the current database schema.');
            break;
        case 'outgoing_damaged_report':
            renderDamagedItemsReport(container, true);
            break;
        case 'zakat_invoices_report':
            renderUnavailableReport(container, 'Zakat Invoices Report', 'No Zakat invoice fields or calculation rules exist in the current database schema.');
            break;
        case 'meals_reports':
            renderMealsReports(container);
            break;
        case 'payment_type_report':
            renderPaymentTypeReport(container);
            break;
        case 'balancing_payments':
            renderBalancingPayments(container);
            break;
        case 'applications_review':
            renderApplicationsReview(container);
            break;
        case 'internal_orders':
            renderInternalOrders(container);
            break;
        case 'inventory_auditing':
            renderInventoryAuditing(container);
            break;
        case 'daily_inventory':
            renderDailyInventory(container);
            break;
        case 'daily_stock_calculator':
            renderDailyStockCalculator(container);
            break;
        default:
            renderInvoiceReports(container);
    }
}

function backFromReports() {
    const destination = typeof previousPosView !== 'undefined' && previousPosView !== 'reports_screen' ? previousPosView : 'pos';
    switchView(destination);
}

// Common Date Range Component Header
function renderReportHeader(title, showDateFilter = true) {
    return `
        <div class="report-header-bar">
            <div class="report-title-group">
                <button type="button" class="btn btn-icon btn-secondary-pos" onclick="backFromReports()" title="${currentLang === 'ar' ? 'الرجوع لنقاط البيع' : 'Back to POS'}">
                    <i class="fa-solid ${currentLang === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'}"></i>
                </button>
                <h2 class="report-screen-title">${escapeHtml(title)}</h2>
            </div>
            <div class="report-header-actions">
                ${showDateFilter ? `
                    <div class="report-date-filter">
                        <div class="date-input-group">
                            <label><i class="fa-regular fa-calendar"></i> ${currentLang === 'ar' ? 'من:' : 'From:'}</label>
                            <input type="date" id="repDateFromInput" value="${reportDateFrom}" onchange="onReportDateChange()">
                        </div>
                        <div class="date-input-group">
                            <label><i class="fa-regular fa-calendar"></i> ${currentLang === 'ar' ? 'إلى:' : 'To:'}</label>
                            <input type="date" id="repDateToInput" value="${reportDateTo}" onchange="onReportDateChange()">
                        </div>
                        <button type="button" class="btn btn-sm btn-teal" onclick="onReportDateChange()">
                            <i class="fa-solid fa-filter"></i> ${currentLang === 'ar' ? 'تطبيق' : 'Apply'}
                        </button>
                    </div>
                ` : ''}
                <button type="button" class="btn btn-teal print-report-btn" onclick="printCurrentReport('${escapeHtml(title)}')">
                    <i class="fa-solid fa-print"></i> ${currentLang === 'ar' ? 'طباعة التقرير' : 'Print Report'}
                </button>
            </div>
        </div>
    `;
}

function onReportDateChange() {
    const fromInput = document.getElementById('repDateFromInput') || document.getElementById('invRepDateFrom');
    const toInput = document.getElementById('repDateToInput') || document.getElementById('invRepDateTo');
    const nextFrom = fromInput?.value || reportDateFrom;
    const nextTo = toInput?.value || reportDateTo;
    if (nextFrom > nextTo) {
        if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'يجب أن يكون تاريخ البداية قبل تاريخ النهاية' : 'From Date must be on or before To Date', 'warning');
        if (fromInput) fromInput.value = reportDateFrom;
        if (toInput) toInput.value = reportDateTo;
        return;
    }
    if (fromInput && fromInput.value) reportDateFrom = fromInput.value;
    if (toInput && toInput.value) reportDateTo = toInput.value;
    reportOrdersRange = null;
    renderActiveReport();
}

function onInvoiceReportDateChange() {
    const fromEl = document.getElementById('invRepDateFrom') || document.getElementById('repDateFromInput');
    const toEl = document.getElementById('invRepDateTo') || document.getElementById('repDateToInput');
    if (fromEl?.value && toEl?.value && fromEl.value > toEl.value) {
        if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'يجب أن يكون تاريخ البداية قبل تاريخ النهاية' : 'From Date must be on or before To Date', 'warning');
        fromEl.value = reportDateFrom;
        toEl.value = reportDateTo;
        return;
    }
    if (fromEl && fromEl.value) reportDateFrom = fromEl.value;
    if (toEl && toEl.value) reportDateTo = toEl.value;
    invoiceReportPage = 1;
    invoiceReportResult = null;
    reportOrdersRange = null;
    renderActiveReport();
}

async function fetchInvoiceReport(page = 1, perPage = 50, all = false) {
    const makeUrl = (p) => `/api/reports/invoices?${new URLSearchParams({ from: reportDateFrom, to: reportDateTo, page: String(p), per_page: String(perPage) })}`;
    const response = await fetch(makeUrl(page), { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !Array.isArray(data.invoices)) throw new Error(data.error || `Invoice report request failed (${response.status})`);
    if (!all) return data;
    const invoices = [...data.invoices];
    for (let nextPage = 2; nextPage <= data.pagination.lastPage; nextPage++) {
        const next = await fetch(makeUrl(nextPage), { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        const nextData = await next.json().catch(() => ({}));
        if (!next.ok || !nextData.success || !Array.isArray(nextData.invoices)) throw new Error(nextData.error || 'Could not load all invoices for printing.');
        invoices.push(...nextData.invoices);
    }
    return { ...data, invoices };
}

function setInvoiceReportPage(page) {
    invoiceReportPage = Math.max(1, Number(page) || 1);
    invoiceReportResult = null;
    renderActiveReport();
}

function printCurrentReport(title) {
    const printableArea = document.querySelector('.report-printable-area');
    if (!printableArea) {
        window.print();
        return;
    }
    const html = `
        <div style="padding: 15px;">
            <div style="text-align: center; margin-bottom: 15px;">
                <h2 style="margin: 0;">${storeSettings.nameAr || storeSettings.nameEn}</h2>
                <p style="margin: 4px 0; color: #666;">${storeSettings.companyName || ''} - الرقم الضريبي: ${storeSettings.vatNumber}</p>
                <h3 style="margin: 8px 0; border-bottom: 2px solid #333; padding-bottom: 5px;">${escapeHtml(title)}</h3>
                <p style="font-size: 12px; margin: 0;">الفترة: من ${reportDateFrom} إلى ${reportDateTo}</p>
            </div>
            ${printableArea.innerHTML}
        </div>
    `;
    routePrintJob('reports', html, title);
}

/**
 * 1. INVOICE REPORTS DATA COMPUTATION
 * Strictly authoritative financial reconciliation using existing saved invoice data:
 * - Net Total: Total sales minus returns
 * - Total Discount Value: Aggregated discounts granted on invoices
 * - Total Tax Value: Aggregated VAT (VAT-inclusive calculation)
 * - Total Future Returns: 0.00
 * - Total Returns: Aggregated invoice/item returns
 * - Total: Customer payable total sales
 */
function getInvoiceReportsData() {
    if (invoiceReportResult) {
        const summary = invoiceReportResult.summary;
        return {
            orders: invoiceReportResult.invoices.map(mapReportInvoice),
            invoicesCount: Number(summary.invoiceCount) || 0,
            summary: {
                netTotal: Number(summary.totalSales) - Number(summary.totalReturns || 0),
                totalDiscount: Number(summary.totalDiscount) || 0,
                totalTax: Number(summary.totalTax) || 0,
                totalFutureReturns: summary.totalFutureReturns,
                totalReturns: summary.totalReturns,
                total: Number(summary.totalSales) || 0
            }
        };
    }
    if (typeof ensureSeedOrders === 'function') {
        ensureSeedOrders();
    }
    const filtered = getFilteredOrders();
    const invoicesCount = filtered.length;
    let totalSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalReturns = 0;
    const totalFutureReturns = 0.00;

    filtered.forEach(o => {
        const orderTotal = Number(o.grandTotal !== undefined ? o.grandTotal : (o.total || 0)) || 0;
        totalSales += orderTotal;
        totalDiscount += Number(o.discount) || 0;

        totalReturns += Number(o.return_amount ?? o.returns) || 0;

        if (o.tax !== undefined && o.tax !== null) {
            totalTax += Number(o.tax) || 0;
        }
    });

    totalSales = Math.round(totalSales * 100) / 100;
    totalDiscount = Math.round(totalDiscount * 100) / 100;
    totalReturns = Math.round(totalReturns * 100) / 100;
    const netTotal = Math.round((totalSales - totalReturns) * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;

    return {
        orders: filtered,
        invoicesCount,
        summary: {
            netTotal,
            totalDiscount,
            totalTax,
            totalFutureReturns,
            totalReturns,
            total: totalSales
        }
    };
}

function mapReportInvoice(o) {
    return {
        id: o.id, orderNumber: o.order_number || o.client_order_id || o.id, seq: o.seq,
        date: o.created_at, orderType: o.order_type_name || o.order_type_id,
        payMethod: o.method, customer: o.customer_name || o.customer_id,
        cashier: o.user?.name || o.staff_id || o.user_id,
        total: Number(o.grand_total) || 0, grandTotal: Number(o.grand_total) || 0,
        tax: Number(o.tax) || 0, discount: Number(o.discount) || 0
    };
}

/**
 * 1. INVOICE REPORTS RENDERER (Foodie POS 3-Section Layout)
 * - SECTION A: Fixed Top (Header + From/To Date Filter + 6-Column, 2-Row Overall Sales Summary Table)
 * - SECTION B: Scrollable Middle (Existing Invoices Table and Individual Row Print Buttons)
 * - SECTION C: Fixed Bottom (Back at physical bottom-left, Complete Report Print at physical bottom-right)
 */
function renderInvoiceReports(container) {
    if (!container) return;

    const requestKey = `${reportDateFrom}|${reportDateTo}|${invoiceReportPage}`;
    if (!invoiceReportResult || invoiceReportRequestKey !== requestKey) {
        if (invoiceReportLoadingKey !== requestKey) {
            invoiceReportLoadingKey = requestKey;
            fetchInvoiceReport(invoiceReportPage).then(data => {
                if (`${reportDateFrom}|${reportDateTo}|${invoiceReportPage}` !== requestKey || activeReportModule !== 'invoice_reports') return;
                invoiceReportResult = data;
                invoiceReportRequestKey = requestKey;
                renderActiveReport();
            }).catch(error => {
                if (`${reportDateFrom}|${reportDateTo}|${invoiceReportPage}` === requestKey) container.innerHTML = `<div class="access-denied-box" role="alert">${escapeHtml(error.message || 'Invoice report is unavailable.')}</div>`;
            }).finally(() => {
                if (invoiceReportLoadingKey === requestKey) invoiceReportLoadingKey = null;
            });
        }
        container.innerHTML = `<div class="report-loading" role="status">${currentLang === 'ar' ? 'ÙŠØªÙ… ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØªÙ‚Ø±ÙŠØ±...' : 'Loading invoice report…'}</div>`;
        return;
    }

    const data = getInvoiceReportsData();
    const filtered = data.orders;
    const summary = data.summary;
    const invoicesCount = data.invoicesCount;

    container.innerHTML = `
        <section class="invoice-report-screen" id="invoiceReportScreen">
            <!-- SECTION A: FIXED TOP -->
            <header class="invoice-report-top">
                <div class="invoice-report-top-header">
                    <div class="invoice-report-title-wrap">
                        <span class="invoice-report-breadcrumb">
                            <span class="breadcrumb-root" onclick="backFromReports()">${currentLang === 'ar' ? 'التقارير' : 'Reports'}</span>
                            <span class="breadcrumb-separator">/</span>
                            <span class="breadcrumb-current">${currentLang === 'ar' ? 'تقارير الفواتير' : 'Invoice Reports'}</span>
                        </span>
                        <span class="invoice-count-badge" id="invoiceCountBadge">${currentLang === 'ar' ? `عدد الفواتير: ${invoicesCount}` : `Invoices: ${invoicesCount}`}</span>
                    </div>
                    <div class="invoice-report-date-filters">
                        <div class="invoice-date-group">
                            <label for="invRepDateFrom"><i class="fa-regular fa-calendar"></i> ${currentLang === 'ar' ? 'من:' : 'From:'}</label>
                            <input type="date" id="invRepDateFrom" value="${reportDateFrom}" onchange="onInvoiceReportDateChange()">
                        </div>
                        <div class="invoice-date-group">
                            <label for="invRepDateTo"><i class="fa-regular fa-calendar"></i> ${currentLang === 'ar' ? 'إلى:' : 'To:'}</label>
                            <input type="date" id="invRepDateTo" value="${reportDateTo}" onchange="onInvoiceReportDateChange()">
                        </div>
                        <button type="button" class="btn btn-sm btn-teal invoice-btn-apply" onclick="onInvoiceReportDateChange()">
                            <i class="fa-solid fa-filter"></i> <span>${currentLang === 'ar' ? 'تطبيق' : 'Apply'}</span>
                        </button>
                    </div>
                </div>

                <!-- Overall Sales Summary (Two-Row Foodie POS Table Layout with 6 columns) -->
                <div class="invoice-report-overall-summary invoice-overall-summary-wrap">
                    <table class="invoice-overall-summary-table">
                        <thead>
                            <tr>
                                <th>${currentLang === 'ar' ? 'صافي الإجمالي' : 'Net Total'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي قيمة الخصم' : 'Total Discount Value'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</th>
                                <th>${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${formatCurrency(summary.netTotal)}</td>
                                <td>${formatCurrency(summary.totalDiscount)}</td>
                                <td>${formatCurrency(summary.totalTax)}</td>
                                <td>${summary.totalFutureReturns == null ? (currentLang === 'ar' ? '?????? ????????' : 'Unavailable') : formatCurrency(summary.totalFutureReturns)}</td>
                                <td>${summary.totalReturns == null ? (currentLang === 'ar' ? '?????? ????????' : 'Unavailable') : formatCurrency(summary.totalReturns)}</td>
                                <td>${formatCurrency(summary.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </header>

            <!-- SECTION B: SCROLLABLE MIDDLE -->
            <main class="invoice-report-middle" id="invoiceReportScrollArea">
                <div class="report-printable-area invoice-report-printable">
                    <div class="report-table-card invoice-table-card">
                        <div class="table-responsive">
                            <table class="report-table invoice-list-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>${currentLang === 'ar' ? 'رقم الفاتورة' : 'Invoice ID'}</th>
                                        <th>${currentLang === 'ar' ? 'نوع الطلب' : 'Order Type'}</th>
                                        <th>${currentLang === 'ar' ? 'طريقة الدفع' : 'Payment Type'}</th>
                                        <th>${currentLang === 'ar' ? 'العميل / المصدر' : 'Customer / Source'}</th>
                                        <th>${currentLang === 'ar' ? 'الكاشير' : 'Cashier'}</th>
                                        <th>${currentLang === 'ar' ? 'التاريخ والوقت' : 'Date / Time'}</th>
                                        <th class="text-end">${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                                        <th class="text-center col-action-print no-print">${currentLang === 'ar' ? 'الإجراء' : 'Action'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${filtered.length === 0 ? `
                                        <tr><td colspan="9" class="text-center py-4 text-muted">${currentLang === 'ar' ? 'لا توجد فواتير في هذه الفترة' : 'No invoices found'}</td></tr>
                                    ` : filtered.map((o, idx) => `
                                        <tr>
                                            <td>${((invoiceReportResult.pagination.currentPage - 1) * invoiceReportResult.pagination.perPage) + idx + 1}</td>
                                            <td><strong>#${escapeHtml(o.orderNumber || o.seq || o.id)}</strong></td>
                                            <td><span class="badge-subtle">${escapeHtml(o.orderType || 'محلي')}</span></td>
                                            <td><span class="badge-subtle">${escapeHtml(o.payMethod || o.method || 'Cash')}</span></td>
                                            <td>${escapeHtml(o.customer || 'عميل نقدي')}</td>
                                            <td>${escapeHtml(o.cashier || 'الكاشير')}</td>
                                            <td>${o.date ? new Date(o.date).toLocaleString(currentLang === 'ar' ? 'ar-SA' : 'en-US') : '-'}</td>
                                            <td class="text-end fw-bold">${formatCurrency(o.grandTotal || o.total || 0)}</td>
                                            <td class="text-center col-action-print no-print">
                                                <button type="button" 
                                                        class="btn btn-sm btn-teal btn-row-invoice-print" 
                                                        onclick="reprintSavedInvoice('${escapeHtml(o.id)}', event)"
                                                        data-invoice-id="${escapeHtml(o.id)}"
                                                        title="${currentLang === 'ar' ? 'طباعة' : 'Print'}">
                                                    <i class="fa-solid fa-print"></i> <span>${currentLang === 'ar' ? 'طباعة' : 'Print'}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

                <div class="report-pagination no-print" aria-label="Invoice pages">
                    <button type="button" class="btn btn-sm btn-secondary-pos" ${invoiceReportResult.pagination.currentPage <= 1 ? 'disabled' : ''} onclick="setInvoiceReportPage(${invoiceReportResult.pagination.currentPage - 1})">Previous</button>
                    <span>${invoiceReportResult.pagination.currentPage} / ${invoiceReportResult.pagination.lastPage} ? ${invoicesCount} invoices</span>
                    <button type="button" class="btn btn-sm btn-secondary-pos" ${invoiceReportResult.pagination.currentPage >= invoiceReportResult.pagination.lastPage ? 'disabled' : ''} onclick="setInvoiceReportPage(${invoiceReportResult.pagination.currentPage + 1})">Next</button>
                </div>
            <!-- SECTION C: FIXED BOTTOM -->
            <footer class="invoice-report-bottom">
                <button type="button" class="btn invoice-report-btn-back" onclick="backFromReports()" title="${currentLang === 'ar' ? 'الرجوع لنقاط البيع' : 'Back to POS'}">
                    <i class="fa-solid ${currentLang === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'}"></i>
                    <span>${currentLang === 'ar' ? 'رجوع' : 'Back'}</span>
                </button>
                <button type="button" class="btn btn-teal invoice-report-btn-print" onclick="printInvoiceReport()" title="${currentLang === 'ar' ? 'طباعة التقرير الكامل' : 'Print Complete Report'}">
                    <i class="fa-solid fa-print"></i>
                    <span>${currentLang === 'ar' ? 'طباعة' : 'Print'}</span>
                </button>
            </footer>
        </section>
    `;
}

/**
 * Complete Invoice Report Printing Implementation
 * Strictly Read-Only: Never modifies orders, checkout sequence, cart, payments, or stock.
 * Prints the complete report with overall summary and all matching invoices for the selected date range.
 */
function printInvoiceReport() {
    fetchInvoiceReport(1, 100, true).then(result => printLoadedInvoiceReport(result)).catch(error => {
        if (typeof showToast === 'function') showToast(error.message || 'Could not load invoice report for printing.', 'danger');
    });
}

function printLoadedInvoiceReport(result) {
    const prior = invoiceReportResult;
    invoiceReportResult = result;
    const data = getInvoiceReportsData();
    const title = currentLang === 'ar' ? 'تقارير الفواتير' : 'Invoice Reports';
    const storeName = (typeof storeSettings !== 'undefined' && (currentLang === 'ar' ? (storeSettings.nameAr || storeSettings.nameEn) : (storeSettings.nameEn || storeSettings.nameAr))) || 'NUR FOODES';
    const companyName = (typeof storeSettings !== 'undefined' && (storeSettings.companyNameAr || storeSettings.companyName)) || '';
    const vatNo = (typeof storeSettings !== 'undefined' && storeSettings.vatNumber) || '';

    const summary = data.summary;
    const orders = data.orders;

    const html = `
        <div style="padding: 15px; font-family: sans-serif; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #334155; padding-bottom: 10px;">
                <h2 style="margin: 0 0 4px; font-size: 20px;">${escapeHtml(storeName)}</h2>
                ${companyName ? `<p style="margin: 2px 0; color: #475569; font-size: 13px;">${escapeHtml(companyName)}</p>` : ''}
                ${vatNo ? `<p style="margin: 2px 0; color: #475569; font-size: 12px;">${currentLang === 'ar' ? 'الرقم الضريبي:' : 'VAT No:'} ${escapeHtml(vatNo)}</p>` : ''}
                <h3 style="margin: 8px 0 4px; font-size: 16px; color: #0f172a;">${escapeHtml(title)}</h3>
                <p style="font-size: 12px; margin: 0; color: #64748b;">${currentLang === 'ar' ? `الفترة: من ${reportDateFrom} إلى ${reportDateTo}` : `Period: From ${reportDateFrom} To ${reportDateTo}`}</p>
            </div>

            <!-- Two-Row Overall Sales Summary Table in Print (Foodie POS Design) -->
            <div style="margin-bottom: 20px; direction: ltr !important;">
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px;">
                    <thead>
                        <tr style="background: #42556b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${currentLang === 'ar' ? 'صافي الإجمالي' : 'Net Total'}</th>
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${currentLang === 'ar' ? 'إجمالي قيمة الخصم' : 'Total Discount Value'}</th>
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${currentLang === 'ar' ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</th>
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${currentLang === 'ar' ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</th>
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${currentLang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</th>
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background: #ffffff !important;">
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(summary.netTotal)}</td>
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(summary.totalDiscount)}</td>
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(summary.totalTax)}</td>
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(summary.totalFutureReturns)}</td>
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(summary.totalReturns)}</td>
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(summary.total)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Invoices Table in Print -->
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                    <tr style="background: #334155 !important; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                        <th style="padding: 6px 8px; text-align: start; border: 1px solid #475569;">#</th>
                        <th style="padding: 6px 8px; text-align: start; border: 1px solid #475569;">${currentLang === 'ar' ? 'رقم الفاتورة' : 'Invoice ID'}</th>
                        <th style="padding: 6px 8px; text-align: start; border: 1px solid #475569;">${currentLang === 'ar' ? 'نوع الطلب' : 'Order Type'}</th>
                        <th style="padding: 6px 8px; text-align: start; border: 1px solid #475569;">${currentLang === 'ar' ? 'طريقة الدفع' : 'Payment Type'}</th>
                        <th style="padding: 6px 8px; text-align: start; border: 1px solid #475569;">${currentLang === 'ar' ? 'العميل' : 'Customer'}</th>
                        <th style="padding: 6px 8px; text-align: start; border: 1px solid #475569;">${currentLang === 'ar' ? 'الكاشير' : 'Cashier'}</th>
                        <th style="padding: 6px 8px; text-align: start; border: 1px solid #475569;">${currentLang === 'ar' ? 'التاريخ والوقت' : 'Date / Time'}</th>
                        <th style="padding: 6px 8px; text-align: end; border: 1px solid #475569;">${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map((o, idx) => `
                        <tr style="page-break-inside: avoid; break-inside: avoid;">
                            <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${idx + 1}</td>
                            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 600;">#${escapeHtml(o.orderNumber || o.seq || o.id)}</td>
                            <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${escapeHtml(o.orderType || 'محلي')}</td>
                            <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${escapeHtml(o.payMethod || o.method || 'Cash')}</td>
                            <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${escapeHtml(o.customer || 'عميل نقدي')}</td>
                            <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${escapeHtml(o.cashier || 'الكاشير')}</td>
                            <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${o.date ? new Date(o.date).toLocaleString(currentLang === 'ar' ? 'ar-SA' : 'en-US') : '-'}</td>
                            <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: end; font-weight: 600;">${formatCurrency(o.grandTotal || o.total || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    routePrintJob('reports', html, title);
    invoiceReportResult = prior;
}

// Debounce lock for historical invoice reprinting
let isInvoiceReprinting = false;

/**
 * Historical Invoice Receipt Reprinting
 * Resolves the exact saved order by its persistent identifier, validates permissions,
 * scope, and data integrity, renders ONLY that invoice's customer receipt,
 * and routes it through the configured customer receipt printer.
 *
 * STRICTLY READ-ONLY: Never alters orders, checkout sequence, cart, payments, or stock.
 */
async function reprintSavedInvoice(invoiceId, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }

    // 1. Prevent duplicate submissions from rapid tapping
    if (isInvoiceReprinting) {
        console.warn('[Reprint] Print job already in progress, please wait...');
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'جاري تجهيز أمر الطباعة، يرجى الانتظار...' : 'Print job is already processing, please wait...', 'warning');
        }
        return;
    }

    // 2. Validate input ID
    if (!invoiceId) {
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'خطأ: لم يتم تحديد رقم الفاتورة' : 'Error: No invoice ID provided', 'danger');
        }
        return;
    }

    isInvoiceReprinting = true;

    try {
        // 3. Resolve exact saved invoice from authoritative orders collection
        if (typeof ensureSeedOrders === 'function' && (!orders || orders.length === 0)) {
            ensureSeedOrders();
        }
        const allOrders = (typeof orders !== 'undefined' && Array.isArray(orders)) ? orders : [];
        const targetOrder = allOrders.find(o => String(o.id) === String(invoiceId) || (o.seq && String(o.seq) === String(invoiceId)));

        if (!targetOrder) {
            if (typeof showToast === 'function') {
                showToast(currentLang === 'ar' ? `تعذر العثور على الفاتورة (${escapeHtml(String(invoiceId))})` : `Invoice record (${escapeHtml(String(invoiceId))}) not found`, 'danger');
            }
            return;
        }

        // 4. Validate existing permissions and company/branch scope
        if (typeof currentUser !== 'undefined' && currentUser) {
            if (currentUser.role && !['admin', 'manager', 'cashier', 'staff'].includes(currentUser.role)) {
                if (typeof showToast === 'function') {
                    showToast(currentLang === 'ar' ? 'غير مصرح لك بإعادة طباعة الفواتير' : 'Unauthorized: Permission denied for reprinting invoices', 'danger');
                }
                return;
            }
            if (Array.isArray(currentUser.permissions) && !currentUser.permissions.includes('print_invoices') && !currentUser.permissions.includes('all')) {
                if (typeof showToast === 'function') {
                    showToast(currentLang === 'ar' ? 'غير مصرح لك بإعادة طباعة الفواتير' : 'Unauthorized: Insufficient permissions to reprint invoice', 'danger');
                }
                return;
            }
            if (currentUser.branchId && targetOrder.branchId && currentUser.branchId !== targetOrder.branchId && currentUser.role !== 'admin') {
                if (typeof showToast === 'function') {
                    showToast(currentLang === 'ar' ? 'لا يمكن طباعة فاتورة تابعة لفرع آخر' : 'Unauthorized: Invoice belongs to a different branch', 'danger');
                }
                return;
            }
            if (currentUser.companyId && targetOrder.companyId && currentUser.companyId !== targetOrder.companyId && currentUser.role !== 'admin') {
                if (typeof showToast === 'function') {
                    showToast(currentLang === 'ar' ? 'لا يمكن طباعة فاتورة تابعة لشركة أخرى' : 'Unauthorized: Invoice belongs to a different company', 'danger');
                }
                return;
            }
        }

        // 5. Validate historical invoice completeness and integrity
        if (!targetOrder.items || !Array.isArray(targetOrder.items) || targetOrder.items.length === 0) {
            if (typeof showToast === 'function') {
                showToast(currentLang === 'ar' ? 'بيانات الفاتورة غير مكتملة: لا توجد عناصر محفوظة' : 'Incomplete invoice data: No items found in saved record', 'danger');
            }
            return;
        }
        const orderTotal = Number(targetOrder.grandTotal !== undefined ? targetOrder.grandTotal : (targetOrder.total !== undefined ? targetOrder.total : NaN));
        if (isNaN(orderTotal)) {
            if (typeof showToast === 'function') {
                showToast(currentLang === 'ar' ? 'خطأ في بيانات الفاتورة: إجمالي المبلغ غير صالح' : 'Invalid invoice data: Grand total is missing or invalid', 'danger');
            }
            return;
        }

        // 6. Demo / Sample data notice
        if (targetOrder.isDemo || targetOrder.isSample) {
            console.info('[Reprint] Historical invoice is flagged as sample/demo data:', targetOrder.id);
        }

        // 7. Render Customer Receipt while strictly preserving lastCompletedOrder
        const previousLastCompleted = (typeof lastCompletedOrder !== 'undefined') ? lastCompletedOrder : null;

        if (typeof renderReceipt !== 'function') {
            if (typeof showToast === 'function') {
                showToast(currentLang === 'ar' ? 'خدمة تجهيز الإيصالات غير متاحة' : 'Receipt rendering function unavailable', 'danger');
            }
            return;
        }

        renderReceipt(targetOrder);

        // Guarantee lastCompletedOrder is never mutated by reprint
        if (typeof lastCompletedOrder !== 'undefined') {
            lastCompletedOrder = previousLastCompleted;
        }

        // 8. Locate thermal receipt template node
        const thermalNode = document.getElementById('thermalReceiptNode');
        if (!thermalNode) {
            if (typeof showToast === 'function') {
                showToast(currentLang === 'ar' ? 'تعذر العثور على قالب الإيصال الحراري' : 'Thermal receipt template node not found', 'danger');
            }
            return;
        }

        // 9. Dispatch receipt to configured Customer Receipt printing path
        const invoiceLabel = `Invoice #${targetOrder.seq || (targetOrder.id ? String(targetOrder.id).replace(/^#/, '') : 'ORD')}`;
        if (typeof routePrintJob === 'function') {
            await routePrintJob('cashier', thermalNode.outerHTML, invoiceLabel);
        } else if (typeof printReceiptDirect === 'function') {
            printReceiptDirect();
        } else if (typeof window !== 'undefined' && typeof window.print === 'function') {
            window.print();
        } else {
            if (typeof showToast === 'function') {
                showToast(currentLang === 'ar' ? 'خدمة الطباعة غير متوفرة' : 'Printing service unavailable', 'warning');
            }
        }
    } catch (err) {
        console.error('[Reprint] Exception during invoice reprinting:', err);
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'حدث خطأ أثناء محاولة طباعة الفاتورة' : 'Error occurred while reprinting invoice', 'danger');
        }
    } finally {
        isInvoiceReprinting = false;
    }
}

if (typeof window !== 'undefined') {
    window.reprintSavedInvoice = reprintSavedInvoice;
}
if (typeof global !== 'undefined') {
    global.reprintSavedInvoice = reprintSavedInvoice;
}

// 2. ITEMS REPORT (FOODIE POS THREE-SECTION ENHANCEMENT)

/**
 * Validates and updates report date range from Items Report header inputs
 */
function onItemsReportDateChange() {
    const fromInput = document.getElementById('itemsRepDateFrom');
    const toInput = document.getElementById('itemsRepDateTo');
    const newFrom = fromInput?.value || reportDateFrom;
    const newTo = toInput?.value || reportDateTo;

    if (newFrom && newTo && newFrom > newTo) {
        if (typeof showToast === 'function') {
            showToast(
                currentLang === 'ar' 
                    ? 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية' 
                    : 'From Date cannot be later than To Date',
                'warning'
            );
        }
        if (fromInput) fromInput.value = reportDateFrom;
        if (toInput) toInput.value = reportDateTo;
        return;
    }

    if (newFrom) reportDateFrom = newFrom;
    if (newTo) reportDateTo = newTo;

    const syncFrom = document.getElementById('repDateFromInput');
    const syncTo = document.getElementById('repDateToInput');
    if (syncFrom) syncFrom.value = reportDateFrom;
    if (syncTo) syncTo.value = reportDateTo;

    renderActiveReport();
}

/**
 * Authoritative Historical Items Report Data Aggregation
 * Aggregates sales at 3 synchronized reporting levels:
 * Level 1: Overall Sales Summary (5 fields: Total, Returns, Future Returns, Tax, Net Total)
 * Level 2: Category Sales Summary (5 fields: Total, Returns, Future Returns, Tax, Net Total)
 * Level 3: Item-wise Sales Breakdown (Item Name, Quantity, Returned Quantity)
 */
function getItemsReportData() {
    if (typeof ensureSeedOrders === 'function') {
        ensureSeedOrders();
    }

    // Date range boundaries in local business timezone:
    // Timestamp >= Start of From Date (00:00:00.000)
    // Timestamp < Start of day after To Date (00:00:00.000 of next day)
    let filteredOrders = getFilteredOrders();

    // Exclude unpaid, void, draft orders
    filteredOrders = filteredOrders.filter(o => {
        if (o.status === 'void' || o.status === 'draft' || o.status === 'unpaid') return false;
        return true;
    });

    // Collect all catalog categories
    const savedCategories = (typeof categories !== 'undefined' && Array.isArray(categories))
        ? categories
        : ((typeof DEFAULT_CATEGORIES !== 'undefined' && Array.isArray(DEFAULT_CATEGORIES)) ? DEFAULT_CATEGORIES : []);
    const catalogCategories = [...new Map((reportSupplementalData.catalog || [])
        .filter(product => product.category_id)
        .map(product => [product.category_id, { id: product.category_id, nameEn: product.category_name_en || product.category_id, nameAr: product.category_name_ar || product.category_id }])).values()];
    const allCategories = [...new Map([...savedCategories, ...catalogCategories].map(category => [category.id, category])).values()];

    const catMap = {};

    function getCategoryEntry(catId) {
        if (!catMap[catId]) {
            const found = allCategories.find(c => c.id === catId);
            catMap[catId] = {
                id: catId,
                nameAr: found ? found.nameAr : (catId === 'unclassified' ? 'أصناف غير مصنفة' : catId),
                nameEn: found ? found.nameEn : (catId === 'unclassified' ? 'Unclassified Items' : catId),
                icon: found ? (found.icon || 'fa-tag') : 'fa-tag',
                itemsMap: {},
                total: 0,
                returns: 0,
                futureReturns: 0.00,
                tax: 0,
                netTotal: 0
            };
        }
        return catMap[catId];
    }

    // Process orders
    filteredOrders.forEach(order => {
        const orderReturnedMap = {};

        // 1. Process explicit return items from order cancellations
        if (Array.isArray(order.cancelledItems) && order.cancelledItems.length > 0) {
            order.cancelledItems.forEach(ci => {
                const k = ci.id || ci.name;
                if (!orderReturnedMap[k]) orderReturnedMap[k] = { qty: 0, amount: 0 };
                const retQty = Number(ci.cancelledQty !== undefined ? ci.cancelledQty : (ci.returnQty || 0));
                const retPrice = Number(ci.unitPrice !== undefined ? ci.unitPrice : (ci.price || 0));
                const retLineTotal = Number(ci.lineTotal !== undefined ? ci.lineTotal : (retQty * retPrice));
                orderReturnedMap[k].qty += retQty;
                orderReturnedMap[k].amount += retLineTotal;
            });
        } else if (Array.isArray(order.returnedItems) && order.returnedItems.length > 0) {
            order.returnedItems.forEach(ri => {
                const k = ri.id || ri.name;
                if (!orderReturnedMap[k]) orderReturnedMap[k] = { qty: 0, amount: 0 };
                const retQty = Number(ri.qty || ri.returnQty || 0);
                const retPrice = Number(ri.price || ri.unitPrice || 0);
                orderReturnedMap[k].qty += retQty;
                orderReturnedMap[k].amount += (ri.lineTotal !== undefined ? ri.lineTotal : (retQty * retPrice));
            });
        }

        // 2. Process order items
        if (Array.isArray(order.items)) {
            order.items.forEach(it => {
                const itemId = it.id || it.name;
                const qty = Number(it.qty) || 1;
                const price = Number(it.price) || 0;
                let lineTotal = qty * price;
                if (Array.isArray(it.addons)) {
                    const addSum = it.addons.reduce((s, a) => s + (Number(a.price) || 0), 0);
                    lineTotal += (addSum * qty);
                }

                const catId = it.catId || it.category || 'unclassified';

                const catEntry = getCategoryEntry(catId);

                if (!catEntry.itemsMap[itemId]) {
                    catEntry.itemsMap[itemId] = {
                        id: itemId,
                        nameAr: it.arName || it.name,
                        nameEn: it.enName || it.name,
                        price: price,
                        qty: 0,
                        returnsQty: 0,
                        totalVal: 0,
                        returnsVal: 0
                    };
                }

                catEntry.itemsMap[itemId].qty += qty;
                catEntry.itemsMap[itemId].totalVal += lineTotal;
                catEntry.total += lineTotal;
                const orderItemsGross = (order.items || []).reduce((sum, line) => sum + (Number(line.price) || 0) * (Number(line.qty) || 0), 0);
                if (orderItemsGross > 0) catEntry.tax += (Number(order.tax) || 0) * lineTotal / orderItemsGross;

                // Handle item-level return field if present
                if (it.returnedQty && !orderReturnedMap[itemId]) {
                    const rQty = Number(it.returnedQty) || 0;
                    catEntry.itemsMap[itemId].returnsQty += rQty;
                    const rVal = rQty * price;
                    catEntry.itemsMap[itemId].returnsVal += rVal;
                    catEntry.returns += rVal;
                }
            });
        }

        // 3. Attribute order-level return records to matching category items
        for (const [k, retInfo] of Object.entries(orderReturnedMap)) {
            let foundInCat = false;
            for (const cId in catMap) {
                if (catMap[cId].itemsMap[k]) {
                    catMap[cId].itemsMap[k].returnsQty += retInfo.qty;
                    catMap[cId].itemsMap[k].returnsVal += retInfo.amount;
                    catMap[cId].returns += retInfo.amount;
                    foundInCat = true;
                    break;
                }
            }
            if (!foundInCat) {
                const catEntry = getCategoryEntry('unclassified');
                if (!catEntry.itemsMap[k]) {
                    catEntry.itemsMap[k] = {
                        id: k,
                        nameAr: k,
                        nameEn: k,
                        price: 0,
                        qty: 0,
                        returnsQty: 0,
                        totalVal: 0,
                        returnsVal: 0
                    };
                }
                catEntry.itemsMap[k].returnsQty += retInfo.qty;
                catEntry.itemsMap[k].returnsVal += retInfo.amount;
                catEntry.returns += retInfo.amount;
            }
        }
    });

    let overallTotal = 0;
    let overallReturns = 0;
    let overallFutureReturns = 0.00;
    let overallNetTotal = 0;
    let overallTax = 0;

    const categoriesList = [];

    const catKeys = Object.keys(catMap);
    catKeys.sort((a, b) => {
        const idxA = allCategories.findIndex(c => c.id === a);
        const idxB = allCategories.findIndex(c => c.id === b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    catKeys.forEach(cId => {
        const cat = catMap[cId];
        const itemsArr = Object.values(cat.itemsMap);
        if (itemsArr.length === 0 && cat.total === 0 && cat.returns === 0) return;

        itemsArr.sort((a, b) => b.qty - a.qty);

        cat.total = Math.round(cat.total * 100) / 100;
        cat.returns = Math.round(cat.returns * 100) / 100;
        cat.futureReturns = 0.00;
        cat.netTotal = Math.round((cat.total - cat.returns) * 100) / 100;
        cat.tax = Math.round((Number(cat.tax) || 0) * 100) / 100;

        cat.name = currentLang === 'ar' ? cat.nameAr : cat.nameEn;
        cat.items = itemsArr.map(it => ({
            id: it.id,
            name: currentLang === 'ar' ? it.nameAr : it.nameEn,
            qty: it.qty,
            returnsQty: it.returnsQty
        }));

        overallTotal += cat.total;
        overallReturns += cat.returns;
        overallNetTotal += cat.netTotal;
        overallTax += cat.tax;

        categoriesList.push(cat);
    });

    overallTotal = Math.round(overallTotal * 100) / 100;
    overallReturns = Math.round(overallReturns * 100) / 100;
    overallFutureReturns = 0.00;
    overallNetTotal = Math.round((overallTotal - overallReturns) * 100) / 100;
    overallTax = Math.round(overallTax * 100) / 100;

    return {
        overall: {
            total: overallTotal,
            returns: overallReturns,
            futureReturns: overallFutureReturns,
            tax: overallTax,
            netTotal: overallNetTotal
        },
        categories: categoriesList
    };
}

/**
 * 2. ITEMS REPORT RENDERER
 * Renders the Foodie POS 3-Section Layout:
 * - SECTION A: Fixed Top (Header + From/To Date Filter + Overall Sales Summary with 5 fields)
 * - SECTION B: Scrollable Middle (Continuous scroll containing each Category Summary + Product Table)
 * - SECTION C: Fixed Bottom (Back on physical bottom-left, Print on physical bottom-right)
 */
function renderItemsReport(container) {
    if (!container) return;

    const data = getItemsReportData();
    const overall = data.overall;
    const categories = data.categories;

    let categoriesHtml = '';
    if (categories.length === 0) {
        categoriesHtml = `
            <div class="items-report-empty">
                <i class="fa-solid fa-box-open"></i>
                <p>${currentLang === 'ar' ? 'لا توجد أصناف مباعة في الفترة المحددة' : 'No items sold in selected period'}</p>
                <span class="items-empty-sub">${currentLang === 'ar' ? 'يرجى تغيير نطاق التاريخ لعرض المبيعات' : 'Please select a different date range to view sales'}</span>
            </div>
        `;
    } else {
        categoriesHtml = categories.map(cat => `
            <section class="items-category-section" data-cat-id="${escapeHtml(cat.id)}">
                <!-- Category Heading (Muted Purple) -->
                <div class="items-category-header">
                    <div class="items-category-title">
                        <i class="fa-solid ${cat.icon || 'fa-tag'}"></i>
                        <h3>${escapeHtml(cat.name)}</h3>
                    </div>
                </div>

                <!-- Category Sales Summary (Two-Row Foodie POS Table Layout) -->
                <div class="items-category-summary items-category-summary-wrap">
                    <table class="items-category-summary-table">
                        <thead>
                            <tr>
                                <th>${currentLang === 'ar' ? 'صافي الإجمالي' : 'Net Total'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</th>
                                <th>${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${formatCurrency(cat.netTotal)}</td>
                                <td>${formatCurrency(cat.tax)}</td>
                                <td>${formatCurrency(cat.futureReturns)}</td>
                                <td>${formatCurrency(cat.returns)}</td>
                                <td>${formatCurrency(cat.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Item-wise Sales Table -->
                <div class="items-table-card">
                    <div class="table-responsive">
                        <table class="items-report-table">
                            <thead>
                                <tr>
                                    <th class="col-seq">#</th>
                                    <th class="col-name">${currentLang === 'ar' ? 'اسم الصنف' : 'Item Name'}</th>
                                    <th class="col-qty text-center">${currentLang === 'ar' ? 'الكمية' : 'Quantity'}</th>
                                    <th class="col-ret-qty text-center">${currentLang === 'ar' ? 'الكمية المرتجعة' : 'Returned Quantity'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${cat.items.map((it, idx) => `
                                    <tr>
                                        <td class="col-seq">${idx + 1}</td>
                                        <td class="col-name"><strong>${escapeHtml(it.name)}</strong></td>
                                        <td class="col-qty text-center"><span class="items-qty-badge">${it.qty}</span></td>
                                        <td class="col-ret-qty text-center"><span class="items-ret-badge ${it.returnsQty > 0 ? 'has-returns' : ''}">${it.returnsQty}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        `).join('');
    }

    container.innerHTML = `
        <section class="items-report-screen" id="itemsReportScreen">
            <!-- SECTION A: FIXED TOP -->
            <header class="items-report-top">
                <div class="items-report-top-header">
                    <div class="items-report-title-wrap">
                        <span class="items-report-breadcrumb">
                            <span class="breadcrumb-root" onclick="openReportModule('invoice_reports')">${currentLang === 'ar' ? 'التقارير' : 'Reports'}</span>
                            <span class="breadcrumb-separator">/</span>
                            <span class="breadcrumb-current">${currentLang === 'ar' ? 'تقرير الأصناف' : 'Items Report'}</span>
                        </span>
                    </div>
                    <div class="items-report-date-filters">
                        <div class="items-date-group">
                            <label for="itemsRepDateFrom"><i class="fa-regular fa-calendar"></i> ${currentLang === 'ar' ? 'من:' : 'From:'}</label>
                            <input type="date" id="itemsRepDateFrom" value="${reportDateFrom}" onchange="onItemsReportDateChange()">
                        </div>
                        <div class="items-date-group">
                            <label for="itemsRepDateTo"><i class="fa-regular fa-calendar"></i> ${currentLang === 'ar' ? 'إلى:' : 'To:'}</label>
                            <input type="date" id="itemsRepDateTo" value="${reportDateTo}" onchange="onItemsReportDateChange()">
                        </div>
                        <button type="button" class="btn btn-sm btn-teal items-btn-apply" onclick="onItemsReportDateChange()">
                            <i class="fa-solid fa-filter"></i> <span>${currentLang === 'ar' ? 'تطبيق' : 'Apply'}</span>
                        </button>
                    </div>
                </div>

                <!-- Overall Sales Summary (Two-Row Foodie POS Table Layout) -->
                <div class="items-report-overall-summary items-overall-summary-wrap">
                    <table class="items-overall-summary-table">
                        <thead>
                            <tr>
                                <th>${currentLang === 'ar' ? 'صافي الإجمالي' : 'Net Total'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</th>
                                <th>${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${formatCurrency(overall.netTotal)}</td>
                                <td>${formatCurrency(overall.tax)}</td>
                                <td>${formatCurrency(overall.futureReturns)}</td>
                                <td>${formatCurrency(overall.returns)}</td>
                                <td>${formatCurrency(overall.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </header>

            <!-- SECTION B: SCROLLABLE MIDDLE -->
            <main class="items-report-middle" id="itemsReportScrollArea">
                <div class="report-printable-area items-report-printable">
                    ${categoriesHtml}
                </div>
            </main>

            <!-- SECTION C: FIXED BOTTOM -->
            <footer class="items-report-bottom">
                <button type="button" class="btn items-report-btn-back" onclick="backFromReports()" title="${currentLang === 'ar' ? 'الرجوع لنقاط البيع' : 'Back to POS'}">
                    <i class="fa-solid ${currentLang === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'}"></i>
                    <span>${currentLang === 'ar' ? 'رجوع' : 'Back'}</span>
                </button>
                <button type="button" class="btn btn-teal items-report-btn-print" onclick="printItemsReport()" title="${currentLang === 'ar' ? 'طباعة التقرير الكامل' : 'Print Complete Report'}">
                    <i class="fa-solid fa-print"></i>
                    <span>${currentLang === 'ar' ? 'طباعة' : 'Print'}</span>
                </button>
            </footer>
        </section>
    `;
}

/**
 * Complete Report Printing Implementation
 * Strictly Read-Only: Never modifies orders, checkout sequence, cart, payments, or stock.
 * Prints ALL matching categories and items for the selected From/To dates,
 * including off-screen scrolled content.
 */
function printItemsReport() {
    const data = getItemsReportData();
    const title = currentLang === 'ar' ? 'تقرير الأصناف والمبيعات' : 'Items Sales Report';

    const companyName = (typeof storeSettings !== 'undefined' && (storeSettings.companyNameAr || storeSettings.companyName)) || 'شركة صح للتجارة';
    const storeName = (typeof storeSettings !== 'undefined' && (currentLang === 'ar' ? storeSettings.nameAr : storeSettings.nameEn)) || 'NUR FOODES';
    const vatNo = (typeof storeSettings !== 'undefined' && storeSettings.vatNumber) || '300987654300003';

    let categoriesHtml = '';
    if (data.categories.length === 0) {
        categoriesHtml = `<div style="text-align: center; padding: 30px; color: #666;">${currentLang === 'ar' ? 'لا توجد أصناف مباعة في الفترة المحددة' : 'No items sold in selected period'}</div>`;
    } else {
        data.categories.forEach(cat => {
            categoriesHtml += `
                <div style="margin-bottom: 18px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; page-break-inside: avoid; break-inside: avoid;">
                    <div style="background: #f5f3ff; padding: 8px 12px; font-weight: bold; font-size: 13.5px; border-bottom: 1px solid #ddd6fe; color: #5b21b6;">
                        ${escapeHtml(cat.name)}
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; direction: ltr !important; border-bottom: 1px solid #cbd5e1;">
                        <thead>
                            <tr style="background: #42556b; color: #ffffff;">
                                <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 20%; font-weight: 600;">${currentLang === 'ar' ? 'صافي الإجمالي' : 'Net Total'}</th>
                                <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 20%; font-weight: 600;">${currentLang === 'ar' ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</th>
                                <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 20%; font-weight: 600;">${currentLang === 'ar' ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</th>
                                <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 20%; font-weight: 600;">${currentLang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</th>
                                <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 20%; font-weight: 600;">${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="background: #ffffff; color: #1e293b; font-weight: 600;">
                                <td style="padding: 6px 6px; text-align: center; border: 1px solid #e2e8f0; width: 20%;">${formatCurrency(cat.netTotal)}</td>
                                <td style="padding: 6px 6px; text-align: center; border: 1px solid #e2e8f0; width: 20%;">${formatCurrency(cat.tax)}</td>
                                <td style="padding: 6px 6px; text-align: center; border: 1px solid #e2e8f0; width: 20%;">${formatCurrency(cat.futureReturns)}</td>
                                <td style="padding: 6px 6px; text-align: center; border: 1px solid #e2e8f0; width: 20%;">${formatCurrency(cat.returns)}</td>
                                <td style="padding: 6px 6px; text-align: center; border: 1px solid #e2e8f0; width: 20%;">${formatCurrency(cat.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: ${currentLang === 'ar' ? 'right' : 'left'};">
                        <thead>
                            <tr style="background: #334155; color: #ffffff;">
                                <th style="padding: 6px 10px; width: 35px; border: none;">#</th>
                                <th style="padding: 6px 10px; border: none;">${currentLang === 'ar' ? 'اسم الصنف' : 'Item Name'}</th>
                                <th style="padding: 6px 10px; text-align: center; width: 75px; border: none;">${currentLang === 'ar' ? 'الكمية' : 'Quantity'}</th>
                                <th style="padding: 6px 10px; text-align: center; width: 100px; border: none;">${currentLang === 'ar' ? 'الكمية المرتجعة' : 'Returned Quantity'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cat.items.map((it, idx) => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 5px 10px; color: #64748b;">${idx + 1}</td>
                                    <td style="padding: 5px 10px; font-weight: 600; color: #1e293b;">${escapeHtml(it.name)}</td>
                                    <td style="padding: 5px 10px; text-align: center;">${it.qty}</td>
                                    <td style="padding: 5px 10px; text-align: center; ${it.returnsQty > 0 ? 'color: #dc2626; font-weight: bold;' : ''}">${it.returnsQty}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });
    }

    const printHtml = `
        <div class="items-report-print-container" style="padding: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; direction: ${currentLang === 'ar' ? 'rtl' : 'ltr'};">
            <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #334155; padding-bottom: 8px;">
                <h2 style="margin: 0; font-size: 18px; color: #0f172a;">${escapeHtml(storeName)}</h2>
                <p style="margin: 3px 0; font-size: 11.5px; color: #64748b;">${escapeHtml(companyName)} | ${currentLang === 'ar' ? 'الرقم الضريبي' : 'VAT'}: ${escapeHtml(vatNo)}</p>
                <h3 style="margin: 6px 0 3px; font-size: 15px; color: #0f172a;">${escapeHtml(title)}</h3>
                <p style="margin: 0; font-size: 11px; color: #475569;">${currentLang === 'ar' ? 'الفترة:' : 'Period:'} ${reportDateFrom} ${currentLang === 'ar' ? 'إلى' : 'to'} ${reportDateTo}</p>
            </div>

            <!-- Overall Summary Print Block -->
            <div style="margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
                <div style="background: #f8fafc; padding: 6px 12px; font-weight: 700; font-size: 12px; border-bottom: 1px solid #cbd5e1; color: #334155;">
                    ${currentLang === 'ar' ? 'الملخص العام للمبيعات' : 'Overall Sales Summary'}
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; direction: ltr !important;">
                    <thead>
                        <tr style="background: #42556b; color: #ffffff;">
                            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 20%; font-weight: 600;">${currentLang === 'ar' ? 'صافي الإجمالي' : 'Net Total'}</th>
                            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 20%; font-weight: 600;">${currentLang === 'ar' ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</th>
                            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 20%; font-weight: 600;">${currentLang === 'ar' ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</th>
                            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 20%; font-weight: 600;">${currentLang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</th>
                            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 20%; font-weight: 600;">${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background: #ffffff; color: #1e293b; font-weight: 600;">
                            <td style="padding: 6px 6px; text-align: center; border: 1px solid #e2e8f0; width: 20%;">${formatCurrency(data.overall.netTotal)}</td>
                            <td style="padding: 6px 6px; text-align: center; border: 1px solid #e2e8f0; width: 20%;">${formatCurrency(data.overall.tax)}</td>
                            <td style="padding: 6px 6px; text-align: center; border: 1px solid #e2e8f0; width: 20%;">${formatCurrency(data.overall.futureReturns)}</td>
                            <td style="padding: 6px 6px; text-align: center; border: 1px solid #e2e8f0; width: 20%;">${formatCurrency(data.overall.returns)}</td>
                            <td style="padding: 6px 6px; text-align: center; border: 1px solid #e2e8f0; width: 20%;">${formatCurrency(data.overall.total)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Categories and Items -->
            ${categoriesHtml}
        </div>
    `;

    if (typeof routePrintJob === 'function') {
        routePrintJob('reports', printHtml, title);
    } else {
        window.print();
    }
}

// Global Exports
if (typeof window !== 'undefined') {
    window.renderItemsReport = renderItemsReport;
    window.getItemsReportData = getItemsReportData;
    window.onItemsReportDateChange = onItemsReportDateChange;
    window.printItemsReport = printItemsReport;
    window.renderInvoiceReports = renderInvoiceReports;
    window.getInvoiceReportsData = getInvoiceReportsData;
    window.onInvoiceReportDateChange = onInvoiceReportDateChange;
    window.printInvoiceReport = printInvoiceReport;
}
if (typeof global !== 'undefined') {
    global.renderItemsReport = renderItemsReport;
    global.getItemsReportData = getItemsReportData;
    global.onItemsReportDateChange = onItemsReportDateChange;
    global.printItemsReport = printItemsReport;
    global.renderInvoiceReports = renderInvoiceReports;
    global.getInvoiceReportsData = getInvoiceReportsData;
    global.onInvoiceReportDateChange = onInvoiceReportDateChange;
    global.printInvoiceReport = printInvoiceReport;
}


// =========================================================
// DAILY SHIFT REPORTS ENGINE (FOODIE POS EXACT SPECIFICATION)
// =========================================================

// Centralized Delivery Partner Resolution for Orders
function resolveOrderPartner(order) {
    if (!order) return null;

    // 1. Direct candidate IDs
    const candidateId = String(order.partnerId || order.deliveryPartnerId || order.channelId || order.customerId || '').toLowerCase().trim();
    const knownPartnerIds = ['hungerstation', 'jahiz', 'ninja', 'keeta', 'toyou', 'mrsool', 'thechefz', 'management'];
    
    let matchedId = null;
    if (candidateId && knownPartnerIds.includes(candidateId)) {
        matchedId = candidateId;
    }

    // 2. Text heuristics if ID not direct
    if (!matchedId) {
        const textFields = [order.customer, order.deliveryDisplay, order.orderType, order.customerId, order.notes]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        if (textFields.includes('hungerstation') || textFields.includes('هنقرستيشن') || textFields.includes('هنجر')) {
            matchedId = 'hungerstation';
        } else if (textFields.includes('jahiz') || textFields.includes('jahez') || textFields.includes('جاهز')) {
            matchedId = 'jahiz';
        } else if (textFields.includes('ninja') || textFields.includes('نينجا')) {
            matchedId = 'ninja';
        } else if (textFields.includes('keeta') || textFields.includes('كيتا')) {
            matchedId = 'keeta';
        } else if (textFields.includes('toyou') || textFields.includes('تويو') || textFields.includes('تو يو')) {
            matchedId = 'toyou';
        } else if (textFields.includes('mrsool') || textFields.includes('مرسول')) {
            matchedId = 'mrsool';
        } else if (textFields.includes('thechefz') || textFields.includes('chefz') || textFields.includes('ذا شفز')) {
            matchedId = 'thechefz';
        } else if (textFields.includes('management') || textFields.includes('طاقم الإدارة') || textFields.includes('ادارة')) {
            matchedId = 'management';
        }
    }

    if (!matchedId) return null;

    // 3. Resolve metadata from configured lists without fabricating
    let custObj = null;
    if (typeof customers !== 'undefined' && Array.isArray(customers)) {
        custObj = customers.find(c => c.id === matchedId);
    }
    if (!custObj && typeof DEFAULT_CUSTOMERS !== 'undefined' && Array.isArray(DEFAULT_CUSTOMERS)) {
        custObj = DEFAULT_CUSTOMERS.find(c => c.id === matchedId);
    }

    let appObj = null;
    if (typeof DEFAULT_APPLICATIONS !== 'undefined' && Array.isArray(DEFAULT_APPLICATIONS)) {
        appObj = DEFAULT_APPLICATIONS.find(a => a.id === matchedId);
    }

    const fallbackMetadata = {
        hungerstation: { nameEn: 'Hungerstation', nameAr: 'هنقرستيشن', companyNameAr: 'شركة هنجر' },
        jahiz: { nameEn: 'jahiz', nameAr: 'جاهز', companyNameAr: 'شركة جاهز الدولية' },
        ninja: { nameEn: 'ninja', nameAr: 'نينجا', companyNameAr: 'شركة الخيال / نينجا' },
        keeta: { nameEn: 'keeta', nameAr: 'كيتا', companyNameAr: 'تطبيق كيتا' },
        toyou: { nameEn: 'ToYou', nameAr: 'تو يو', companyNameAr: 'شركة تطبيق تويو' },
        mrsool: { nameEn: 'مرسول', nameAr: 'مرسول', companyNameAr: 'شركة تطبيق' },
        thechefz: { nameEn: 'The chefz', nameAr: 'ذا شفز', companyNameAr: 'تطبيق ذا شفز' },
        management: { nameEn: 'Management Staff', nameAr: 'طاقم الإدارة', companyNameAr: 'Management Staff' }
    };

    const fb = fallbackMetadata[matchedId] || {};

    let nameEn = (appObj && appObj.nameEn) || fb.nameEn || matchedId;
    if (custObj && custObj.nameEn) {
        const parts = custObj.nameEn.split(' - ');
        if (parts.length > 0 && parts[0].trim()) {
            nameEn = parts[0].trim();
        }
    }
    const nameAr = (appObj && appObj.nameAr) || fb.nameAr || matchedId;
    const customerArabicName = (custObj && custObj.nameAr) || '';
    const companyNameAr = customerArabicName.includes(' - ')
        ? customerArabicName.slice(customerArabicName.indexOf(' - ') + 3).trim()
        : customerArabicName || fb.companyNameAr || '';

    return {
        id: matchedId,
        nameEn: nameEn,
        nameAr: nameAr,
        companyNameAr: companyNameAr
    };
}

// Helper to identify Credit / Ajel settlement types
function isCreditPaymentMethod(rawKey) {
    if (!rawKey) return false;
    const k = String(rawKey).trim().toLowerCase();
    if (k.includes('mada') || k.includes('visa') || k.includes('cash') || k.includes('نقدي')) {
        return false;
    }
    return k === 'credit' || k.includes('credit') || k.includes('ajel') || 
           k.includes('آجل') || k.includes('اجل') || k.includes('apps') || 
           k.includes('تطبيق') || k === 'staff_expense' || k.includes('staff');
}

// Logical Payment Grouping Key Resolver
function resolveOrderPaymentGroup(order, rawMethodKey, isAr = false) {
    const partner = resolveOrderPartner(order);
    const isCredit = isCreditPaymentMethod(rawMethodKey);

    // If Credit with a Partner -> Partner-specific Credit group!
    if (isCredit && partner) {
        const partnerNameEn = partner.nameEn || partner.id;
        return {
            key: `credit_${partner.id}`,
            baseMethod: 'credit',
            isPartnerCredit: true,
            partnerId: partner.id,
            partnerName: partnerNameEn,
            partnerNameAr: partner.nameAr || partner.id,
            companyNameAr: partner.companyNameAr || '',
            name: `Credit — ${partnerNameEn}`,
            displayTitle: `Credit - ${partnerNameEn}${partner.companyNameAr ? ' - ' + partner.companyNameAr : ''}`
        };
    }

    // Generic Credit without partner association
    if (isCredit) {
        return {
            key: 'credit',
            baseMethod: 'credit',
            isPartnerCredit: false,
            partnerId: null,
            partnerName: null,
            partnerNameAr: null,
            companyNameAr: '',
            name: isAr ? 'آجل' : 'Credit',
            displayTitle: isAr ? 'آجل' : 'Credit'
        };
    }

    // Standard payment methods (Cash, Mada, Visa, etc.)
    const normKey = normalizePaymentMethodKey(rawMethodKey);
    const standardTitle = getPaymentMethodTitle(rawMethodKey, isAr);
    return {
        key: normKey,
        baseMethod: normKey,
        isPartnerCredit: false,
        partnerId: null,
        partnerName: null,
        partnerNameAr: null,
        companyNameAr: '',
        name: standardTitle,
        displayTitle: standardTitle
    };
}

// Helper to render Foodie POS-style Heading Name for Payment Types
function renderPaymentHeadingName(pm, isAr = false) {
    if (pm.isPartnerCredit) {
        const methodWord = 'Credit'; // Foodie POS reference displays 'Credit' in both EN and AR
        const partnerWord = escapeHtml(pm.partnerName || 'Partner');
        const companyWord = pm.companyNameAr ? escapeHtml(pm.companyNameAr) : '';
        if (companyWord) {
            return `<bdi class="pm-token-method">${methodWord}</bdi> - <bdi class="pm-token-partner">${partnerWord}</bdi> - <bdi class="pm-token-company">${companyWord}</bdi>`;
        }
        return `<bdi class="pm-token-method">${methodWord}</bdi> - <bdi class="pm-token-partner">${partnerWord}</bdi>`;
    }
    return `<bdi class="pm-token-method">${escapeHtml(pm.name)}</bdi>`;
}

// Helper to normalize payment method keys
function normalizePaymentMethodKey(rawKey) {
    if (!rawKey) return 'cash';
    const k = String(rawKey).trim().toLowerCase();
    if (k.includes('bank236') || k.includes('mada236')) return 'mada_236';
    if (k.includes('bank237') || k.includes('mada237')) return 'mada_237';
    if (k.includes('bank238') || k.includes('mada238')) return 'mada_238';
    if (k.includes('bank239') || k.includes('mada239')) return 'mada_239';
    if (k.includes('visa236')) return 'visa_236';
    if (k.includes('visa237')) return 'visa_237';
    if (k.includes('visa238')) return 'visa_238';
    if (k.includes('visa239')) return 'visa_239';
    if (k.includes('cash') || k.includes('نقدي')) return 'cash';
    if (k.includes('credit') || k.includes('ajel') || k.includes('آجل') || k.includes('اجل')) return 'credit';
    if (k.includes('mada_1') || k.includes('mada 1')) return 'mada_1';
    if (k.includes('mada_2') || k.includes('mada 2')) return 'mada_2';
    if (k.includes('apps') || k.includes('تطبيق')) return 'apps';
    return k.replace(/[\s\-_]+/g, '_');
}

// Helper to get payment method display title
function getPaymentMethodTitle(key, isAr = false) {
    if (!key) return isAr ? 'نقدي' : 'Cash';
    const norm = normalizePaymentMethodKey(key);
    switch (norm) {
        case 'mada_236': return 'Mada236';
        case 'mada_237': return 'Mada237';
        case 'mada_238': return 'Mada238';
        case 'mada_239': return 'Mada239';
        case 'visa_236': return 'Visa236';
        case 'visa_237': return 'Visa237';
        case 'visa_238': return 'Visa238';
        case 'visa_239': return 'Visa239';
        case 'cash': return isAr ? 'نقدي' : 'Cash';
        case 'credit': return isAr ? 'آجل' : 'Credit';
        case 'mada_1': return isAr ? 'جهاز مدى 1' : 'Mada Terminal 1';
        case 'mada_2': return isAr ? 'جهاز مدى 2' : 'Mada Terminal 2';
        case 'apps': return isAr ? 'تطبيقات التوصيل' : 'Delivery Apps';
        default:
            return String(key).trim();
    }
}

// Calculate financial metrics and payment method breakdown for a set of orders
function calculateFinancialsForOrders(orderList, isAr = false) {
    let totalSales = 0;
    let totalDiscount = 0;
    let totalReturns = 0;
    let totalFutureReturns = 0;
    let totalTax = 0;
    const paymentMethodsMap = {};

    (orderList || []).forEach(o => {
        const orderTotal = Number(o.grandTotal !== undefined ? o.grandTotal : (o.total || 0)) || 0;
        const orderDiscountVal = Number(o.discount) || 0;
        const orderReturnsVal = Number(o.return_amount ?? o.returns) || 0;
        const orderFutureRetVal = Number(o.futureReturns) || 0;
        const orderTaxVal = Number(o.tax) || 0;

        totalSales += orderTotal;
        totalDiscount += orderDiscountVal;
        totalReturns += orderReturnsVal;
        totalFutureReturns += orderFutureRetVal;
        totalTax += orderTaxVal;

        // Check if split payments or payment breakdown exists
        const breakdown = o.paymentBreakdown;
        const breakdownKeys = (breakdown && typeof breakdown === 'object')
            ? Object.keys(breakdown).filter(k => (Number(breakdown[k]) || 0) > 0)
            : [];

        if (breakdownKeys.length > 0) {
            const totalBreakdown = breakdownKeys.reduce((sum, k) => sum + (Number(breakdown[k]) || 0), 0);
            breakdownKeys.forEach(key => {
                const amt = Number(breakdown[key]) || 0;
                const ratio = totalBreakdown > 0 ? (amt / totalBreakdown) : (1 / breakdownKeys.length);
                const grp = resolveOrderPaymentGroup(o, key, isAr);
                const normKey = grp.key;
                if (!paymentMethodsMap[normKey]) {
                    paymentMethodsMap[normKey] = {
                        key: normKey,
                        methodId: grp.baseMethod,
                        isPartnerCredit: grp.isPartnerCredit,
                        partnerId: grp.partnerId,
                        partnerName: grp.partnerName,
                        partnerNameAr: grp.partnerNameAr,
                        companyNameAr: grp.companyNameAr,
                        name: grp.name,
                        displayTitle: grp.displayTitle,
                        totalSales: 0,
                        totalDiscount: 0,
                        totalReturns: 0,
                        totalFutureReturns: 0,
                        totalTax: 0
                    };
                }
                paymentMethodsMap[normKey].totalSales += amt;
                paymentMethodsMap[normKey].totalDiscount += Math.round(orderDiscountVal * ratio * 100) / 100;
                paymentMethodsMap[normKey].totalReturns += Math.round(orderReturnsVal * ratio * 100) / 100;
                paymentMethodsMap[normKey].totalFutureReturns += Math.round(orderFutureRetVal * ratio * 100) / 100;
                paymentMethodsMap[normKey].totalTax += Math.round(orderTaxVal * ratio * 100) / 100;
            });
        } else {
            const key = o.method || o.payMethod || o.paymentMethod || 'Cash';
            const grp = resolveOrderPaymentGroup(o, key, isAr);
            const normKey = grp.key;
            if (!paymentMethodsMap[normKey]) {
                paymentMethodsMap[normKey] = {
                    key: normKey,
                    methodId: grp.baseMethod,
                    isPartnerCredit: grp.isPartnerCredit,
                    partnerId: grp.partnerId,
                    partnerName: grp.partnerName,
                    partnerNameAr: grp.partnerNameAr,
                    companyNameAr: grp.companyNameAr,
                    name: grp.name,
                    displayTitle: grp.displayTitle,
                    totalSales: 0,
                    totalDiscount: 0,
                    totalReturns: 0,
                    totalFutureReturns: 0,
                    totalTax: 0
                };
            }
            paymentMethodsMap[normKey].totalSales += orderTotal;
            paymentMethodsMap[normKey].totalDiscount += orderDiscountVal;
            paymentMethodsMap[normKey].totalReturns += orderReturnsVal;
            paymentMethodsMap[normKey].totalFutureReturns += orderFutureRetVal;
            paymentMethodsMap[normKey].totalTax += orderTaxVal;
        }
    });

    totalSales = Math.round(totalSales * 100) / 100;
    totalDiscount = Math.round(totalDiscount * 100) / 100;
    totalReturns = Math.round(totalReturns * 100) / 100;
    totalFutureReturns = Math.round(totalFutureReturns * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;
    const netTotal = Math.round((totalSales - totalReturns) * 100) / 100;

    const paymentMethodsList = Object.values(paymentMethodsMap).map(pm => {
        const pmSales = Math.round(pm.totalSales * 100) / 100;
        const pmDiscount = Math.round(pm.totalDiscount * 100) / 100;
        const pmReturns = Math.round(pm.totalReturns * 100) / 100;
        const pmFutureReturns = Math.round(pm.totalFutureReturns * 100) / 100;
        const pmNet = Math.round((pmSales - pmReturns) * 100) / 100;
        const pmTax = Math.round((Number(pm.totalTax) || 0) * 100) / 100;
        return {
            key: pm.key,
            methodId: pm.methodId,
            isPartnerCredit: pm.isPartnerCredit,
            partnerId: pm.partnerId,
            partnerName: pm.partnerName,
            partnerNameAr: pm.partnerNameAr,
            companyNameAr: pm.companyNameAr,
            name: pm.name,
            displayTitle: pm.displayTitle,
            totalSales: pmSales,
            totalDiscount: pmDiscount,
            totalReturns: pmReturns,
            totalFutureReturns: pmFutureReturns,
            netTotal: pmNet,
            totalTax: pmTax
        };
    });

    return {
        totalSales,
        totalPaid: totalSales,
        totalDiscount,
        totalReturns,
        totalFutureReturns,
        netTotal,
        totalTax,
        paymentMethods: paymentMethodsList,
        ordersCount: orderList.length
    };
}

// 3. DAILY SHIFT REPORTS DATA ENGINE
function getDailyShiftsReportData() {
    if (typeof ensureSeedOrders === 'function') {
        ensureSeedOrders();
    }

    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    const fromTime = new Date(reportDateFrom + "T00:00:00").getTime();
    const toTime = new Date(reportDateTo + "T23:59:59.999").getTime();

    // 1. Filter orders strictly within the date range
    const filteredOrders = getFilteredOrders();

    // 2. Calculate overall summary and overall payment types
    const overallFinancials = calculateFinancialsForOrders(filteredOrders, isAr);

    // 3. Retrieve and filter shifts
    const allShifts = (reportSupplementalData.shifts || []).map(shift => ({
        ...shift,
        cashier: shift.cashier || shift.cashier_en || shift.cashier_ar || '—',
        cashierEn: shift.cashier_en || shift.cashier || '—',
        cashierAr: shift.cashier_ar || shift.cashier || '—',
        openedAt: shift.opened_at,
        closedAt: shift.closed_at
    }));

    // Clone to prevent mutating original collection
    const clonedShifts = JSON.parse(JSON.stringify(allShifts));

    // Attribution set to ensure an order is not double-counted across shifts
    const attributedOrderIds = new Set();

    // Find shifts belonging to the date range or with orders in the date range
    const shiftSections = [];
    clonedShifts.forEach(sh => {
        // Find orders for this shift
        const shiftOrders = filteredOrders.filter(o => {
            if (attributedOrderIds.has(o.id)) return false;
            // Direct shiftId match
            if (o.shiftId && o.shiftId === sh.id) return true;
            // Cashier match if shiftId is not set
            if (!o.shiftId) {
                const cashierMatch = (o.cashier === sh.cashier || 
                                      o.cashier === sh.cashierEn || 
                                      o.cashier === sh.cashierAr);
                if (cashierMatch) return true;
            }
            // Time window match if shift is closed or open
            if (!o.shiftId && sh.openedAt && o.date) {
                const oTime = new Date(o.date).getTime();
                const sOpen = new Date(sh.openedAt).getTime();
                const sClose = sh.closedAt ? new Date(sh.closedAt).getTime() : Date.now();
                if (oTime >= sOpen && oTime <= sClose) return true;
            }
            return false;
        });

        // Mark attributed orders
        shiftOrders.forEach(o => attributedOrderIds.add(o.id));

        // Check if shift falls within date range
        let shiftInDateRange = false;
        if (sh.openedAt) {
            const openTime = new Date(sh.openedAt).getTime();
            if (!isNaN(openTime) && openTime >= fromTime && openTime <= toTime) shiftInDateRange = true;
        }
        if (sh.closedAt) {
            const closeTime = new Date(sh.closedAt).getTime();
            if (!isNaN(closeTime) && closeTime >= fromTime && closeTime <= toTime) shiftInDateRange = true;
        }
        if (shiftOrders.length > 0) {
            shiftInDateRange = true;
        }

        if (shiftInDateRange) {
            const shiftFin = calculateFinancialsForOrders(shiftOrders, isAr);
            shiftSections.push({
                shift: sh,
                financials: shiftFin,
                orders: shiftOrders
            });
        }
    });

    // Keep orders without a recorded shift unattributed. Never invent shift records.

    // Sequence labeling for repeated staff names (e.g. "Nawaf Saeed (1)", "Nawaf Saeed (2)")
    const nameCounts = {};
    shiftSections.forEach(item => {
        const name = (isAr ? (item.shift.cashierAr || item.shift.cashier) : (item.shift.cashierEn || item.shift.cashier)) || 'Cashier';
        nameCounts[name] = (nameCounts[name] || 0) + 1;
    });

    const nameIdx = {};
    shiftSections.forEach(item => {
        const name = (isAr ? (item.shift.cashierAr || item.shift.cashier) : (item.shift.cashierEn || item.shift.cashier)) || 'Cashier';
        if (nameCounts[name] > 1) {
            nameIdx[name] = (nameIdx[name] || 0) + 1;
            item.sequenceTitle = `${name} (${nameIdx[name]})`;
        } else {
            item.sequenceTitle = name;
        }
    });

    return {
        overall: overallFinancials,
        totalPaymentTypes: overallFinancials.paymentMethods,
        shifts: shiftSections,
        shiftsCount: shiftSections.length,
        dateFrom: reportDateFrom,
        dateTo: reportDateTo
    };
}

// 3x2 Financial Arrangement Renderer (Used for Payment Types & Shift Summaries)
// Exactly implements Foodie POS presentation: "<value> : <label>" with distinct text hierarchy
function render3x2FinancialGrid(fin, isAr) {
    const netLabel = isAr ? 'صافي الإجمالي' : 'Net Total';
    const returnsLabel = isAr ? 'إجمالي المرتجعات' : 'Total Returns';
    const salesLabel = isAr ? 'إجمالي المبيعات' : 'Total Sales';
    const discountLabel = isAr ? 'إجمالي قيمة الخصم' : 'Total Discount Value';
    const futureReturnsLabel = isAr ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns';
    const taxLabel = isAr ? 'إجمالي قيمة الضريبة' : 'Total Tax Value';

    return `
        <div class="grid-cell col-left row-top">
            <span class="cell-value">${formatCurrency(fin.netTotal)}</span>
            <span class="cell-colon">:</span>
            <span class="cell-label">${netLabel}</span>
        </div>
        <div class="grid-cell col-center row-top">
            <span class="cell-value">${formatCurrency(fin.totalReturns)}</span>
            <span class="cell-colon">:</span>
            <span class="cell-label">${returnsLabel}</span>
        </div>
        <div class="grid-cell col-right row-top">
            <span class="cell-value">${formatCurrency(fin.totalSales)}</span>
            <span class="cell-colon">:</span>
            <span class="cell-label">${salesLabel}</span>
        </div>
        <div class="grid-cell col-left row-bottom">
            <span class="cell-value">${formatCurrency(fin.totalDiscount)}</span>
            <span class="cell-colon">:</span>
            <span class="cell-label">${discountLabel}</span>
        </div>
        <div class="grid-cell col-center row-bottom">
            <span class="cell-value">${formatCurrency(fin.totalFutureReturns)}</span>
            <span class="cell-colon">:</span>
            <span class="cell-label">${futureReturnsLabel}</span>
        </div>
        <div class="grid-cell col-right row-bottom">
            <span class="cell-value">${formatCurrency(fin.totalTax)}</span>
            <span class="cell-colon">:</span>
            <span class="cell-label">${taxLabel}</span>
        </div>
    `;
}

// Format date and time for shift display
function formatDailyShiftTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const formattedHours = String(hours).padStart(2, '0');
        return `${ampm} ${formattedHours}:${minutes} ${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
}

// MAIN DAILY SHIFT REPORTS RENDERER
function renderDailyShiftsReport(container) {
    if (!container) return;

    const data = getDailyShiftsReportData();
    const overall = data.overall;
    const paymentTypes = data.totalPaymentTypes;
    const shiftsList = data.shifts;
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    container.innerHTML = `
        <section class="daily-shifts-report-screen" id="dailyShiftsReportScreen">
            <!-- SECTION A: FIXED TOP -->
            <header class="daily-shifts-report-top">
                <div class="daily-shifts-report-top-header">
                    <div class="daily-shifts-report-title-wrap">
                        <span class="daily-shifts-report-breadcrumb">
                            <span class="breadcrumb-root" onclick="openReportModule('invoice_reports')">${isAr ? 'التقارير' : 'Reports'}</span>
                            <span class="breadcrumb-separator">/</span>
                            <span class="breadcrumb-current">${isAr ? 'تقارير الورديات اليومية' : 'Daily Shift Reports'}</span>
                        </span>
                        <span class="daily-shifts-count-badge" id="dailyShiftsCountBadge">${isAr ? `الورديات: ${data.shiftsCount}` : `Shifts: ${data.shiftsCount}`}</span>
                    </div>
                    <div class="daily-shifts-report-date-filters">
                        <div class="daily-shifts-date-group">
                            <label for="dailyShiftsDateFrom"><i class="fa-regular fa-calendar"></i> ${isAr ? 'من:' : 'From:'}</label>
                            <input type="date" id="dailyShiftsDateFrom" value="${reportDateFrom}" onchange="onDailyShiftsReportDateChange()">
                        </div>
                        <div class="daily-shifts-date-group">
                            <label for="dailyShiftsDateTo"><i class="fa-regular fa-calendar"></i> ${isAr ? 'إلى:' : 'To:'}</label>
                            <input type="date" id="dailyShiftsDateTo" value="${reportDateTo}" onchange="onDailyShiftsReportDateChange()">
                        </div>
                        <button type="button" class="btn btn-sm btn-teal daily-shifts-btn-apply" onclick="onDailyShiftsReportDateChange()">
                            <i class="fa-solid fa-filter"></i> <span>${isAr ? 'تطبيق' : 'Apply'}</span>
                        </button>
                    </div>
                </div>

                <!-- Mandatory 6-Column Overall Sales Summary (Two-Row Table Layout, Locked LTR) -->
                <div class="daily-shifts-overall-summary-wrap">
                    <table class="daily-shifts-overall-summary-table">
                        <thead>
                            <tr>
                                <th>${isAr ? 'صافي الإجمالي' : 'Net Total'}</th>
                                <th>${isAr ? 'إجمالي قيمة الخصم' : 'Total Discount Value'}</th>
                                <th>${isAr ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</th>
                                <th>${isAr ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</th>
                                <th>${isAr ? 'إجمالي المرتجعات' : 'Total Returns'}</th>
                                <th>${isAr ? 'الإجمالي المدفوع' : 'Total Paid'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${formatCurrency(overall.netTotal)}</td>
                                <td>${formatCurrency(overall.totalDiscount)}</td>
                                <td>${formatCurrency(overall.totalTax)}</td>
                                <td>${formatCurrency(overall.totalFutureReturns)}</td>
                                <td>${formatCurrency(overall.totalReturns)}</td>
                                <td>${formatCurrency(overall.totalPaid)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </header>

            <!-- SECTION B: INDEPENDENTLY SCROLLABLE MIDDLE -->
            <main class="daily-shifts-report-middle" id="dailyShiftsReportScrollArea">
                <!-- 1. Total Payment Types Divider -->
                <div class="shift-reports-divider">
                    <div class="divider-line"></div>
                    <span class="divider-text">${isAr ? '( إجمالي طرق الدفع )' : '( Total Payment Types )'}</span>
                    <div class="divider-line"></div>
                </div>

                <!-- 2. Payment-Type Financial Breakdown Blocks (Partner-specific Credit & Standard) -->
                <div class="payment-types-breakdowns-container">
                    ${paymentTypes.length === 0 ? `
                        <div class="text-center py-4 text-muted">${isAr ? 'لا توجد عمليات دفع مسجلة' : 'No payment transactions recorded'}</div>
                    ` : paymentTypes.map(pm => `
                        <div class="payment-type-breakdown-card" data-payment-key="${escapeHtml(pm.key)}">
                            <div class="payment-type-card-header">
                                <div class="payment-type-heading-wrap">
                                    <span class="pm-name">${renderPaymentHeadingName(pm, isAr)}</span>
                                    <span class="pm-sep">:</span>
                                    <span class="pm-type-label">${isAr ? 'طريقة دفع' : 'Payment Type'}</span>
                                </div>
                            </div>
                            <div class="payment-type-financial-grid">
                                ${render3x2FinancialGrid(pm, isAr)}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- 3. Shifts Details Divider -->
                <div class="shift-reports-divider">
                    <div class="divider-line"></div>
                    <span class="divider-text">${isAr ? '( تفاصيل الورديات )' : '( Shifts Details )'}</span>
                    <div class="divider-line"></div>
                </div>

                <!-- 4. Dynamic Shift Sections -->
                <div class="shifts-details-container">
                    ${shiftsList.length === 0 ? `
                        <div class="text-center py-4 text-muted">${isAr ? 'لا توجد ورديات في هذه الفترة' : 'No shifts found in this period'}</div>
                    ` : shiftsList.map(item => {
                        const sh = item.shift;
                        const fin = item.financials;
                        const openStr = formatDailyShiftTime(sh.openedAt);
                        const closeStr = sh.closedAt ? formatDailyShiftTime(sh.closedAt) : (isAr ? 'مستمرة' : 'Ongoing');
                        const isClosed = sh.status === 'closed';

                        return `
                            <div class="shift-section-card" id="shift_report_card_${escapeHtml(sh.id)}" data-shift-id="${escapeHtml(sh.id)}">
                                <!-- Shift Section Header: Print Shift on LEFT, Creator on RIGHT -->
                                <div class="shift-section-header">
                                    <div class="shift-header-left">
                                        <button type="button" 
                                                class="btn btn-outline-shift-print" 
                                                onclick="printIndividualShiftFromReport('${escapeHtml(sh.id)}')"
                                                data-shift-id="${escapeHtml(sh.id)}"
                                                title="${isAr ? 'طباعة تقرير الوردية' : 'Print Shift Report'}">
                                            <i class="fa-solid fa-print"></i> <span>${isAr ? 'طباعة الوردية' : 'Print Shift'}</span>
                                        </button>
                                    </div>
                                    <div class="shift-header-right">
                                        <span class="shift-status-pill ${isClosed ? 'closed' : 'active'}">
                                             ${isClosed ? (isAr ? 'مغلقة' : 'Closed') : (isAr ? 'نشطة' : 'Active')}
                                        </span>
                                        <span class="shift-creator-name">${escapeHtml(item.sequenceTitle)}</span>
                                        <span class="shift-code-badge">#${escapeHtml(sh.id)}</span>
                                        <span class="shift-timing-text">${openStr} - ${closeStr}</span>
                                    </div>
                                </div>

                                <!-- Each Shift Financial Summary (3x2 Arrangement) -->
                                <div class="shift-summary-financial-grid">
                                    ${render3x2FinancialGrid(fin, isAr)}
                                </div>

                                <!-- Individual Shift Payment Methods Breakdown (LEVEL 2 Partner-wise Credit) -->
                                ${fin.paymentMethods && fin.paymentMethods.length > 0 ? `
                                    <div class="shift-payment-methods-wrap">
                                        <h5 class="shift-payment-methods-title">${isAr ? 'طرق الدفع الخاصة بالوردية' : 'Shift Payment Methods'}</h5>
                                        ${fin.paymentMethods.map(pm => `
                                            <div class="shift-payment-method-item">
                                                <div class="shift-pm-header">
                                                    <div class="payment-type-heading-wrap">
                                                        <span class="pm-name">${renderPaymentHeadingName(pm, isAr)}</span>
                                                        <span class="pm-sep">:</span>
                                                        <span class="pm-type-label">${isAr ? 'طريقة دفع' : 'Payment Type'}</span>
                                                    </div>
                                                </div>
                                                <div class="payment-type-financial-grid">
                                                    ${render3x2FinancialGrid(pm, isAr)}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </main>

            <!-- SECTION C: FIXED BOTTOM -->
            <footer class="daily-shifts-report-bottom">
                <button type="button" class="btn daily-shifts-btn-back" onclick="backFromReports()" title="${isAr ? 'الرجوع لنقاط البيع' : 'Back to POS'}">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>${isAr ? 'رجوع' : 'Back'}</span>
                </button>
                <button type="button" class="btn btn-teal daily-shifts-btn-print" onclick="printDailyShiftsReport()" title="${isAr ? 'طباعة التقرير الكامل' : 'Print Complete Report'}">
                    <i class="fa-solid fa-print"></i>
                    <span>${isAr ? 'طباعة' : 'Print'}</span>
                </button>
            </footer>
        </section>
    `;
}

// Date change handler with validation
function onDailyShiftsReportDateChange() {
    const fromEl = document.getElementById('dailyShiftsDateFrom');
    const toEl = document.getElementById('dailyShiftsDateTo');
    if (fromEl && fromEl.value) {
        if (toEl && toEl.value && fromEl.value > toEl.value) {
            if (typeof showToast === 'function') {
                showToast(currentLang === 'ar' ? 'تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية' : 'From Date must be less than or equal to To Date', 'warning');
            }
            return;
        }
        reportDateFrom = fromEl.value;
    }
    if (toEl && toEl.value) {
        reportDateTo = toEl.value;
    }
    const container = document.getElementById('reportModuleContent');
    if (container) {
        renderDailyShiftsReport(container);
    } else {
        renderActiveReport();
    }
}

// Print Individual Shift Action (Read-only, exact Shift ID, Partner-aware)
function printIndividualShiftFromReport(shiftId) {
    const data = getDailyShiftsReportData();
    const item = data.shifts.find(s => s.shift && s.shift.id === shiftId);
    if (!item) {
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'الوردية غير موجودة' : 'Shift not found', 'danger');
        }
        return;
    }

    const sh = item.shift;
    const f = item.financials;
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    const storeTitle = (typeof storeSettings !== 'undefined' && (storeSettings.companyName || storeSettings.companyNameAr || storeSettings.nameAr))
        ? (storeSettings.companyName || storeSettings.companyNameAr || storeSettings.nameAr)
        : (isAr ? 'نور فودز' : 'NUR FOODES');
    const branchTitle = (typeof storeSettings !== 'undefined' && (storeSettings.nameAr || storeSettings.nameEn))
        ? (storeSettings.nameAr || storeSettings.nameEn)
        : (isAr ? 'فرع الرياض' : 'Main Branch');
    const vatNum = (typeof storeSettings !== 'undefined' && storeSettings.vatNumber) ? storeSettings.vatNumber : '300987654300003';
    const cashierName = isAr ? (sh.cashierAr || sh.cashier) : (sh.cashierEn || sh.cashier);
    const statusText = sh.status === 'closed' ? (isAr ? 'مغلقة' : 'Closed') : (isAr ? 'نشطة' : 'Active');

    const html = `
        <div style="font-family: 'Courier New', 'Cairo', monospace, sans-serif; font-size: 13px; line-height: 1.45; color: #000; padding: 12px; width: 100%; box-sizing: border-box; direction: ${isAr ? 'rtl' : 'ltr'};">
            <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px;">
                <h2 style="margin: 0 0 4px 0; font-size: 17px; font-weight: bold;">${escapeHtml(storeTitle)}</h2>
                <div style="font-size: 13px;">${escapeHtml(branchTitle)}</div>
                <div style="font-size: 12px; margin-top: 2px;">${isAr ? 'الرقم الضريبي:' : 'VAT No:'} ${escapeHtml(vatNum)}</div>
                <h3 style="margin: 8px 0 2px 0; font-size: 15px; border-top: 1px solid #000; padding-top: 6px;">
                    ${isAr ? 'تقرير الوردية اليومية' : 'Daily Shift Report'}
                </h3>
            </div>

            <div style="margin-bottom: 8px; font-size: 12.5px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'رقم الوردية:' : 'Shift ID:'}</span>
                    <strong>${escapeHtml(sh.id)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'المستخدم / الكاشير:' : 'Cashier / User:'}</span>
                    <strong>${escapeHtml(cashierName)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'الحالة:' : 'Status:'}</span>
                    <strong>${statusText}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'بداية الوردية:' : 'Opened At:'}</span>
                    <span>${formatDailyShiftTime(sh.openedAt)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'نهاية الوردية:' : 'Closed At:'}</span>
                    <span>${formatDailyShiftTime(sh.closedAt)}</span>
                </div>
            </div>

            <div style="border-top: 1px solid #000; padding-top: 6px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'عدد الفواتير:' : 'Invoices Count:'}</span>
                    <span>${f.ordersCount}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'إجمالي المبيعات:' : 'Total Sales:'}</span>
                    <span>${formatCurrency(f.totalSales)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'إجمالي الخصم:' : 'Total Discount:'}</span>
                    <span>${formatCurrency(f.totalDiscount)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'إجمالي المرتجعات:' : 'Total Returns:'}</span>
                    <span>${formatCurrency(f.totalReturns)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'ضريبة القيمة المضافة (15%):' : 'VAT (15%):'}</span>
                    <span>${formatCurrency(f.totalTax)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
                    <span>${isAr ? 'صافي المبيعات:' : 'Net Total:'}</span>
                    <span>${formatCurrency(f.netTotal)}</span>
                </div>
            </div>

            ${f.paymentMethods && f.paymentMethods.length > 0 ? `
                <div style="border-top: 1px dashed #000; padding-top: 6px; margin-bottom: 8px;">
                    <div style="font-weight: bold; margin-bottom: 4px; text-decoration: underline;">
                        ${isAr ? 'طرق الدفع بالوردية:' : 'Shift Payment Methods:'}
                    </div>
                    ${f.paymentMethods.map(pm => `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px;">
                            <span>${renderPaymentHeadingName(pm, isAr)}:</span>
                            <span style="font-weight: bold;">${formatCurrency(pm.netTotal)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div style="text-align: center; border-top: 2px dashed #000; padding-top: 8px; font-size: 11px; color: #333;">
                <div>${isAr ? 'تاريخ الطباعة:' : 'Print Date:'} ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</div>
                <div style="margin-top: 4px;">${isAr ? 'طابعة التقارير والمحاسبة (Reports Printer)' : 'Reports Printer'}</div>
            </div>
        </div>
    `;

    if (typeof routePrintJob === 'function') {
        routePrintJob('reports', html, `Shift Report - ${sh.id}`);
    } else {
        window.print();
    }
}

// Print Full Daily Shift Report (Foodie POS Matched Layout)
function printDailyShiftsReport() {
    const data = getDailyShiftsReportData();
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    const title = isAr ? 'تقارير الورديات اليومية' : 'Daily Shift Reports';
    const storeName = (typeof storeSettings !== 'undefined' && (isAr ? (storeSettings.nameAr || storeSettings.nameEn) : (storeSettings.nameEn || storeSettings.nameAr))) || 'NUR FOODES';
    const companyName = (typeof storeSettings !== 'undefined' && (storeSettings.companyNameAr || storeSettings.companyName)) || '';
    const vatNo = (typeof storeSettings !== 'undefined' && storeSettings.vatNumber) || '';

    const overall = data.overall;
    const paymentTypes = data.totalPaymentTypes;
    const shiftsList = data.shifts;

    const html = `
        <div style="padding: 15px; font-family: sans-serif; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #334155; padding-bottom: 10px;">
                <h2 style="margin: 0 0 4px; font-size: 20px;">${escapeHtml(storeName)}</h2>
                ${companyName ? `<p style="margin: 2px 0; color: #475569; font-size: 13px;">${escapeHtml(companyName)}</p>` : ''}
                ${vatNo ? `<p style="margin: 2px 0; color: #475569; font-size: 12px;">${isAr ? 'الرقم الضريبي:' : 'VAT No:'} ${escapeHtml(vatNo)}</p>` : ''}
                <h3 style="margin: 8px 0 4px; font-size: 16px; color: #0f172a;">${escapeHtml(title)}</h3>
                <p style="font-size: 12px; margin: 0; color: #64748b;">${isAr ? `الفترة: من ${reportDateFrom} إلى ${reportDateTo}` : `Period: From ${reportDateFrom} To ${reportDateTo}`}</p>
            </div>

            <!-- Mandatory Six-Column Overall Sales Summary Table (Foodie POS Design) -->
            <div style="margin-bottom: 20px; direction: ltr !important;">
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px;">
                    <thead>
                        <tr style="background: #42556b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${isAr ? 'صافي الإجمالي' : 'Net Total'}</th>
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${isAr ? 'إجمالي قيمة الخصم' : 'Total Discount Value'}</th>
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${isAr ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</th>
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${isAr ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</th>
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${isAr ? 'إجمالي المرتجعات' : 'Total Returns'}</th>
                            <th style="padding: 6px 4px; text-align: center; color: #ffffff !important; border: 1px solid #334155; width: 16.666%; font-weight: 600;">${isAr ? 'الإجمالي المدفوع' : 'Total Paid'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background: #ffffff !important;">
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(overall.netTotal)}</td>
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(overall.totalDiscount)}</td>
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(overall.totalTax)}</td>
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(overall.totalFutureReturns)}</td>
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(overall.totalReturns)}</td>
                            <td style="padding: 6px 4px; text-align: center; color: #1e293b; border: 1px solid #cbd5e1; width: 16.666%; font-weight: 600;">${formatCurrency(overall.totalPaid)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Divider: Total Payment Types -->
            <div style="text-align: center; margin: 15px 0 10px 0; border-top: 1px solid #0d9488; padding-top: 6px;">
                <span style="font-weight: bold; color: #534358; font-size: 13px;">${isAr ? '( إجمالي طرق الدفع )' : '( Total Payment Types )'}</span>
            </div>

            <!-- Payment Types Breakdown -->
            <div style="margin-bottom: 20px;">
                ${paymentTypes.map(pm => `
                    <div style="margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; page-break-inside: avoid; background: #ffffff;">
                        <div style="background: #ffffff; padding: 6px 12px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: flex-end; align-items: center; direction: ltr !important; font-size: 13px;">
                            <div style="display: inline-flex; align-items: center; gap: 6px; font-weight: bold;">
                                <span style="color: #1e293b;">${renderPaymentHeadingName(pm, isAr)}</span>
                                <span style="color: #534358;">:</span>
                                <span style="color: #534358; font-weight: 600;">${isAr ? 'طريقة دفع' : 'Payment Type'}</span>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); direction: ltr !important; font-size: 11px;">
                            <div style="padding: 6px 10px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 4px;">
                                <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.netTotal)}</span>
                                <span style="color: #534358;">:</span>
                                <span style="color: #534358; font-weight: 600;">${isAr ? 'صافي الإجمالي' : 'Net Total'}</span>
                            </div>
                            <div style="padding: 6px 10px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.totalReturns)}</span>
                                <span style="color: #534358;">:</span>
                                <span style="color: #534358; font-weight: 600;">${isAr ? 'إجمالي المرتجعات' : 'Total Returns'}</span>
                            </div>
                            <div style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                                <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.totalSales)}</span>
                                <span style="color: #534358;">:</span>
                                <span style="color: #534358; font-weight: 600;">${isAr ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                            </div>
                            <div style="padding: 6px 10px; border-right: 1px solid #e2e8f0; display: flex; align-items: center; gap: 4px;">
                                <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.totalDiscount)}</span>
                                <span style="color: #534358;">:</span>
                                <span style="color: #534358; font-weight: 600;">${isAr ? 'إجمالي قيمة الخصم' : 'Total Discount Value'}</span>
                            </div>
                            <div style="padding: 6px 10px; border-right: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.totalFutureReturns)}</span>
                                <span style="color: #534358;">:</span>
                                <span style="color: #534358; font-weight: 600;">${isAr ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</span>
                            </div>
                            <div style="padding: 6px 10px; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                                <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.totalTax)}</span>
                                <span style="color: #534358;">:</span>
                                <span style="color: #534358; font-weight: 600;">${isAr ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Divider: Shifts Details -->
            <div style="text-align: center; margin: 15px 0 10px 0; border-top: 1px solid #0d9488; padding-top: 6px;">
                <span style="font-weight: bold; color: #534358; font-size: 13px;">${isAr ? '( تفاصيل الورديات )' : '( Shifts Details )'}</span>
            </div>

            <!-- Shifts Details Sections -->
            <div>
                ${shiftsList.map(item => {
                    const sh = item.shift;
                    const fin = item.financials;
                    return `
                        <div style="margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; page-break-inside: avoid; background: #ffffff;">
                            <div style="background: #ffffff; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; direction: ltr !important; font-size: 12px;">
                                <div>
                                    <strong>#${escapeHtml(sh.id)}</strong> (${sh.status === 'closed' ? (isAr ? 'مغلقة' : 'Closed') : (isAr ? 'نشطة' : 'Active')})
                                </div>
                                <div>
                                    <strong>${escapeHtml(item.sequenceTitle)}</strong> - ${formatDailyShiftTime(sh.openedAt)} ${sh.closedAt ? ' / ' + formatDailyShiftTime(sh.closedAt) : ''}
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); direction: ltr !important; font-size: 11px;">
                                <div style="padding: 6px 10px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 4px;">
                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(fin.netTotal)}</span>
                                    <span style="color: #534358;">:</span>
                                    <span style="color: #534358; font-weight: 600;">${isAr ? 'صافي الإجمالي' : 'Net Total'}</span>
                                </div>
                                <div style="padding: 6px 10px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(fin.totalReturns)}</span>
                                    <span style="color: #534358;">:</span>
                                    <span style="color: #534358; font-weight: 600;">${isAr ? 'إجمالي المرتجعات' : 'Total Returns'}</span>
                                </div>
                                <div style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(fin.totalSales)}</span>
                                    <span style="color: #534358;">:</span>
                                    <span style="color: #534358; font-weight: 600;">${isAr ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                                </div>
                                <div style="padding: 6px 10px; border-right: 1px solid #e2e8f0; display: flex; align-items: center; gap: 4px;">
                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(fin.totalDiscount)}</span>
                                    <span style="color: #534358;">:</span>
                                    <span style="color: #534358; font-weight: 600;">${isAr ? 'إجمالي قيمة الخصم' : 'Total Discount Value'}</span>
                                </div>
                                <div style="padding: 6px 10px; border-right: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(fin.totalFutureReturns)}</span>
                                    <span style="color: #534358;">:</span>
                                    <span style="color: #534358; font-weight: 600;">${isAr ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</span>
                                </div>
                                <div style="padding: 6px 10px; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(fin.totalTax)}</span>
                                    <span style="color: #534358;">:</span>
                                    <span style="color: #534358; font-weight: 600;">${isAr ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</span>
                                </div>
                            </div>

                            ${fin.paymentMethods && fin.paymentMethods.length > 0 ? `
                                <div style="padding: 8px 10px; background: #fafbfc; border-top: 1px solid #e2e8f0;">
                                    <div style="font-size: 11px; font-weight: bold; color: #475569; margin-bottom: 6px;">
                                        ${isAr ? 'طرق الدفع بالوردية:' : 'Shift Payment Methods:'}
                                    </div>
                                    ${fin.paymentMethods.map(pm => `
                                        <div style="margin-bottom: 6px; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #ffffff;">
                                            <div style="padding: 4px 8px; background: #ffffff; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: flex-end; align-items: center; font-size: 11.5px; font-weight: bold; direction: ltr !important;">
                                                <div style="display: inline-flex; align-items: center; gap: 4px;">
                                                    <span style="color: #1e293b;">${renderPaymentHeadingName(pm, isAr)}</span>
                                                    <span style="color: #534358;">:</span>
                                                    <span style="color: #534358;">${isAr ? 'طريقة دفع' : 'Payment Type'}</span>
                                                </div>
                                            </div>
                                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); direction: ltr !important; font-size: 10.5px;">
                                                <div style="padding: 4px 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 4px;">
                                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.netTotal)}</span>
                                                    <span style="color: #534358;">:</span>
                                                    <span style="color: #534358;">${isAr ? 'صافي الإجمالي' : 'Net Total'}</span>
                                                </div>
                                                <div style="padding: 4px 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.totalReturns)}</span>
                                                    <span style="color: #534358;">:</span>
                                                    <span style="color: #534358;">${isAr ? 'إجمالي المرتجعات' : 'Total Returns'}</span>
                                                </div>
                                                <div style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.totalSales)}</span>
                                                    <span style="color: #534358;">:</span>
                                                    <span style="color: #534358;">${isAr ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                                                </div>
                                                <div style="padding: 4px 8px; border-right: 1px solid #e2e8f0; display: flex; align-items: center; gap: 4px;">
                                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.totalDiscount)}</span>
                                                    <span style="color: #534358;">:</span>
                                                    <span style="color: #534358;">${isAr ? 'إجمالي قيمة الخصم' : 'Total Discount Value'}</span>
                                                </div>
                                                <div style="padding: 4px 8px; border-right: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.totalFutureReturns)}</span>
                                                    <span style="color: #534358;">:</span>
                                                    <span style="color: #534358;">${isAr ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</span>
                                                </div>
                                                <div style="padding: 4px 8px; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                                                    <span style="font-weight: bold; color: #0f172a;">${formatCurrency(pm.totalTax)}</span>
                                                    <span style="color: #534358;">:</span>
                                                    <span style="color: #534358;">${isAr ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>

            <div style="text-align: center; border-top: 1px dashed #64748b; padding-top: 8px; font-size: 11px; color: #64748b; margin-top: 20px;">
                ${isAr ? 'تاريخ الطباعة:' : 'Print Date:'} ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}
            </div>
        </div>
    `;

    if (typeof routePrintJob === 'function') {
        routePrintJob('reports', html, title);
    } else {
        window.print();
    }
}

if (typeof window !== 'undefined') {
    window.renderDailyShiftsReport = renderDailyShiftsReport;
    window.getDailyShiftsReportData = getDailyShiftsReportData;
    window.onDailyShiftsReportDateChange = onDailyShiftsReportDateChange;
    window.printDailyShiftsReport = printDailyShiftsReport;
    window.printIndividualShiftFromReport = printIndividualShiftFromReport;
    window.resolveOrderPartner = resolveOrderPartner;
    window.resolveOrderPaymentGroup = resolveOrderPaymentGroup;
    window.renderPaymentHeadingName = renderPaymentHeadingName;
}
if (typeof global !== 'undefined') {
    global.renderDailyShiftsReport = renderDailyShiftsReport;
    global.getDailyShiftsReportData = getDailyShiftsReportData;
    global.onDailyShiftsReportDateChange = onDailyShiftsReportDateChange;
    global.printDailyShiftsReport = printDailyShiftsReport;
    global.printIndividualShiftFromReport = printIndividualShiftFromReport;
    global.resolveOrderPartner = resolveOrderPartner;
    global.resolveOrderPaymentGroup = resolveOrderPaymentGroup;
    global.renderPaymentHeadingName = renderPaymentHeadingName;
}


// 4. DAMAGED ITEMS REPORT
function renderDamagedItemsReport(container, outgoingOnly = false) {
    const damagedData = (reportSupplementalData.damagedMovements || []).filter(row => !outgoingOnly || Boolean(row.order_id));

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'تقرير التوالف والهالك' : 'Damaged Items Report')}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>${currentLang === 'ar' ? 'الصنف التالف' : 'Damaged Item'}</th>
                                <th>${currentLang === 'ar' ? 'الكمية' : 'Qty'}</th>
                                <th>${currentLang === 'ar' ? 'التكلفة' : 'Cost'}</th>
                                <th>${currentLang === 'ar' ? 'سبب التلف' : 'Reason'}</th>
                                <th>${currentLang === 'ar' ? 'المسؤول' : 'Staff'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'التاريخ' : 'Date'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${damagedData.length ? damagedData.map((d, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>${escapeHtml(currentLang === 'ar' ? (d.name_ar || d.name_en || d.product_id) : (d.name_en || d.product_id))}</strong></td>
                                    <td><span class="badge-pill bg-danger-subtle text-danger">${Math.abs(Number(d.quantity_delta) || 0)}</span></td>
                                    <td>—</td>
                                    <td>${escapeHtml(d.note || d.reason)}</td>
                                    <td>${escapeHtml(d.user_id || '—')}</td>
                                    <td class="text-end">${escapeHtml(d.created_at || '')}</td>
                                </tr>
                            `).join('') : `<tr><td colspan="7" class="text-center">No inventory damage records are available.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 5. APPLICATION REPORTS
function renderApplicationReports(container) {
    const grouped = new Map();
    getFilteredOrders().forEach(order => {
        const label = order.orderType || order.type || 'Unknown';
        const row = grouped.get(label) || { label, count: 0, total: 0 };
        row.count += 1;
        row.total += Number(order.grandTotal) || 0;
        grouped.set(label, row);
    });
    const rows = [...grouped.values()];
    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'تقرير التطبيقات' : 'Application Reports')}
        <div class="report-printable-area"><div class="report-table-card"><div class="table-responsive">
            <table class="report-table"><thead><tr>
                <th>${currentLang === 'ar' ? 'نوع الطلب المسجل' : 'Recorded Order Type'}</th>
                <th>${currentLang === 'ar' ? 'عدد الطلبات' : 'Order Count'}</th>
                <th class="text-end">${currentLang === 'ar' ? 'إجمالي المبيعات المسجلة' : 'Recorded Sales'}</th>
            </tr></thead><tbody>
                ${rows.length ? rows.map(row => `<tr><td><strong>${escapeHtml(row.label)}</strong></td><td>${row.count}</td><td class="text-end">${formatCurrency(row.total)}</td></tr>`).join('') : `<tr><td colspan="3" class="text-center">${currentLang === 'ar' ? 'لا توجد طلبات في الفترة المحددة' : 'No orders in the selected period.'}</td></tr>`}
            </tbody></table>
            <p class="text-muted">${currentLang === 'ar' ? 'بيانات العمولات والتسويات غير مسجلة في قاعدة البيانات.' : 'Commission and settlement data are not recorded in the database.'}</p>
        </div></div></div>`;
}
// 6. SERVICE DURATIONS REPORT
function renderServiceDurationsReport(container) {
    const durations = [];

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'أوقات إنجاز الخدمة' : 'Service Durations Report')}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>${currentLang === 'ar' ? 'رقم الطلب' : 'Order ID'}</th>
                                <th>${currentLang === 'ar' ? 'نوع الطلب' : 'Order Type'}</th>
                                <th>${currentLang === 'ar' ? 'وقت التجهيز في المطبخ' : 'Prep Duration'}</th>
                                <th>${currentLang === 'ar' ? 'وقت التسليم / التوصيل' : 'Delivery Duration'}</th>
                                <th>${currentLang === 'ar' ? 'الوقت الإجمالي' : 'Total Duration'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'الحالة' : 'Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${durations.length ? durations.map(d => `
                                <tr>
                                    <td><strong>#${d.id}</strong></td>
                                    <td>${d.type}</td>
                                    <td>${d.prep}</td>
                                    <td>${d.delivery}</td>
                                    <td class="fw-bold">${d.total}</td>
                                    <td class="text-end"><span class="badge-pill bg-success-subtle text-success">${d.status}</span></td>
                                </tr>
                            `).join('') : `<tr><td colspan="6" class="text-center">Order preparation and delivery timestamps are not recorded.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 7. TOTALS REPORT
function renderTotalsReport(container) {
    const filtered = getFilteredOrders();
    const grossSales = filtered.reduce((s, o) => s + (Number(o.subtotal) || 0), 0);
    const totalDiscounts = filtered.reduce((s, o) => s + (Number(o.discount) || 0), 0);
    const taxableTotal = filtered.reduce((s, o) => s + Math.max(0, (Number(o.grandTotal) || 0) - (Number(o.tax) || 0)), 0);
    const totalTax = filtered.reduce((s, o) => s + (Number(o.tax) || 0), 0);
    const grandTotal = filtered.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'تقرير الإجماليات الشامل' : 'Totals Report')}
        <div class="report-printable-area">
            <div class="report-summary-cards">
                <div class="summary-card">
                    <span class="card-lbl">${currentLang === 'ar' ? 'المبيعات قبل الخصم والضريبة' : 'Gross Sales'}</span>
                    <span class="card-val">${formatCurrency(grossSales)}</span>
                </div>
                <div class="summary-card">
                    <span class="card-lbl">${currentLang === 'ar' ? 'إجمالي الخصومات' : 'Total Discounts'}</span>
                    <span class="card-val text-danger">-${formatCurrency(totalDiscounts)}</span>
                </div>
                <div class="summary-card">
                    <span class="card-lbl">${currentLang === 'ar' ? 'المبلغ الخاضع للضريبة' : 'Taxable Subtotal'}</span>
                    <span class="card-val">${formatCurrency(taxableTotal)}</span>
                </div>
                <div class="summary-card">
                    <span class="card-lbl">${currentLang === 'ar' ? 'ضريبة القيمة المضافة المسجلة' : 'Recorded VAT'}</span>
                    <span class="card-val">${formatCurrency(totalTax)}</span>
                </div>
                <div class="summary-card highlight-card">
                    <span class="card-lbl">${currentLang === 'ar' ? 'المجموع النهائي الكلي' : 'Grand Total'}</span>
                    <span class="card-val">${formatCurrency(grandTotal)}</span>
                </div>
            </div>
        </div>
    `;
}

// 8. ACTIVE MEALS REPORTS
function renderOrderFlowReport(container, flow, showItems, customTitle = null) {
    const isOutgoing = flow === 'outgoing';
    const title = customTitle || `${isOutgoing ? 'Outgoing' : 'Active'} ${showItems ? 'Items' : 'Invoices'} Report`;
    const relevantOrders = getFilteredOrders().filter(order => {
        const status = String(order.status || '').toLowerCase();
        if (isOutgoing) return status === 'completed';
        return !['completed', 'cancelled', 'refunded', 'returned'].includes(status);
    });
    const rows = relevantOrders.flatMap(order => showItems
        ? (order.items || []).map(item => ({ order, item }))
        : [{ order, item: null }]);
    container.innerHTML = `
        ${renderReportHeader(customTitle || (currentLang === 'ar' ? (isOutgoing ? 'تقارير الطلبات المكتملة' : 'تقارير الفواتير النشطة') : title))}
        <div class="report-printable-area"><div class="report-table-card"><div class="table-responsive">
            <table class="report-table"><thead><tr>
                <th>${currentLang === 'ar' ? 'رقم الفاتورة' : 'Invoice ID'}</th>
                ${!showItems ? `<th>${currentLang === 'ar' ? 'رقم الطلب' : 'Order Number'}</th>` : ''}
                <th>${currentLang === 'ar' ? 'العميل' : 'Customer'}</th>
                <th>${currentLang === 'ar' ? 'التاريخ' : 'Date'}</th>
                ${showItems ? `<th>${currentLang === 'ar' ? 'المنتج' : 'Product'}</th><th>${currentLang === 'ar' ? 'الكمية' : 'Qty'}</th>` : ''}
                <th>${currentLang === 'ar' ? 'نوع الطلب' : 'Delivery Type'}</th>
                <th>${currentLang === 'ar' ? 'حالة الطلب' : 'Order Status'}</th>
                <th class="text-end">${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</th>
            </tr></thead><tbody>
                ${rows.length ? rows.map(({ order, item }) => `<tr><td>${escapeHtml(order.id)}</td>${!showItems ? `<td>${escapeHtml(order.orderNumber || order.id)}</td>` : ''}<td>${escapeHtml(order.customer || '—')}</td><td>${escapeHtml(order.date || '')}</td>${showItems ? `<td>${escapeHtml(item ? (currentLang === 'ar' ? (item.arName || item.enName) : item.enName) : '')}</td><td>${item ? Number(item.qty) || 0 : 0}</td>` : ''}<td>${escapeHtml(order.orderType || order.type || '—')}</td><td>${escapeHtml(order.status || '—')}</td><td class="text-end">${formatCurrency(showItems && item ? (Number(item.price) || 0) * (Number(item.qty) || 0) : order.grandTotal)}</td></tr>`).join('') : `<tr><td colspan="${showItems ? 7 : 7}" class="text-center">${currentLang === 'ar' ? 'لا توجد سجلات في الفترة المحددة' : `No ${isOutgoing ? 'outgoing' : 'active'} records in the selected period.`}</td></tr>`}
            </tbody></table>
        </div></div></div>`;
}

function renderUnavailableReport(container, title, message) {
    const isAr = currentLang === 'ar';
    container.innerHTML = `${renderReportHeader(isAr ? 'التقرير غير متاح' : title)}
        <div class="report-printable-area"><div class="report-table-card" role="status" style="padding:24px">
            ${escapeHtml(isAr ? 'لا تتوفر حقول أو سجلات مطابقة في قاعدة البيانات الحالية.' : message)}
        </div></div>`;
}

function renderActiveMealsReport(container) {
    renderOrderFlowReport(container, 'active', false);
}
// 9. MEALS REPORTS
function renderMealsReports(container) {
    const categoriesById = new Map((categories || []).map(category => [category.id, category]));
    const totalsByCategory = new Map();
    getFilteredOrders().filter(order => order.status === 'completed').forEach(order => {
        (order.items || []).forEach(line => {
            const product = items.find(item => item.id === line.id);
            if (!product) return;
            const category = categoriesById.get(product.catId);
            if (!category) return;
            const row = totalsByCategory.get(category.id) || { cat: category.nameAr, catEn: category.nameEn, count: 0, revenue: 0 };
            row.count += Number(line.qty) || 0;
            row.revenue += (Number(line.price) || 0) * (Number(line.qty) || 0);
            totalsByCategory.set(category.id, row);
        });
    });
    const mealsAnalytics = [...totalsByCategory.values()];
    const allCategorySales = mealsAnalytics.reduce((total, category) => total + category.revenue, 0);
    mealsAnalytics.forEach(category => { category.share = allCategorySales ? `${(category.revenue * 100 / allCategorySales).toFixed(1)}%` : '0%'; });

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'تقارير فئات الوجبات' : 'Meals & Category Reports')}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>${currentLang === 'ar' ? 'تصنيف الوجبات' : 'Category'}</th>
                                <th>${currentLang === 'ar' ? 'الكمية المباعة' : 'Quantity Sold'}</th>
                                <th>${currentLang === 'ar' ? 'الإيراد الإجمالي' : 'Revenue'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'نسبة المساهمة' : 'Revenue Share'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${mealsAnalytics.length ? mealsAnalytics.map(c => `
                                <tr>
                                    <td><strong>${escapeHtml(currentLang === 'ar' ? c.cat : c.catEn)}</strong></td>
                                    <td><span class="badge-pill">${c.count}</span></td>
                                    <td class="fw-bold">${formatCurrency(c.revenue)}</td>
                                    <td class="text-end">${c.share}</td>
                                </tr>
                            `).join('') : `<tr><td colspan="4" class="text-center">No product sales are recorded for this period.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 10. PAYMENT TYPE REPORT
function renderPaymentTypeReport(container) {
    const grouped = new Map();
    (reportSupplementalData.paymentTransactions || []).forEach(tx => {
        const key = tx.method || 'Other';
        const row = grouped.get(key) || { method: key, count: 0, amount: 0, refunds: 0 };
        const amount = Number(tx.amount) || 0;
        row.count += 1;
        if (String(tx.status || '').toLowerCase().includes('refund')) row.refunds += Math.abs(amount);
        else row.amount += amount;
        grouped.set(key, row);
    });
    const rows = [...grouped.values()];
    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'تقرير طرق الدفع' : 'Payment Type Report')}
        <div class="report-printable-area"><div class="report-table-card"><div class="table-responsive">
            <table class="report-table"><thead><tr>
                <th>${currentLang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</th>
                <th>${currentLang === 'ar' ? 'عدد المعاملات' : 'Transactions'}</th>
                <th>${currentLang === 'ar' ? 'إجمالي المبالغ المسجلة' : 'Recorded Amount'}</th>
                <th class="text-end">${currentLang === 'ar' ? 'المبالغ المعادة المسجلة' : 'Recorded Refunds'}</th>
                <th class="text-end">${currentLang === 'ar' ? 'الصافي' : 'Net Amount'}</th>
            </tr></thead><tbody>
                ${rows.length ? rows.map(row => `<tr><td><strong>${escapeHtml(row.method)}</strong></td><td>${row.count}</td><td>${formatCurrency(row.amount)}</td><td class="text-end">${formatCurrency(row.refunds)}</td><td class="text-end">${formatCurrency(row.amount - row.refunds)}</td></tr>`).join('') : `<tr><td colspan="5" class="text-center">${currentLang === 'ar' ? 'لا توجد معاملات دفع مسجلة في الفترة المحددة' : 'No payment transactions are recorded for this period.'}</td></tr>`}
            </tbody></table>
        </div></div></div>`;
}
// 11. BALANCING PAYMENT METHODS (Live editable & saved history)
function renderBalancingPayments(container) {
    const defaultTotals = {};
    const methods = [...(paymentMethods || [])];
    methods.forEach(method => { defaultTotals[method.id] = 0; });
    (reportSupplementalData.paymentTransactions || []).forEach(tx => {
        const rawMethod = String(tx.method || 'Other');
        let method = methods.find(candidate => [candidate.id, candidate.nameEn, candidate.nameAr].some(value => String(value || '').toLowerCase() === rawMethod.toLowerCase()));
        if (!method) {
            const id = `recorded_${rawMethod.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
            method = { id, nameEn: rawMethod, nameAr: rawMethod, category: 'Recorded', categoryEn: 'Recorded', categoryAr: 'مسجل' };
            methods.push(method);
            defaultTotals[id] = 0;
        }
        defaultTotals[method.id] += Number(tx.amount) || 0;
    });
    const lastBalancing = balancingRecords && balancingRecords.length > 0 ? balancingRecords[balancingRecords.length - 1] : null;

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'مطابقة وموازنة طرق الدفع' : 'Payment Methods Balancing', false)}
        <div class="report-printable-area">
            <div class="balancing-notice-bar">
                <i class="fa-solid fa-calculator"></i>
                <span>${currentLang === 'ar' 
                    ? 'أدخل المبالغ الفعلية المحصلة من نقاط البيع والنقد، وسيقوم النظام باحتساب الفارق تلقائياً.' 
                    : 'Enter actual counts from terminals & cash drawer. System automatically computes Difference = Actual - Total.'}</span>
            </div>
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>${currentLang === 'ar' ? 'التصنيف' : 'Category'}</th>
                                <th>${currentLang === 'ar' ? 'طريقة الدفع / الجهاز' : 'Payment Type'}</th>
                                <th>${currentLang === 'ar' ? 'المجموع بالنظام' : 'System Total'}</th>
                                <th style="width: 170px;">${currentLang === 'ar' ? 'المبلغ الفعلي' : 'Actual'}</th>
                                <th>${currentLang === 'ar' ? 'الفارق' : 'Difference'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'آخر قيمة مطابقة' : 'Last Balancing'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${methods.map(pm => {
                                const sysTotal = Math.round((defaultTotals[pm.id] || 0) * 100) / 100;
                                const actualVal = balancingInputs[pm.id] !== undefined ? balancingInputs[pm.id] : sysTotal;
                                const diff = Math.round((actualVal - sysTotal) * 100) / 100;
                                const lastVal = lastBalancing && lastBalancing.values && lastBalancing.values[pm.id] !== undefined 
                                    ? formatCurrency(lastBalancing.values[pm.id]) 
                                    : '-';

                                const diffColor = diff === 0 ? 'text-success' : (diff > 0 ? 'text-primary' : 'text-danger');

                                return `
                                    <tr>
                                        <td><span class="badge-subtle">${escapeHtml(currentLang === 'ar' ? (pm.categoryAr || pm.category) : (pm.categoryEn || pm.category))}</span></td>
                                        <td><strong>${escapeHtml(currentLang === 'ar' ? pm.nameAr : pm.nameEn)}</strong></td>
                                        <td class="fw-bold">${formatCurrency(sysTotal)}</td>
                                        <td>
                                            <input type="number" step="0.01" class="form-control form-control-sm balancing-input" 
                                                id="actual_${pm.id}" 
                                                value="${actualVal}" 
                                                oninput="onBalancingInputChange('${pm.id}', ${sysTotal}, this.value)">
                                        </td>
                                        <td class="fw-bold ${diffColor}" id="diff_${pm.id}">
                                            ${diff > 0 ? '+' : ''}${formatCurrency(diff)}
                                        </td>
                                        <td class="text-end text-muted">${lastVal}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="balancing-footer-actions">
                    <button type="button" class="btn btn-teal btn-lg" onclick="saveBalancingRecord()">
                        <i class="fa-solid fa-floppy-disk"></i> ${currentLang === 'ar' ? 'حفظ سجل المطابقة' : 'Save Balancing'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function onBalancingInputChange(pmId, sysTotal, valStr) {
    const num = parseFloat(valStr) || 0;
    balancingInputs[pmId] = num;
    const diff = Math.round((num - sysTotal) * 100) / 100;
    const diffEl = document.getElementById(`diff_${pmId}`);
    if (diffEl) {
        diffEl.className = `fw-bold ${diff === 0 ? 'text-success' : (diff > 0 ? 'text-primary' : 'text-danger')}`;
        diffEl.textContent = `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`;
    }
}

function saveBalancingRecord() {
    const record = {
        id: "BAL-" + Date.now(),
        date: new Date().toISOString(),
        user: currentUser.name,
        values: { ...balancingInputs }
    };

    balancingRecords.push(record);
    persistData();
    if (typeof soundSuccess === 'function') soundSuccess();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تم حفظ سجل المطابقة بنجاح' : 'Balancing record saved successfully', 'success');
    }
    renderActiveReport();
}

// 12. APPLICATIONS DATA REVIEW
function renderApplicationsReview(container) {
    const totals = new Map();
    getFilteredOrders().forEach(order => {
        const key = order.orderType || order.type || 'Unknown';
        const row = totals.get(key) || { type: key, count: 0, amount: 0 };
        row.count += 1;
        row.amount += Number(order.grandTotal) || 0;
        totals.set(key, row);
    });
    const rows = [...totals.values()];
    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'مراجعة بيانات الطلبات' : 'Applications Data Review')}
        <div class="report-printable-area"><div class="report-table-card"><div class="table-responsive">
            <table class="report-table"><thead><tr><th>${currentLang === 'ar' ? 'نوع الطلب المسجل' : 'Recorded Order Type'}</th><th>${currentLang === 'ar' ? 'عدد الطلبات' : 'Order Count'}</th><th>${currentLang === 'ar' ? 'إجمالي المبيعات' : 'Recorded Sales'}</th></tr></thead><tbody>
                ${rows.length ? rows.map(row => `<tr><td>${escapeHtml(row.type)}</td><td>${row.count}</td><td>${formatCurrency(row.amount)}</td></tr>`).join('') : `<tr><td colspan="3" class="text-center">${currentLang === 'ar' ? 'لا توجد بيانات في الفترة المحددة' : 'No data in the selected period.'}</td></tr>`}
            </tbody></table>
            <p class="text-muted">${currentLang === 'ar' ? 'بيانات تسويات التطبيقات والمرتجعات غير متاحة في قاعدة البيانات.' : 'Application settlement and refund records are not available in the database.'}</p>
        </div></div></div>`;
}
function onAppReviewInputChange(appId, net, valStr) {
    const num = parseFloat(valStr) || 0;
    appReviewInputs[appId] = num;
    const diff = Math.round((num - net) * 100) / 100;
    const diffEl = document.getElementById(`appdiff_${appId}`);
    if (diffEl) {
        diffEl.className = `text-end fw-bold ${diff === 0 ? 'text-success' : 'text-danger'}`;
        diffEl.textContent = formatCurrency(diff);
    }
}

// 13. INTERNAL ORDERS
function renderInternalOrders(container) {
    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'الطلبات الداخلية' : 'Internal Orders', false)}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="text-muted">${currentLang === 'ar' ? 'سجل وجبات الموظفين والضيافة وفحص الجودة' : 'Staff meals, QC tasting & hospitality records'}</span>
                    <button type="button" class="btn btn-sm btn-teal" onclick="promptNewInternalOrder()">
                        <i class="fa-solid fa-plus"></i> ${currentLang === 'ar' ? 'طلب داخلي جديد' : 'New Internal Order'}
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>${currentLang === 'ar' ? 'رقم الطلب' : 'Order ID'}</th>
                                <th>${currentLang === 'ar' ? 'النوع / الغرض' : 'Type / Purpose'}</th>
                                <th>${currentLang === 'ar' ? 'صاحب الطلب' : 'Requester'}</th>
                                <th>${currentLang === 'ar' ? 'عدد الأصناف' : 'Items'}</th>
                                <th>${currentLang === 'ar' ? 'القيمة' : 'Amount'}</th>
                                <th>${currentLang === 'ar' ? 'التاريخ' : 'Date'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'الحالة' : 'Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${internalOrders.map((ord, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>${ord.id}</strong></td>
                                    <td>${escapeHtml(currentLang === 'ar' ? (ord.typeAr || ord.type) : (ord.typeEn || ord.type))}</td>
                                    <td>${escapeHtml(currentLang === 'ar' ? (ord.requesterAr || ord.requester) : (ord.requesterEn || ord.requester))}</td>
                                    <td><span class="badge-pill">${ord.itemsCount}</span></td>
                                    <td class="fw-bold">${formatCurrency(ord.total)}</td>
                                    <td>${new Date(ord.date).toLocaleDateString(currentLang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                                    <td class="text-end"><span class="badge-pill bg-success-subtle text-success">${escapeHtml(ord.status === 'approved' ? (currentLang === 'ar' ? 'معتمد' : 'Approved') : (currentLang === 'ar' ? 'مكتمل' : 'Completed'))}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function promptNewInternalOrder() {
    const type = prompt(currentLang === 'ar' ? "نوع الطلب الداخلي (مثال: وجبة موظف، ضيافة، فحص جودة):" : "Order Purpose:", currentLang === 'ar' ? "وجبة موظف" : "Staff Meal");
    if (!type) return;
    const requester = prompt(currentLang === 'ar' ? "اسم طالب الوجبة:" : "Requester Name:", currentUser.name);
    if (!requester) return;
    const amountStr = prompt(currentLang === 'ar' ? "القيمة التقديرية:" : "Estimated Amount:", "25.00");
    const total = parseFloat(amountStr) || 0;

    internalOrders.unshift({
        id: "INT-" + (100 + internalOrders.length + 1),
        date: new Date().toISOString(),
        type: type.trim(),
        requester: requester.trim(),
        itemsCount: 2,
        total: total,
        status: "approved"
    });

    persistData();
    renderActiveReport();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تم تسجيل الطلب الداخلي بنجاح' : 'Internal order recorded', 'success');
    }
}

// 14. INVENTORY AUDITING
function renderInventoryAuditing(container) {
    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'جرد ومطابقة المخزون' : 'Inventory Auditing', false)}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>${currentLang === 'ar' ? 'المادة / الصنف' : 'Item / Raw Material'}</th>
                                <th>${currentLang === 'ar' ? 'الوحدة' : 'Unit'}</th>
                                <th>${currentLang === 'ar' ? 'الكمية المتوقعة في النظام' : 'Expected Qty'}</th>
                                <th style="width: 160px;">${currentLang === 'ar' ? 'الكمية الفعلية المحصورة' : 'Counted Qty'}</th>
                                <th>${currentLang === 'ar' ? 'الفارق' : 'Difference'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'التكلفة' : 'Cost'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventoryRecords.map((inv, idx) => {
                                const counted = auditInputs[inv.id] !== undefined ? auditInputs[inv.id] : inv.remaining;
                                const diff = counted - inv.remaining;
                                return `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td><strong>${escapeHtml(currentLang === 'ar' ? inv.nameAr : inv.nameEn)}</strong></td>
                                        <td><span class="badge-subtle">${currentLang === 'ar' ? (inv.unitAr || inv.unit) : (inv.unitEn || inv.unit)}</span></td>
                                        <td class="fw-bold">${inv.remaining}</td>
                                        <td>
                                            <input type="number" class="form-control form-control-sm" 
                                                value="${counted}" 
                                                oninput="onAuditInputChange('${inv.id}', ${inv.remaining}, this.value)">
                                        </td>
                                        <td class="fw-bold ${diff === 0 ? 'text-success' : 'text-danger'}" id="auditdiff_${inv.id}">
                                            ${diff > 0 ? '+' : ''}${diff}
                                        </td>
                                        <td class="text-end">${formatCurrency(inv.cost)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="balancing-footer-actions">
                    <button type="button" class="btn btn-teal btn-lg" onclick="saveInventoryAudit()">
                        <i class="fa-solid fa-check-double"></i> ${currentLang === 'ar' ? 'اعتماد وحفظ الجرد' : 'Save Inventory Audit'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function onAuditInputChange(invId, expected, valStr) {
    const num = parseFloat(valStr) || 0;
    auditInputs[invId] = num;
    const diff = num - expected;
    const diffEl = document.getElementById(`auditdiff_${invId}`);
    if (diffEl) {
        diffEl.className = `fw-bold ${diff === 0 ? 'text-success' : 'text-danger'}`;
        diffEl.textContent = `${diff > 0 ? '+' : ''}${diff}`;
    }
}

function saveInventoryAudit() {
    // Apply counted quantities
    inventoryRecords.forEach(inv => {
        if (auditInputs[inv.id] !== undefined) {
            inv.remaining = auditInputs[inv.id];
        }
    });
    persistData();
    auditInputs = {};
    if (typeof soundSuccess === 'function') soundSuccess();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تم اعتماد وحفظ نتائج الجرد في المخزون' : 'Inventory audit saved successfully', 'success');
    }
    renderActiveReport();
}

// 15. DAILY INVENTORY
function renderDailyInventory(container) {
    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'المخزون اليومي' : 'Daily Inventory', false)}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>${currentLang === 'ar' ? 'الصنف' : 'Product / Raw Material'}</th>
                                <th>${currentLang === 'ar' ? 'الوحدة' : 'Unit'}</th>
                                <th>${currentLang === 'ar' ? 'رصيد الافتتاح' : 'Opening'}</th>
                                <th>${currentLang === 'ar' ? 'الوارد' : 'Incoming'}</th>
                                <th>${currentLang === 'ar' ? 'المستهلك / المباع' : 'Sold/Used'}</th>
                                <th>${currentLang === 'ar' ? 'الهالك' : 'Damaged'}</th>
                                <th>${currentLang === 'ar' ? 'الرصيد المتبقي' : 'Remaining'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'قيمة الرصيد' : 'Value'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventoryRecords.map((inv, idx) => {
                                const totalVal = (Number(inv.remaining) || 0) * (Number(inv.cost) || 0);
                                return `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td><strong>${escapeHtml(currentLang === 'ar' ? inv.nameAr : inv.nameEn)}</strong></td>
                                        <td><span class="badge-subtle">${currentLang === 'ar' ? (inv.unitAr || inv.unit) : (inv.unitEn || inv.unit)}</span></td>
                                        <td>${inv.opening}</td>
                                        <td class="text-success">+${inv.incoming}</td>
                                        <td class="text-warning">-${inv.sold}</td>
                                        <td class="text-danger">-${inv.damaged}</td>
                                        <td class="fw-bold text-primary">${inv.remaining}</td>
                                        <td class="text-end fw-bold">${formatCurrency(totalVal)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 16. DAILY STOCK CALCULATOR
function renderDailyStockCalculator(container) {
    const totalOpeningVal = inventoryRecords.reduce((s, i) => s + (i.opening * i.cost), 0);
    const totalIncomingVal = inventoryRecords.reduce((s, i) => s + (i.incoming * i.cost), 0);
    const totalSoldVal = inventoryRecords.reduce((s, i) => s + (i.sold * i.cost), 0);
    const totalDamagedVal = inventoryRecords.reduce((s, i) => s + (i.damaged * i.cost), 0);
    const calculatedStockVal = Math.max(0, totalOpeningVal + totalIncomingVal - totalSoldVal - totalDamagedVal);

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'حاسبة المخزون اليومي التقديري' : 'Daily Stock Calculator', false)}
        <div class="report-printable-area">
            <div class="stock-calc-formula-banner">
                <div class="formula-term">
                    <span class="term-lbl">${currentLang === 'ar' ? 'رصيد الافتتاح' : 'Opening Stock'}</span>
                    <span class="term-val">${formatCurrency(totalOpeningVal)}</span>
                </div>
                <div class="formula-op">+</div>
                <div class="formula-term">
                    <span class="term-lbl">${currentLang === 'ar' ? 'الوارد الجديد' : 'Incoming'}</span>
                    <span class="term-val text-success">${formatCurrency(totalIncomingVal)}</span>
                </div>
                <div class="formula-op">-</div>
                <div class="formula-term">
                    <span class="term-lbl">${currentLang === 'ar' ? 'المبيعات / الاستهلاك' : 'Sold/Used'}</span>
                    <span class="term-val text-warning">${formatCurrency(totalSoldVal)}</span>
                </div>
                <div class="formula-op">-</div>
                <div class="formula-term">
                    <span class="term-lbl">${currentLang === 'ar' ? 'التوالف' : 'Damaged'}</span>
                    <span class="term-val text-danger">${formatCurrency(totalDamagedVal)}</span>
                </div>
                <div class="formula-op">=</div>
                <div class="formula-term highlight-term">
                    <span class="term-lbl">${currentLang === 'ar' ? 'المخزون المحسوب' : 'Calculated Value'}</span>
                    <span class="term-val text-teal">${formatCurrency(calculatedStockVal)}</span>
                </div>
            </div>

            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>${currentLang === 'ar' ? 'الصنف' : 'Item'}</th>
                                <th>${currentLang === 'ar' ? 'معادلة الحسبة (الافتتاحي + الوارد - المباع - التالف)' : 'Formula (Opening + In - Sold - Damaged)'}</th>
                                <th>${currentLang === 'ar' ? 'المتبقي المحسوب' : 'Calculated Remaining'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'القيمة الإجمالية' : 'Calculated Value'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventoryRecords.map((inv, idx) => {
                                const calcQty = Math.max(0, (inv.opening + inv.incoming) - inv.sold - inv.damaged);
                                const calcVal = calcQty * inv.cost;
                                return `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td><strong>${escapeHtml(currentLang === 'ar' ? inv.nameAr : inv.nameEn)}</strong></td>
                                        <td>${inv.opening} + ${inv.incoming} - ${inv.sold} - ${inv.damaged}</td>
                                        <td><span class="badge-pill bg-teal-subtle text-teal">${calcQty} ${inv.unit}</span></td>
                                        <td class="text-end fw-bold">${formatCurrency(calcVal)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function openReportsModal() {
    if (typeof canAccessReports === 'function' && !canAccessReports()) return;
    if (typeof toggleSideDrawer === 'function') {
        toggleSideDrawer();
    }
}
window.openReportsModal = openReportsModal;

