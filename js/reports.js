/* =========================================================
   REPORTS.JS - All POS Reports, Balancing, Reconciliation,
   Internal Orders, Inventory Auditing & Stock Calculator
   ========================================================= */

// Active Report State
let activeReportModule = 'invoice_reports';
let reportDateFrom = (() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split('T')[0];
})();
let reportDateTo = (() => {
    return new Date().toISOString().split('T')[0];
})();

// Temporary Live Editing State for Balancing & Reconciliation
let balancingInputs = {};
let appReviewInputs = {};
let auditInputs = {};

// Ensure Rich Realistic Past Orders if orders list is empty or only contains sample ORD-1013
function ensureSeedOrders() {
    if (orders && orders.some(o => o.id === "ORD-1001")) return;
    if (orders && orders.length > 0 && !orders.every(o => o.id === 'ORD-1013')) return;

    const dummyOrders = [
        {
            id: "ORD-1001",
            seq: 1001,
            isDemo: true,
            isSample: true,
            date: new Date(Date.now() - 3600000 * 2).toISOString(),
            customer: "عميل نقدي",
            customerId: "cash",
            orderType: "محلي",
            orderTypeId: "local",
            payMethod: "Cash",
            cashier: "Nawaf Saeed",
            subtotal: 75.00,
            discount: 5.00,
            taxableAmount: 70.00,
            tax: 10.50,
            grandTotal: 80.50,
            status: "completed",
            items: [
                { id: "item_1", name: "Charcoal Mixed Grill", arName: "مشكل مشاوي ع الفحم", price: 26.00, qty: 2 },
                { id: "item_2", name: "Burger /FF Meal", arName: "وجبة برجر ع الفحم", price: 18.50, qty: 1 },
                { id: "item_21", name: "Pepsi Can", arName: "بيبسي علبة", price: 4.50, qty: 1 }
            ]
        },
        {
            id: "ORD-1002",
            seq: 1002,
            isDemo: true,
            isSample: true,
            date: new Date(Date.now() - 3600000 * 5).toISOString(),
            customer: "هنقرستيشن",
            customerId: "hungerstation",
            orderType: "توصيل",
            orderTypeId: "delivery",
            payMethod: "Apps",
            cashier: "Cashier 1",
            subtotal: 58.50,
            discount: 0.00,
            taxableAmount: 58.50,
            tax: 8.78,
            grandTotal: 67.28,
            status: "completed",
            items: [
                { id: "item_3", name: "Meat Burger Meal", arName: "وجبة برجر لحم", price: 19.50, qty: 2 },
                { id: "item_2", name: "Burger /FF Meal", arName: "وجبة برجر ع الفحم", price: 18.50, qty: 1 },
                { id: "item_22", name: "Coca Cola", arName: "كولا علبة", price: 4.50, qty: 1 }
            ]
        },
        {
            id: "ORD-1003",
            seq: 1003,
            isDemo: true,
            isSample: true,
            date: new Date(Date.now() - 3600000 * 12).toISOString(),
            customer: "جاهز",
            customerId: "jahiz",
            orderType: "توصيل",
            orderTypeId: "delivery",
            payMethod: "Mada Terminal 1",
            cashier: "Nawaf Saeed",
            subtotal: 104.00,
            discount: 10.00,
            taxableAmount: 94.00,
            tax: 14.10,
            grandTotal: 108.10,
            status: "completed",
            items: [
                { id: "item_1", name: "Charcoal Mixed Grill", arName: "مشكل مشاوي ع الفحم", price: 26.00, qty: 4 }
            ]
        },
        {
            id: "ORD-1004",
            seq: 1004,
            isDemo: true,
            isSample: true,
            date: new Date(Date.now() - 3600000 * 24).toISOString(),
            customer: "طاقم الإدارة",
            customerId: "management",
            orderType: "استلام",
            orderTypeId: "receive",
            payMethod: "VISA / Mastercard",
            cashier: "Nawaf Saeed",
            subtotal: 42.00,
            discount: 0.00,
            taxableAmount: 42.00,
            tax: 6.30,
            grandTotal: 48.30,
            status: "completed",
            items: [
                { id: "item_4", name: "Chicken Strips Meal", arName: "وجبة برجر دجاج شرائح", price: 18.50, qty: 2 },
                { id: "item_23", name: "Adani Tea", arName: "شاي عدني", price: 4.00, qty: 2 }
            ]
        },
        {
            id: "ORD-1005",
            seq: 1005,
            isDemo: true,
            isSample: true,
            date: new Date(Date.now() - 3600000 * 48).toISOString(),
            customer: "عميل نقدي",
            customerId: "cash",
            orderType: "سيارات",
            orderTypeId: "cars",
            payMethod: "Cash",
            cashier: "Cashier 1",
            subtotal: 37.00,
            discount: 0.00,
            taxableAmount: 37.00,
            tax: 5.55,
            grandTotal: 42.55,
            status: "completed",
            items: [
                { id: "item_2", name: "Burger /FF Meal", arName: "وجبة برجر ع الفحم", price: 18.50, qty: 2 }
            ]
        }
    ];

    if (!orders || orders.length === 0) {
        orders = dummyOrders;
    } else {
        dummyOrders.forEach(d => {
            if (!orders.some(o => o.id === d.id)) orders.push(d);
        });
    }
    persistData();
}

// Filter orders by active date range
function getFilteredOrders() {
    ensureSeedOrders();
    const fromTime = new Date(reportDateFrom + "T00:00:00").getTime();
    const toTime = new Date(reportDateTo + "T23:59:59").getTime();

    return orders.filter(o => {
        if (!o.date) return true;
        const orderTime = new Date(o.date).getTime();
        return orderTime >= fromTime && orderTime <= toTime;
    });
}

// Set Active Report Screen
function openReportModule(moduleId) {
    activeReportModule = moduleId;
    switchView('reports_screen');
    renderActiveReport();
    closeSideDrawer();
}

// Main Report Screen Renderer
function renderActiveReport() {
    const container = document.getElementById('reportModuleContent');
    if (!container) return;

    // Highlight active link in side drawer (including sub-items like items_report)
    document.querySelectorAll('.drawer-menu-item, .drawer-sub-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-report-id') === activeReportModule);
    });

    const reportsContainer = document.getElementById('reportsView');
    if (reportsContainer) {
        if (activeReportModule === 'items_report') {
            reportsContainer.classList.add('items-report-mode');
        } else {
            reportsContainer.classList.remove('items-report-mode');
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
            renderActiveMealsReport(container);
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

// Common Date Range Component Header
function renderReportHeader(title, showDateFilter = true) {
    return `
        <div class="report-header-bar">
            <div class="report-title-group">
                <button type="button" class="btn btn-icon btn-secondary-pos" onclick="switchView('pos')" title="${currentLang === 'ar' ? 'الرجوع لنقاط البيع' : 'Back to POS'}">
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
    const fromInput = document.getElementById('repDateFromInput');
    const toInput = document.getElementById('repDateToInput');
    if (fromInput && fromInput.value) reportDateFrom = fromInput.value;
    if (toInput && toInput.value) reportDateTo = toInput.value;
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

// 1. INVOICE REPORTS
function renderInvoiceReports(container) {
    const filtered = getFilteredOrders();
    const totalSales = filtered.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);
    const returnsTotal = 0.00;
    const netTotal = totalSales - returnsTotal;
    const invoicesCount = filtered.length;

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'تقارير الفواتير' : 'Invoice Reports')}
        <div class="report-printable-area">
            <div class="report-summary-cards">
                <div class="summary-card">
                    <span class="card-lbl">${currentLang === 'ar' ? 'عدد الفواتير' : 'Invoices Count'}</span>
                    <span class="card-val">${invoicesCount}</span>
                </div>
                <div class="summary-card">
                    <span class="card-lbl">${currentLang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                    <span class="card-val">${formatCurrency(totalSales)}</span>
                </div>
                <div class="summary-card">
                    <span class="card-lbl">${currentLang === 'ar' ? 'المرتجعات' : 'Returns'}</span>
                    <span class="card-val">${formatCurrency(returnsTotal)}</span>
                </div>
                <div class="summary-card highlight-card">
                    <span class="card-lbl">${currentLang === 'ar' ? 'الصافي' : 'Net Total'}</span>
                    <span class="card-val">${formatCurrency(netTotal)}</span>
                </div>
            </div>

            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
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
                                    <td>${idx + 1}</td>
                                    <td><strong>#${escapeHtml(o.seq || o.id)}</strong></td>
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
    `;
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
    const fromParts = (reportDateFrom || '').split('-');
    let fromTime;
    if (fromParts.length === 3) {
        fromTime = new Date(Number(fromParts[0]), Number(fromParts[1]) - 1, Number(fromParts[2]), 0, 0, 0, 0).getTime();
    } else {
        fromTime = new Date((reportDateFrom || '') + "T00:00:00").getTime();
    }

    const toParts = (reportDateTo || '').split('-');
    let toNextDayTime;
    if (toParts.length === 3) {
        toNextDayTime = new Date(Number(toParts[0]), Number(toParts[1]) - 1, Number(toParts[2]) + 1, 0, 0, 0, 0).getTime();
    } else {
        toNextDayTime = new Date((reportDateTo || '') + "T23:59:59.999").getTime() + 1;
    }

    const allOrders = (typeof orders !== 'undefined' && Array.isArray(orders)) ? orders : [];

    // Filter by date range and valid order timestamps
    let filteredOrders = allOrders.filter(o => {
        if (!o.date) return true;
        const orderTime = new Date(o.date).getTime();
        if (isNaN(orderTime)) return false;
        return orderTime >= fromTime && orderTime < toNextDayTime;
    });

    // Check company and branch permissions
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role !== 'admin') {
        if (currentUser.branchId) {
            filteredOrders = filteredOrders.filter(o => !o.branchId || o.branchId === currentUser.branchId);
        }
        if (currentUser.companyId) {
            filteredOrders = filteredOrders.filter(o => !o.companyId || o.companyId === currentUser.companyId);
        }
    }

    // Exclude unpaid, void, draft orders
    filteredOrders = filteredOrders.filter(o => {
        if (o.status === 'void' || o.status === 'draft' || o.status === 'unpaid') return false;
        return true;
    });

    const taxRate = (typeof storeSettings !== 'undefined' && Number(storeSettings.taxRate)) || 15;

    // Collect all catalog categories
    const allCategories = (typeof categories !== 'undefined' && Array.isArray(categories))
        ? categories
        : ((typeof DEFAULT_CATEGORIES !== 'undefined' && Array.isArray(DEFAULT_CATEGORIES)) ? DEFAULT_CATEGORIES : []);

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
        } else if (order.status === 'cancelled' || order.status === 'returned' || order.isReturned === true) {
            // Entire order cancelled/returned
            if (Array.isArray(order.items)) {
                order.items.forEach(it => {
                    const k = it.id || it.name;
                    if (!orderReturnedMap[k]) orderReturnedMap[k] = { qty: 0, amount: 0 };
                    const q = Number(it.qty) || 1;
                    const p = Number(it.price) || 0;
                    orderReturnedMap[k].qty += q;
                    orderReturnedMap[k].amount += (q * p);
                });
            }
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

                // Resolve category ID
                let catId = it.catId || it.category;
                if (!catId) {
                    const catalogItem = (typeof items !== 'undefined' && Array.isArray(items)) 
                        ? items.find(ci => ci.id === it.id || ci.enName === it.name || ci.arName === it.name) 
                        : null;
                    if (catalogItem && catalogItem.catId) {
                        catId = catalogItem.catId;
                    } else if (typeof DEFAULT_ITEMS !== 'undefined' && Array.isArray(DEFAULT_ITEMS)) {
                        const defItem = DEFAULT_ITEMS.find(ci => ci.id === it.id || ci.enName === it.name || ci.arName === it.name);
                        if (defItem && defItem.catId) catId = defItem.catId;
                    }
                }
                if (!catId) {
                    const nameLower = (it.name || it.enName || '').toLowerCase();
                    if (nameLower.includes('grill') || nameLower.includes('sandwich') || nameLower.includes('kebab') || nameLower.includes('fries') || nameLower.includes('sauce') || nameLower.includes('cheese')) {
                        catId = 'sandwiches';
                    } else if (nameLower.includes('meal') || nameLower.includes('burger')) {
                        catId = 'meals';
                    } else if (nameLower.includes('pepsi') || nameLower.includes('cola') || nameLower.includes('water') || nameLower.includes('juice') || nameLower.includes('soda')) {
                        catId = 'drinks';
                    } else if (nameLower.includes('tea') || nameLower.includes('coffee')) {
                        catId = 'hot_drinks';
                    } else {
                        catId = 'unclassified';
                    }
                }

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
        cat.tax = taxRate > 0 ? Math.round(((cat.netTotal * taxRate) / (100 + taxRate)) * 100) / 100 : 0;

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

                <!-- Category Sales Summary (Above product list) -->
                <div class="items-category-summary">
                    <div class="cat-summary-item">
                        <span class="cat-summary-lbl">${currentLang === 'ar' ? 'الإجمالي' : 'Total'}:</span>
                        <span class="cat-summary-val">${formatCurrency(cat.total)}</span>
                    </div>
                    <div class="cat-summary-item">
                        <span class="cat-summary-lbl">${currentLang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}:</span>
                        <span class="cat-summary-val">${formatCurrency(cat.returns)}</span>
                    </div>
                    <div class="cat-summary-item">
                        <span class="cat-summary-lbl">${currentLang === 'ar' ? 'المرتجعات المستقبلية' : 'Total Future Returns'}:</span>
                        <span class="cat-summary-val">${formatCurrency(cat.futureReturns)}</span>
                    </div>
                    <div class="cat-summary-item">
                        <span class="cat-summary-lbl">${currentLang === 'ar' ? 'قيمة الضريبة' : 'Total Tax Value'}:</span>
                        <span class="cat-summary-val">${formatCurrency(cat.tax)}</span>
                    </div>
                    <div class="cat-summary-item cat-summary-net">
                        <span class="cat-summary-lbl">${currentLang === 'ar' ? 'الصافي' : 'Net Total'}:</span>
                        <span class="cat-summary-val">${formatCurrency(cat.netTotal)}</span>
                    </div>
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

                <!-- Overall Sales Summary (Fixed Top) -->
                <div class="items-report-overall-summary">
                    <div class="items-summary-card">
                        <span class="items-summary-label">${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                        <span class="items-summary-value">${formatCurrency(overall.total)}</span>
                    </div>
                    <div class="items-summary-card">
                        <span class="items-summary-label">${currentLang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</span>
                        <span class="items-summary-value">${formatCurrency(overall.returns)}</span>
                    </div>
                    <div class="items-summary-card">
                        <span class="items-summary-label">${currentLang === 'ar' ? 'إجمالي المرتجعات المستقبلية' : 'Total Future Returns'}</span>
                        <span class="items-summary-value">${formatCurrency(overall.futureReturns)}</span>
                    </div>
                    <div class="items-summary-card">
                        <span class="items-summary-label">${currentLang === 'ar' ? 'إجمالي قيمة الضريبة' : 'Total Tax Value'}</span>
                        <span class="items-summary-value">${formatCurrency(overall.tax)}</span>
                    </div>
                    <div class="items-summary-card items-summary-net">
                        <span class="items-summary-label">${currentLang === 'ar' ? 'صافي الإجمالي' : 'Net Total'}</span>
                        <span class="items-summary-value">${formatCurrency(overall.netTotal)}</span>
                    </div>
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
                <button type="button" class="btn items-report-btn-back" onclick="switchView('pos')" title="${currentLang === 'ar' ? 'الرجوع لنقاط البيع' : 'Back to POS'}">
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
                    <div style="background: #faf5ff; padding: 6px 12px; font-size: 11px; border-bottom: 1px solid #ede9fe; display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between;">
                        <span><strong>${currentLang === 'ar' ? 'الإجمالي' : 'Total'}:</strong> ${formatCurrency(cat.total)}</span>
                        <span><strong>${currentLang === 'ar' ? 'المرتجعات' : 'Returns'}:</strong> ${formatCurrency(cat.returns)}</span>
                        <span><strong>${currentLang === 'ar' ? 'المرتجعات المستقبلية' : 'Future Returns'}:</strong> ${formatCurrency(cat.futureReturns)}</span>
                        <span><strong>${currentLang === 'ar' ? 'الضريبة' : 'Tax'}:</strong> ${formatCurrency(cat.tax)}</span>
                        <span><strong>${currentLang === 'ar' ? 'الصافي' : 'Net'}:</strong> ${formatCurrency(cat.netTotal)}</span>
                    </div>
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
            <div style="margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc;">
                <div style="font-weight: 700; font-size: 12px; margin-bottom: 6px; color: #334155;">
                    ${currentLang === 'ar' ? 'الملخص العام للمبيعات' : 'Overall Sales Summary'}
                </div>
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 11.5px;">
                    <div><strong>${currentLang === 'ar' ? 'الإجمالي' : 'Total'}:</strong> ${formatCurrency(data.overall.total)}</div>
                    <div><strong>${currentLang === 'ar' ? 'المرتجعات' : 'Returns'}:</strong> ${formatCurrency(data.overall.returns)}</div>
                    <div><strong>${currentLang === 'ar' ? 'المرتجعات المستقبلية' : 'Future Returns'}:</strong> ${formatCurrency(data.overall.futureReturns)}</div>
                    <div><strong>${currentLang === 'ar' ? 'قيمة الضريبة' : 'Tax Value'}:</strong> ${formatCurrency(data.overall.tax)}</div>
                    <div style="color: #0f766e; font-weight: bold;"><strong>${currentLang === 'ar' ? 'صافي الإجمالي' : 'Net Total'}:</strong> ${formatCurrency(data.overall.netTotal)}</div>
                </div>
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
}
if (typeof global !== 'undefined') {
    global.renderItemsReport = renderItemsReport;
    global.getItemsReportData = getItemsReportData;
    global.onItemsReportDateChange = onItemsReportDateChange;
    global.printItemsReport = printItemsReport;
}


// 3. DAILY SHIFT REPORTS
function renderDailyShiftsReport(container) {
    const filtered = getFilteredOrders();
    const totalSales = filtered.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);

    const shiftsData = [
        {
            id: "SH-901",
            cashier: "Nawaf Saeed (Manager)",
            openedAt: reportDateFrom + " 08:00 AM",
            closedAt: reportDateFrom + " 04:00 PM",
            salesCount: Math.ceil(filtered.length * 0.6),
            salesTotal: totalSales * 0.6,
            returns: 0,
            diff: 0
        },
        {
            id: "SH-902",
            cashier: "Cashier 1",
            openedAt: reportDateFrom + " 04:00 PM",
            closedAt: reportDateFrom + " 11:59 PM",
            salesCount: Math.floor(filtered.length * 0.4),
            salesTotal: totalSales * 0.4,
            returns: 0,
            diff: 0
        }
    ];

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'تقارير الورديات اليومية' : 'Daily Shift Reports')}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>${currentLang === 'ar' ? 'رقم الوردية' : 'Shift ID'}</th>
                                <th>${currentLang === 'ar' ? 'الكاشير' : 'Cashier'}</th>
                                <th>${currentLang === 'ar' ? 'بداية الوردية' : 'Opening'}</th>
                                <th>${currentLang === 'ar' ? 'نهاية الوردية' : 'Closing'}</th>
                                <th>${currentLang === 'ar' ? 'عدد الفواتير' : 'Invoices'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي المبيعات' : 'Sales Total'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'الفروقات' : 'Differences'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${shiftsData.map(sh => `
                                <tr>
                                    <td><strong>${sh.id}</strong></td>
                                    <td>${escapeHtml(sh.cashier)}</td>
                                    <td>${sh.openedAt}</td>
                                    <td>${sh.closedAt}</td>
                                    <td>${sh.salesCount}</td>
                                    <td class="fw-bold">${formatCurrency(sh.salesTotal)}</td>
                                    <td class="text-end text-success">${formatCurrency(sh.diff)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 4. DAMAGED ITEMS REPORT
function renderDamagedItemsReport(container) {
    const damagedData = [
        { date: reportDateFrom, item: "لحم برجر حاشي", itemEn: "Hashi Burger Patties", qty: 2, cost: 13.00, reasonAr: "سوء حفظ بالمبرد", reasonEn: "Storage defect", user: "Ahmed Kitchen" },
        { date: reportDateFrom, item: "خبز برجر بالسمسم", itemEn: "Burger Buns", qty: 4, cost: 6.00, reasonAr: "تلف بالتغليف", reasonEn: "Packaging defect", user: "Kitchen Staff" },
        { date: reportDateFrom, item: "أسياخ كباب لحم", itemEn: "Meat Kebab Skewers", qty: 3, cost: 12.60, reasonAr: "احتراق أثناء الشواء", reasonEn: "Burnt on grill", user: "Grill Master" }
    ];

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
                            ${damagedData.map((d, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>${escapeHtml(currentLang === 'ar' ? d.item : d.itemEn)}</strong></td>
                                    <td><span class="badge-pill bg-danger-subtle text-danger">${d.qty}</span></td>
                                    <td>${formatCurrency(d.cost)}</td>
                                    <td>${escapeHtml(currentLang === 'ar' ? d.reasonAr : d.reasonEn)}</td>
                                    <td>${escapeHtml(d.user)}</td>
                                    <td class="text-end">${d.date}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 5. APPLICATION REPORTS
function renderApplicationReports(container) {
    const filtered = getFilteredOrders();
    const appStats = applications.map(app => {
        const appOrders = filtered.filter(o => o.customerId === app.id || (o.customer && o.customer.includes(app.nameAr)));
        const totalSales = appOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
        const commissionAmount = (totalSales * (app.commission || 15)) / 100;
        const netAfterCommission = totalSales - commissionAmount;

        return {
            nameAr: app.nameAr,
            nameEn: app.nameEn,
            count: appOrders.length,
            totalSales,
            commissionPct: app.commission || 15,
            commissionAmount,
            netAfterCommission
        };
    });

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'تقرير مبيعات تطبيقات التوصيل' : 'Delivery Application Reports')}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>${currentLang === 'ar' ? 'التطبيق' : 'Application'}</th>
                                <th>${currentLang === 'ar' ? 'عدد الطلبات' : 'Orders Count'}</th>
                                <th>${currentLang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</th>
                                <th>${currentLang === 'ar' ? 'نسبة العمولة' : 'Commission %'}</th>
                                <th>${currentLang === 'ar' ? 'قيمة العمولة' : 'Commission Amount'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'الصافي للمطعم' : 'Restaurant Net'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${appStats.map(app => `
                                <tr>
                                    <td><strong>${escapeHtml(currentLang === 'ar' ? app.nameAr : app.nameEn)}</strong></td>
                                    <td><span class="badge-pill">${app.count}</span></td>
                                    <td>${formatCurrency(app.totalSales)}</td>
                                    <td>${app.commissionPct}%</td>
                                    <td>${formatCurrency(app.commissionAmount)}</td>
                                    <td class="text-end fw-bold text-success">${formatCurrency(app.netAfterCommission)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 6. SERVICE DURATIONS REPORT
function renderServiceDurationsReport(container) {
    const durations = [
        { id: "ORD-1001", type: "محلي", prep: "7 دقيقة", delivery: "4 دقيقة", total: "11 دقيقة", status: "مكتمل" },
        { id: "ORD-1002", type: "توصيل", prep: "12 دقيقة", delivery: "22 دقيقة", total: "34 دقيقة", status: "مكتمل" },
        { id: "ORD-1003", type: "توصيل", prep: "9 دقيقة", delivery: "18 دقيقة", total: "27 دقيقة", status: "مكتمل" },
        { id: "ORD-1004", type: "استلام", prep: "6 دقيقة", delivery: "0 دقيقة", total: "6 دقيقة", status: "مكتمل" }
    ];

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
                            ${durations.map(d => `
                                <tr>
                                    <td><strong>#${d.id}</strong></td>
                                    <td>${d.type}</td>
                                    <td>${d.prep}</td>
                                    <td>${d.delivery}</td>
                                    <td class="fw-bold">${d.total}</td>
                                    <td class="text-end"><span class="badge-pill bg-success-subtle text-success">${d.status}</span></td>
                                </tr>
                            `).join('')}
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
    const taxableTotal = filtered.reduce((s, o) => s + (Number(o.taxableAmount) || 0), 0);
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
                    <span class="card-lbl">${currentLang === 'ar' ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</span>
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
function renderActiveMealsReport(container) {
    const activeMeals = [
        { id: "M-1", nameAr: "مشكل مشاوي ع الفحم", nameEn: "Charcoal Mixed Grill", table: "Table 2", statusAr: "قيد التجهيز", statusEn: "Cooking", startedAr: "منذ 4 دقائق", startedEn: "4 mins ago" },
        { id: "M-2", nameAr: "وجبة برجر ع الفحم", nameEn: "Charcoal Burger Meal", table: currentLang === 'ar' ? "هنقرستيشن" : "HungerStation", statusAr: "جاهز للتسليم", statusEn: "Ready", startedAr: "منذ 8 دقائق", startedEn: "8 mins ago" },
        { id: "M-3", nameAr: "سندوتش تندوري", nameEn: "Tandoori Sandwich", table: "Table 4", statusAr: "قيد التجهيز", statusEn: "Cooking", startedAr: "منذ دقيقتين", startedEn: "2 mins ago" }
    ];

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'الوجبات النشطة حالياً' : 'Active Meals Report', false)}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>${currentLang === 'ar' ? 'الوجبة' : 'Meal'}</th>
                                <th>${currentLang === 'ar' ? 'الطلب / الطاولة' : 'Order / Table'}</th>
                                <th>${currentLang === 'ar' ? 'وقت البدء' : 'Started'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'حالة الوجبة' : 'Meal Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeMeals.map((m, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>${escapeHtml(currentLang === 'ar' ? m.nameAr : m.nameEn)}</strong></td>
                                    <td>${escapeHtml(m.table)}</td>
                                    <td>${currentLang === 'ar' ? m.startedAr : m.startedEn}</td>
                                    <td class="text-end"><span class="badge-pill bg-warning-subtle text-warning">${currentLang === 'ar' ? m.statusAr : m.statusEn}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 9. MEALS REPORTS
function renderMealsReports(container) {
    const mealsAnalytics = [
        { cat: "الوجبات - المشاوي", catEn: "Meals - Grills", count: 48, revenue: 1150.00, share: "45%" },
        { cat: "السندوتشات - المشاوي", catEn: "Sandwiches - Grills", count: 62, revenue: 740.00, share: "29%" },
        { cat: "المشروبات غازية ومياه", catEn: "Soft Drinks & Water", count: 85, revenue: 382.50, share: "15%" },
        { cat: "المشروبات الساخنة ومخبوزات", catEn: "Hot Drinks & Bakery", count: 54, revenue: 270.00, share: "11%" }
    ];

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
                            ${mealsAnalytics.map(c => `
                                <tr>
                                    <td><strong>${escapeHtml(currentLang === 'ar' ? c.cat : c.catEn)}</strong></td>
                                    <td><span class="badge-pill">${c.count}</span></td>
                                    <td class="fw-bold">${formatCurrency(c.revenue)}</td>
                                    <td class="text-end">${c.share}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 10. PAYMENT TYPE REPORT
function renderPaymentTypeReport(container) {
    const filtered = getFilteredOrders();
    const payTotals = {};

    paymentMethods.forEach(pm => {
        payTotals[pm.id] = {
            nameAr: pm.nameAr,
            nameEn: pm.nameEn,
            total: 0,
            count: 0
        };
    });

    filtered.forEach(o => {
        const pm = (o.payMethod || '').toLowerCase();
        let matched = paymentMethods.find(m => pm.includes(m.nameAr.toLowerCase()) || pm.includes(m.nameEn.toLowerCase()) || pm.includes(m.id));
        if (!matched) matched = paymentMethods[0];
        if (matched && payTotals[matched.id]) {
            payTotals[matched.id].total += (Number(o.grandTotal) || 0);
            payTotals[matched.id].count += 1;
        }
    });

    const rows = Object.values(payTotals);

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'تقرير طرق الدفع' : 'Payment Type Report')}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>${currentLang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</th>
                                <th>${currentLang === 'ar' ? 'عدد العمليات' : 'Transactions'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map((r, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>${escapeHtml(currentLang === 'ar' ? r.nameAr : r.nameEn)}</strong></td>
                                    <td><span class="badge-pill">${r.count}</span></td>
                                    <td class="text-end fw-bold">${formatCurrency(r.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 11. BALANCING PAYMENT METHODS (Live editable & saved history)
function renderBalancingPayments(container) {
    const filtered = getFilteredOrders();
    const defaultTotals = {
        'cash': 850.00,
        'mada_1': 1420.00,
        'mada_2': 980.00,
        'visa': 450.00,
        'apps': 1200.00
    };

    // Calculate actual orders totals if present
    filtered.forEach(o => {
        const m = (o.payMethod || '').toLowerCase();
        if (m.includes('mada') && m.includes('2')) defaultTotals['mada_2'] += Number(o.grandTotal) || 0;
        else if (m.includes('mada')) defaultTotals['mada_1'] += Number(o.grandTotal) || 0;
        else if (m.includes('visa')) defaultTotals['visa'] += Number(o.grandTotal) || 0;
        else if (m.includes('app')) defaultTotals['apps'] += Number(o.grandTotal) || 0;
        else defaultTotals['cash'] += Number(o.grandTotal) || 0;
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
                            ${paymentMethods.map(pm => {
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
    const appData = applications.map(app => {
        const total = 1850.00;
        const returns = 50.00;
        const net = total - returns;
        const actual = appReviewInputs[app.id] !== undefined ? appReviewInputs[app.id] : net;
        const diff = actual - net;

        return {
            id: app.id,
            nameAr: app.nameAr,
            nameEn: app.nameEn,
            total,
            returns,
            net,
            actual,
            diff
        };
    });

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'مراجعة بيانات التطبيقات' : 'Applications Data Review')}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>${currentLang === 'ar' ? 'التطبيق' : 'Application'}</th>
                                <th>${currentLang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                                <th>${currentLang === 'ar' ? 'المرتجعات' : 'Returns'}</th>
                                <th>${currentLang === 'ar' ? 'الصافي' : 'Net Total'}</th>
                                <th style="width: 170px;">${currentLang === 'ar' ? 'المبلغ الفعلي' : 'Actual'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'الفارق' : 'Difference'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${appData.map(a => `
                                <tr>
                                    <td><strong>${escapeHtml(currentLang === 'ar' ? a.nameAr : a.nameEn)}</strong></td>
                                    <td>${formatCurrency(a.total)}</td>
                                    <td class="text-danger">${formatCurrency(a.returns)}</td>
                                    <td class="fw-bold">${formatCurrency(a.net)}</td>
                                    <td>
                                        <input type="number" step="0.01" class="form-control form-control-sm" 
                                            value="${a.actual}" 
                                            oninput="onAppReviewInputChange('${a.id}', ${a.net}, this.value)">
                                    </td>
                                    <td class="text-end fw-bold ${a.diff === 0 ? 'text-success' : 'text-danger'}" id="appdiff_${a.id}">
                                        ${formatCurrency(a.diff)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
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
    if (typeof toggleSideDrawer === 'function') {
        toggleSideDrawer();
    }
}
window.openReportsModal = openReportsModal;

