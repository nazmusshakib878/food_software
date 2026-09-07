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

// Ensure Rich Realistic Past Orders if orders list is empty
function ensureSeedOrders() {
    if (orders && orders.length > 0) return;

    const dummyOrders = [
        {
            id: "ORD-1001",
            seq: 1001,
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

    orders = dummyOrders;
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

    // Highlight active link in side drawer
    document.querySelectorAll('.drawer-menu-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-report-id') === activeReportModule);
    });

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
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.length === 0 ? `
                                <tr><td colspan="8" class="text-center py-4 text-muted">${currentLang === 'ar' ? 'لا توجد فواتير في هذه الفترة' : 'No invoices found'}</td></tr>
                            ` : filtered.map((o, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>#${escapeHtml(o.seq || o.id)}</strong></td>
                                    <td><span class="badge-subtle">${escapeHtml(o.orderType || 'محلي')}</span></td>
                                    <td><span class="badge-subtle">${escapeHtml(o.payMethod || 'Cash')}</span></td>
                                    <td>${escapeHtml(o.customer || 'عميل نقدي')}</td>
                                    <td>${escapeHtml(o.cashier || 'الكاشير')}</td>
                                    <td>${o.date ? new Date(o.date).toLocaleString(currentLang === 'ar' ? 'ar-SA' : 'en-US') : '-'}</td>
                                    <td class="text-end fw-bold">${formatCurrency(o.grandTotal)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 2. ITEMS REPORT
function renderItemsReport(container) {
    const filtered = getFilteredOrders();
    const itemMap = {};

    filtered.forEach(o => {
        if (o.items && Array.isArray(o.items)) {
            o.items.forEach(it => {
                const key = it.id || it.name;
                if (!itemMap[key]) {
                    itemMap[key] = {
                        nameAr: it.arName || it.name,
                        nameEn: it.enName || it.name,
                        qty: 0,
                        totalVal: 0,
                        returnsQty: 0
                    };
                }
                const q = Number(it.qty) || 1;
                const p = Number(it.price) || 0;
                itemMap[key].qty += q;
                itemMap[key].totalVal += (q * p);
            });
        }
    });

    const rows = Object.values(itemMap);

    container.innerHTML = `
        ${renderReportHeader(currentLang === 'ar' ? 'تقرير الأصناف والمبيعات' : 'Items Report')}
        <div class="report-printable-area">
            <div class="report-table-card">
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>${currentLang === 'ar' ? 'الصنف' : 'Item'}</th>
                                <th>${currentLang === 'ar' ? 'الكمية المباعة' : 'Quantity Sold'}</th>
                                <th>${currentLang === 'ar' ? 'قيمة المبيعات' : 'Sales Value'}</th>
                                <th>${currentLang === 'ar' ? 'المرتجع' : 'Returns'}</th>
                                <th class="text-end">${currentLang === 'ar' ? 'صافي القيمة' : 'Net Value'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.length === 0 ? `
                                <tr><td colspan="6" class="text-center py-4 text-muted">${currentLang === 'ar' ? 'لا توجد أصناف مباعة في الفترة المحددة' : 'No items sold in selected period'}</td></tr>
                            ` : rows.map((r, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>${escapeHtml(currentLang === 'ar' ? r.nameAr : r.nameEn)}</strong></td>
                                    <td><span class="badge-pill">${r.qty}</span></td>
                                    <td>${formatCurrency(r.totalVal)}</td>
                                    <td>0</td>
                                    <td class="text-end fw-bold">${formatCurrency(r.totalVal)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
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

