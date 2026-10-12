/* =========================================================
   SHIFTS.JS - Cashier & Branch Shift Management
   Matches POS reference video workflow & visual structure
   ========================================================= */

// Ensure shifts state is initialized
function getShiftsCollection() {
    if (typeof shifts === 'undefined' || !Array.isArray(shifts)) {
        try {
            const saved = JSON.parse(localStorage.getItem('nurpos_shifts') || 'null');
            if (Array.isArray(saved) && saved.length > 0) {
                window.shifts = saved;
            } else if (typeof DEFAULT_SHIFTS !== 'undefined' && Array.isArray(DEFAULT_SHIFTS)) {
                window.shifts = JSON.parse(JSON.stringify(DEFAULT_SHIFTS));
            } else {
                window.shifts = [];
            }
        } catch (e) {
            window.shifts = (typeof DEFAULT_SHIFTS !== 'undefined') ? JSON.parse(JSON.stringify(DEFAULT_SHIFTS)) : [];
        }
    }

    // Sync active shift with nurpos_current_shift if created from new_shift.html
    try {
        const curShift = JSON.parse(localStorage.getItem('nurpos_current_shift') || 'null');
        if (curShift && curShift.startedAt) {
            const hasShift = window.shifts.some(s => s.status === 'active' && (s.cashier === curShift.name || s.cashier === curShift.englishName));
            if (!hasShift && window.shifts.length > 0) {
                const activeExisting = window.shifts.find(s => s.status === 'active');
                if (activeExisting) {
                    activeExisting.cashier = curShift.name || curShift.englishName || activeExisting.cashier;
                    activeExisting.openingCash = Number(curShift.openingCash) || activeExisting.openingCash;
                }
            }
        }
    } catch (e) {}

    return window.shifts;
}

// Format date and time matching the reference video display
function formatShiftDisplayDate(dateStr) {
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

        // Reference video shows: PM 12:37 12/10/2026 or 12/10/2026 12:37 PM
        return `${ampm} ${formattedHours}:${minutes} ${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
}

// Get all orders belonging to a specific shift
function getOrdersForShift(shift) {
    if (!shift) return [];
    const allOrders = (typeof orders !== 'undefined' && Array.isArray(orders)) ? orders : [];
    
    return allOrders.filter(o => {
        // Direct shiftId match
        if (o.shiftId && o.shiftId === shift.id) return true;
        
        // Cashier match if shiftId is not set
        if (!o.shiftId) {
            const cashierMatch = (o.cashier === shift.cashier || 
                                  o.cashier === shift.cashierEn || 
                                  o.cashier === shift.cashierAr);
            if (cashierMatch) return true;
        }

        // Time window match if shift is closed
        if (shift.openedAt && shift.closedAt && o.date) {
            const oTime = new Date(o.date).getTime();
            const sOpen = new Date(shift.openedAt).getTime();
            const sClose = new Date(shift.closedAt).getTime();
            if (!isNaN(oTime) && !isNaN(sOpen) && !isNaN(sClose)) {
                if (oTime >= sOpen && oTime <= sClose) return true;
            }
        }

        return false;
    });
}

// Calculate comprehensive financials for a shift
function calculateShiftFinancials(shift) {
    const shiftOrders = getOrdersForShift(shift);
    const validOrders = shiftOrders.filter(o => o.status !== 'cancelled');
    const cancelledOrders = shiftOrders.filter(o => o.status === 'cancelled');

    const ordersCount = validOrders.length;
    const grossSales = validOrders.reduce((sum, o) => sum + (Number(o.subtotal || o.total) || 0), 0);
    const discountsTotal = validOrders.reduce((sum, o) => sum + (Number(o.discount) || 0), 0);
    const taxTotal = validOrders.reduce((sum, o) => sum + (Number(o.tax) || 0), 0);
    const netSales = validOrders.reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0);

    const cashTotal = validOrders
        .filter(o => (o.method || o.paymentMethod || '').toLowerCase().includes('cash') || (o.method || '').includes('نقدي'))
        .reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0);

    const cardTotal = validOrders
        .filter(o => (o.method || o.paymentMethod || '').toLowerCase().includes('card') || (o.method || '').includes('مدى') || (o.method || '').includes('شبكة'))
        .reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0);

    const onlineTotal = validOrders
        .filter(o => (o.method || o.paymentMethod || '').toLowerCase().includes('online') || (o.method || o.paymentMethod || '').toLowerCase().includes('transfer') || (o.method || '').includes('تطبيق'))
        .reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0);

    const openingCash = Number(shift.openingCash) || 0;
    const expectedDrawerCash = openingCash + cashTotal;

    return {
        ordersCount,
        cancelledCount: cancelledOrders.length,
        grossSales,
        discountsTotal,
        taxTotal,
        netSales,
        cashTotal,
        cardTotal,
        onlineTotal,
        openingCash,
        expectedDrawerCash,
        shiftOrders
    };
}

// Render the main Shifts Screen matching the reference video
function renderShiftsScreen() {
    const container = document.getElementById('shiftsView');
    if (!container) return;

    const currentShifts = getShiftsCollection();
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    container.innerHTML = `
        <!-- Shifts Header -->
        <header class="shifts-header">
            <button type="button" class="shifts-back-btn" onclick="switchView('pos')" title="${isAr ? 'العودة لنقطة البيع' : 'Back to POS'}">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <h1 class="shifts-title">${isAr ? 'الورديات' : 'Shifts'}</h1>
            <div class="shifts-header-spacer"></div>
        </header>

        <!-- Main Content Area -->
        <main class="shifts-main-content" id="shiftsMainContent">
            <!-- Shifts List Card -->
            <div class="shifts-card">
                ${currentShifts.map(sh => {
                    const isClosed = sh.status === 'closed';
                    const cashierName = isAr ? (sh.cashierAr || sh.cashier) : (sh.cashierEn || sh.cashier);
                    const openTimeStr = formatShiftDisplayDate(sh.openedAt);
                    const closeTimeStr = sh.closedAt ? formatShiftDisplayDate(sh.closedAt) : '';

                    return `
                        <div class="shift-row" id="shift_row_${sh.id}">
                            <!-- Left: Action Pill Buttons -->
                            <div class="shift-actions">
                                <button type="button" 
                                        class="shift-pill-btn btn-close-shift ${isClosed ? 'is-closed' : ''}" 
                                        onclick="handleShiftCloseClick('${sh.id}')"
                                        title="${isClosed ? (isAr ? 'الوردية مغلقة بالفعل' : 'Shift already closed') : (isAr ? 'إغلاق الوردية' : 'Close Shift')}">
                                    ${isAr ? 'إغلاق الوردية' : 'Close Shift'}
                                </button>
                                <button type="button" 
                                        class="shift-pill-btn" 
                                        onclick="printShiftReport('${sh.id}')"
                                        title="${isAr ? 'طباعة تقرير الوردية' : 'Print Shift Report'}">
                                    ${isAr ? 'طباعة الوردية' : 'Print Shift'}
                                </button>
                                <button type="button" 
                                        class="shift-pill-btn" 
                                        onclick="viewShiftInvoices('${sh.id}')"
                                        title="${isAr ? 'عرض فواتير الوردية' : 'View Shift Invoices'}">
                                    ${isAr ? 'عرض الفواتير' : 'View Invoices'}
                                </button>
                            </div>

                            <!-- Right: Shift Information -->
                            <div class="shift-meta">
                                <div class="shift-cashier-name">${escapeHtml(cashierName)}</div>
                                <div class="shift-date-time">${openTimeStr}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Bottom Action Buttons (Direct Match to Reference) -->
            <div class="shifts-bottom-bar">
                <button type="button" class="btn-close-branch" onclick="confirmCloseBranchShifts()">
                    ${isAr ? 'إغلاق ورديات الفرع' : 'Close Branch Shifts'}
                </button>
                <button type="button" class="btn-print-branch" onclick="printBranchShiftsSummary()">
                    ${isAr ? 'طباعة' : 'Print'}
                </button>
            </div>
        </main>

        <!-- Shift Invoices Container (Nested View) -->
        <section class="shift-invoices-view" id="shiftInvoicesSubView"></section>

        <!-- Confirmation Modal -->
        <div class="shift-modal-overlay" id="shiftConfirmModalOverlay" onclick="closeShiftModal(event)">
            <div class="shift-modal-card" id="shiftModalCard">
                <h3 class="shift-modal-title" id="shiftModalTitle"></h3>
                <p class="shift-modal-msg" id="shiftModalMsg"></p>
                <div class="shift-modal-actions">
                    <button type="button" class="shift-modal-btn-cancel" onclick="closeShiftModal()">${isAr ? 'إلغاء' : 'Cancel'}</button>
                    <button type="button" class="shift-modal-btn-confirm" id="shiftModalConfirmBtn">${isAr ? 'تأكيد' : 'Confirm'}</button>
                </div>
            </div>
        </div>
    `;
}

// Handle Close Shift button click
function handleShiftCloseClick(shiftId) {
    const currentShifts = getShiftsCollection();
    const shift = currentShifts.find(s => s.id === shiftId);
    if (!shift) return;

    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    if (shift.status === 'closed') {
        if (typeof showToast === 'function') {
            showToast(isAr ? `الوردية (${shift.id}) مغلقة مسبقاً` : `Shift (${shift.id}) is already closed`, 'info');
        }
        return;
    }

    confirmCloseShift(shiftId);
}

// Show confirm modal for single shift close
function confirmCloseShift(shiftId) {
    const currentShifts = getShiftsCollection();
    const shift = currentShifts.find(s => s.id === shiftId);
    if (!shift) return;

    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    const cashierName = isAr ? (shift.cashierAr || shift.cashier) : (shift.cashierEn || shift.cashier);

    const titleEl = document.getElementById('shiftModalTitle');
    const msgEl = document.getElementById('shiftModalMsg');
    const confirmBtn = document.getElementById('shiftModalConfirmBtn');
    const overlay = document.getElementById('shiftConfirmModalOverlay');

    if (titleEl) titleEl.innerText = isAr ? `إغلاق الوردية (${shift.id})` : `Close Shift (${shift.id})`;
    if (msgEl) {
        msgEl.innerText = isAr 
            ? `هل أنت متأكد من رغبتك في إغلاق الوردية للمستخدم (${cashierName})؟ سيتم حفظ التوقيت وإجمالي المبيعات دون حذف أي بيانات.`
            : `Are you sure you want to close the shift for (${cashierName})? Closing timestamp and totals will be saved without deleting any records.`;
    }

    if (confirmBtn) {
        confirmBtn.onclick = () => {
            closeShiftModal();
            executeCloseShift(shiftId);
        };
    }

    overlay?.classList.add('open');
}

// Execute single shift closing
function executeCloseShift(shiftId) {
    const currentShifts = getShiftsCollection();
    const shift = currentShifts.find(s => s.id === shiftId);
    if (!shift) return;

    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    const financials = calculateShiftFinancials(shift);

    shift.status = 'closed';
    shift.closedAt = new Date().toISOString();
    shift.finalSalesTotal = financials.netSales;
    shift.finalCashTotal = financials.cashTotal;
    shift.finalCardTotal = financials.cardTotal;
    shift.finalOrdersCount = financials.ordersCount;
    shift.closingCash = financials.expectedDrawerCash;

    // Synchronize local storage
    localStorage.setItem('nurpos_shifts', JSON.stringify(currentShifts));
    if (typeof persistData === 'function') persistData();

    // If current logged-in shift matches, mark it closed
    try {
        const curShift = JSON.parse(localStorage.getItem('nurpos_current_shift') || 'null');
        if (curShift && (curShift.name === shift.cashier || curShift.englishName === shift.cashier)) {
            curShift.status = 'closed';
            curShift.closedAt = shift.closedAt;
            localStorage.setItem('nurpos_current_shift', JSON.stringify(curShift));
        }
    } catch (e) {}

    if (typeof soundSuccess === 'function') soundSuccess();
    if (typeof showToast === 'function') {
        showToast(isAr ? `تم إغلاق الوردية (${shift.id}) بنجاح` : `Shift (${shift.id}) closed successfully`, 'success');
    }

    renderShiftsScreen();
}

// Confirm Close Branch Shifts
function confirmCloseBranchShifts() {
    const currentShifts = getShiftsCollection();
    const activeShifts = currentShifts.filter(s => s.status === 'active');
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    if (activeShifts.length === 0) {
        if (typeof showToast === 'function') {
            showToast(isAr ? 'لا توجد ورديات نشطة حالياً بالفرع لإغلاقها' : 'No active branch shifts to close', 'info');
        }
        return;
    }

    const titleEl = document.getElementById('shiftModalTitle');
    const msgEl = document.getElementById('shiftModalMsg');
    const confirmBtn = document.getElementById('shiftModalConfirmBtn');
    const overlay = document.getElementById('shiftConfirmModalOverlay');

    if (titleEl) titleEl.innerText = isAr ? 'إغلاق ورديات الفرع' : 'Close Branch Shifts';
    if (msgEl) {
        msgEl.innerText = isAr 
            ? `هل أنت متأكد من إغلاق جميع الورديات النشطة بالفرع (عدد ${activeShifts.length} وردية)؟ سيتم اعتماد الإغلاق المحاسبي لجميع الكاشيرات.`
            : `Are you sure you want to close all active branch shifts (${activeShifts.length} active)? This will finalize accounting totals for all active sessions.`;
    }

    if (confirmBtn) {
        confirmBtn.onclick = () => {
            closeShiftModal();
            executeCloseBranchShifts();
        };
    }

    overlay?.classList.add('open');
}

// Execute Close Branch Shifts
function executeCloseBranchShifts() {
    const currentShifts = getShiftsCollection();
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    let closedCount = 0;

    currentShifts.forEach(shift => {
        if (shift.status === 'active') {
            const financials = calculateShiftFinancials(shift);
            shift.status = 'closed';
            shift.closedAt = new Date().toISOString();
            shift.finalSalesTotal = financials.netSales;
            shift.finalCashTotal = financials.cashTotal;
            shift.finalCardTotal = financials.cardTotal;
            shift.finalOrdersCount = financials.ordersCount;
            shift.closingCash = financials.expectedDrawerCash;
            closedCount += 1;
        }
    });

    localStorage.setItem('nurpos_shifts', JSON.stringify(currentShifts));
    if (typeof persistData === 'function') persistData();

    // Mark current session closed
    try {
        const curShift = JSON.parse(localStorage.getItem('nurpos_current_shift') || 'null');
        if (curShift) {
            curShift.status = 'closed';
            curShift.closedAt = new Date().toISOString();
            localStorage.setItem('nurpos_current_shift', JSON.stringify(curShift));
        }
    } catch (e) {}

    if (typeof soundSuccess === 'function') soundSuccess();
    if (typeof showToast === 'function') {
        showToast(isAr ? `تم إغلاق ${closedCount} وردية نشطة بالفرع بنجاح` : `Successfully closed ${closedCount} active branch shift(s)`, 'success');
    }

    renderShiftsScreen();
}

function closeShiftModal(event) {
    if (event && event.target && event.target.id !== 'shiftConfirmModalOverlay') return;
    document.getElementById('shiftConfirmModalOverlay')?.classList.remove('open');
}

// Print single Shift Report via Reports Printer
function printShiftReport(shiftId) {
    const currentShifts = getShiftsCollection();
    const shift = currentShifts.find(s => s.id === shiftId);
    if (!shift) return;

    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    const f = calculateShiftFinancials(shift);

    const storeTitle = (typeof storeSettings !== 'undefined' && (storeSettings.companyName || storeSettings.companyNameAr || storeSettings.nameAr)) 
        ? (storeSettings.companyName || storeSettings.companyNameAr || storeSettings.nameAr) 
        : 'شركة صح للتجارة';
    const branchTitle = (typeof storeSettings !== 'undefined' && (storeSettings.nameAr || storeSettings.nameEn)) 
        ? (storeSettings.nameAr || storeSettings.nameEn) 
        : 'نور فودز';
    const vatNum = (typeof storeSettings !== 'undefined' && storeSettings.vatNumber) ? storeSettings.vatNumber : '300987654300003';
    const cashierName = isAr ? (shift.cashierAr || shift.cashier) : (shift.cashierEn || shift.cashier);
    const statusText = shift.status === 'closed' ? (isAr ? 'مغلقة' : 'Closed') : (isAr ? 'نشطة' : 'Active');

    const html = `
        <div style="font-family: 'Courier New', 'Cairo', monospace, sans-serif; font-size: 13px; line-height: 1.45; color: #000; padding: 10px; width: 100%; box-sizing: border-box;">
            <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px;">
                <h2 style="margin: 0 0 4px 0; font-size: 17px; font-weight: bold;">${escapeHtml(storeTitle)}</h2>
                <div style="font-size: 13px;">${escapeHtml(branchTitle)}</div>
                <div style="font-size: 12px; margin-top: 2px;">الرقم الضريبي: ${escapeHtml(vatNum)}</div>
                <h3 style="margin: 8px 0 2px 0; font-size: 15px; border-top: 1px solid #000; padding-top: 6px;">
                    ${isAr ? 'تقرير الوردية - وردية كاشير' : 'Cashier Shift Report'}
                </h3>
            </div>

            <div style="margin-bottom: 8px; font-size: 12.5px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'رقم الوردية:' : 'Shift ID:'}</span>
                    <strong>${escapeHtml(shift.id)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'الكاشير / المستخدم:' : 'Cashier / User:'}</span>
                    <strong>${escapeHtml(cashierName)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'الحالة:' : 'Status:'}</span>
                    <strong>${statusText}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'بداية الوردية:' : 'Opened At:'}</span>
                    <span>${formatShiftDisplayDate(shift.openedAt)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'نهاية الوردية:' : 'Closed At:'}</span>
                    <span>${shift.closedAt ? formatShiftDisplayDate(shift.closedAt) : (isAr ? 'قيد التشغيل' : 'In Progress')}</span>
                </div>
            </div>

            <div style="border-top: 1px dashed #000; padding-top: 6px; margin-bottom: 8px;">
                <div style="font-weight: bold; margin-bottom: 4px; text-decoration: underline;">
                    ${isAr ? 'ملخص العمليات والمبيعات:' : 'Sales & Orders Summary:'}
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'عدد الفواتير المنفذة:' : 'Completed Orders:'}</span>
                    <span>${f.ordersCount}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'إجمالي المبيعات (قبل الخصم):' : 'Gross Sales:'}</span>
                    <span>${formatCurrency(f.grossSales)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'إجمالي الخصومات:' : 'Total Discounts:'}</span>
                    <span>${formatCurrency(f.discountsTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'ضريبة القيمة المضافة (15%):' : 'VAT (15%):'}</span>
                    <span>${formatCurrency(f.taxTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
                    <span>${isAr ? 'صافي المبيعات (شامل الضريبة):' : 'Net Sales (Inc. VAT):'}</span>
                    <span>${formatCurrency(f.netSales)}</span>
                </div>
            </div>

            <div style="border-top: 1px dashed #000; padding-top: 6px; margin-bottom: 8px;">
                <div style="font-weight: bold; margin-bottom: 4px; text-decoration: underline;">
                    ${isAr ? 'طرق الدفع والتحصيل:' : 'Payment Methods Breakdown:'}
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'نقدي (Cash):' : 'Cash Total:'}</span>
                    <span>${formatCurrency(f.cashTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'بطاقة مدى / شبكة:' : 'Card / Mada:'}</span>
                    <span>${formatCurrency(f.cardTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'تطبيقات / تحويل:' : 'Online / Apps:'}</span>
                    <span>${formatCurrency(f.onlineTotal)}</span>
                </div>
            </div>

            <div style="border-top: 1px dashed #000; padding-top: 6px; margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 4px; text-decoration: underline;">
                    ${isAr ? 'مطابقة صندوق الكاشير (الدرج):' : 'Cash Drawer Reconciliation:'}
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'رصيد العهدة الافتتاحي:' : 'Opening Cash Balance:'}</span>
                    <span>${formatCurrency(f.openingCash)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'مبيعات الكاش النقدية:' : 'Cash Sales Received:'}</span>
                    <span>${formatCurrency(f.cashTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13.5px; border-top: 1px solid #000; padding-top: 4px; margin-top: 3px;">
                    <span>${isAr ? 'النقد المتوقع بالدرج:' : 'Expected Drawer Cash:'}</span>
                    <span>${formatCurrency(f.expectedDrawerCash)}</span>
                </div>
            </div>

            <div style="text-align: center; border-top: 2px dashed #000; padding-top: 8px; font-size: 11px; color: #333;">
                <div>تاريخ الطباعة: ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</div>
                <div style="margin-top: 4px;">طابعة التقارير والمحاسبة (Reports Printer)</div>
            </div>
        </div>
    `;

    if (typeof routePrintJob === 'function') {
        routePrintJob('reports', html, `Shift Report - ${shift.id}`);
    } else {
        window.print();
    }
}

// Print Branch Shifts Summary Report via Reports Printer
function printBranchShiftsSummary() {
    const currentShifts = getShiftsCollection();
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    const storeTitle = (typeof storeSettings !== 'undefined' && (storeSettings.companyName || storeSettings.companyNameAr || storeSettings.nameAr)) 
        ? (storeSettings.companyName || storeSettings.companyNameAr || storeSettings.nameAr) 
        : 'شركة صح للتجارة';
    const branchTitle = (typeof storeSettings !== 'undefined' && (storeSettings.nameAr || storeSettings.nameEn)) 
        ? (storeSettings.nameAr || storeSettings.nameEn) 
        : 'نور فودز';
    const vatNum = (typeof storeSettings !== 'undefined' && storeSettings.vatNumber) ? storeSettings.vatNumber : '300987654300003';

    let totalOrders = 0;
    let totalGross = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    let totalNet = 0;
    let totalCash = 0;
    let totalCard = 0;
    let totalOnline = 0;

    const shiftRowsHtml = currentShifts.map(sh => {
        const f = calculateShiftFinancials(sh);
        totalOrders += f.ordersCount;
        totalGross += f.grossSales;
        totalDiscounts += f.discountsTotal;
        totalTax += f.taxTotal;
        totalNet += f.netSales;
        totalCash += f.cashTotal;
        totalCard += f.cardTotal;
        totalOnline += f.onlineTotal;

        const name = isAr ? (sh.cashierAr || sh.cashier) : (sh.cashierEn || sh.cashier);
        const status = sh.status === 'closed' ? (isAr ? 'مغلقة' : 'Closed') : (isAr ? 'نشطة' : 'Active');

        return `
            <tr style="border-bottom: 1px dotted #ccc;">
                <td style="padding: 4px 2px;"><strong>${escapeHtml(sh.id)}</strong><br><small>${escapeHtml(name)}</small></td>
                <td style="padding: 4px 2px; text-align: center;">${status}<br><small>${f.ordersCount} طلب</small></td>
                <td style="padding: 4px 2px; text-align: right; font-weight: bold;">${formatCurrency(f.netSales)}</td>
            </tr>
        `;
    }).join('');

    const html = `
        <div style="font-family: 'Courier New', 'Cairo', monospace, sans-serif; font-size: 13px; line-height: 1.45; color: #000; padding: 10px; width: 100%; box-sizing: border-box;">
            <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px;">
                <h2 style="margin: 0 0 4px 0; font-size: 17px; font-weight: bold;">${escapeHtml(storeTitle)}</h2>
                <div style="font-size: 13px;">${escapeHtml(branchTitle)}</div>
                <div style="font-size: 12px; margin-top: 2px;">الرقم الضريبي: ${escapeHtml(vatNum)}</div>
                <h3 style="margin: 8px 0 2px 0; font-size: 15px; border-top: 1px solid #000; padding-top: 6px;">
                    ${isAr ? 'ملخص ورديات الفرع الإجمالي' : 'Branch Shifts Summary Report'}
                </h3>
                <div style="font-size: 12px;">التاريخ: ${new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</div>
            </div>

            <div style="margin-bottom: 8px;">
                <div style="font-weight: bold; margin-bottom: 6px; text-decoration: underline;">
                    ${isAr ? 'تفاصيل الورديات المسجلة:' : 'Registered Shifts:'}
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px;">
                    <thead>
                        <tr style="border-bottom: 1px solid #000; background-color: #f5f5f5;">
                            <th style="padding: 4px 2px; text-align: left;">${isAr ? 'الوردية / الكاشير' : 'Shift / Cashier'}</th>
                            <th style="padding: 4px 2px; text-align: center;">${isAr ? 'الحالة' : 'Status'}</th>
                            <th style="padding: 4px 2px; text-align: right;">${isAr ? 'المبيعات' : 'Sales'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shiftRowsHtml}
                    </tbody>
                </table>
            </div>

            <div style="border-top: 2px solid #000; padding-top: 6px; margin-bottom: 8px;">
                <div style="font-weight: bold; margin-bottom: 4px; text-decoration: underline;">
                    ${isAr ? 'الإجمالي الكلي لجميع ورديات الفرع:' : 'Overall Branch Totals:'}
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'إجمالي عدد الفواتير:' : 'Total Orders:'}</span>
                    <strong>${totalOrders}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'إجمالي المبيعات (قبل الخصم):' : 'Gross Sales:'}</span>
                    <span>${formatCurrency(totalGross)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'إجمالي الخصومات:' : 'Total Discounts:'}</span>
                    <span>${formatCurrency(totalDiscounts)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'إجمالي الضريبة (15%):' : 'Total VAT (15%):'}</span>
                    <span>${formatCurrency(totalTax)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14.5px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
                    <span>${isAr ? 'صافي مبيعات الفرع:' : 'Net Branch Sales:'}</span>
                    <span>${formatCurrency(totalNet)}</span>
                </div>
            </div>

            <div style="border-top: 1px dashed #000; padding-top: 6px; margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 4px; text-decoration: underline;">
                    ${isAr ? 'إجمالي التحصيل حسب طريقة الدفع:' : 'Collection by Payment Method:'}
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'نقدي (Cash):' : 'Total Cash:'}</span>
                    <span>${formatCurrency(totalCash)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'بطاقات مدى / شبكة:' : 'Total Mada / Card:'}</span>
                    <span>${formatCurrency(totalCard)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>${isAr ? 'تطبيقات توصيل / تحويل:' : 'Total Online / Apps:'}</span>
                    <span>${formatCurrency(totalOnline)}</span>
                </div>
            </div>

            <div style="text-align: center; border-top: 2px dashed #000; padding-top: 8px; font-size: 11px; color: #333;">
                <div>تاريخ الطباعة: ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US')}</div>
                <div style="margin-top: 4px;">طابعة تقارير الإدارة والمحاسبة (Reports Printer)</div>
            </div>
        </div>
    `;

    if (typeof routePrintJob === 'function') {
        routePrintJob('reports', html, 'Branch Shifts Summary');
    } else {
        window.print();
    }
}

// View Invoices belonging to a single shift
function viewShiftInvoices(shiftId) {
    const currentShifts = getShiftsCollection();
    const shift = currentShifts.find(s => s.id === shiftId);
    if (!shift) return;

    const mainContent = document.getElementById('shiftsMainContent');
    const subView = document.getElementById('shiftInvoicesSubView');
    if (!mainContent || !subView) return;

    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    const f = calculateShiftFinancials(shift);
    const cashierName = isAr ? (shift.cashierAr || shift.cashier) : (shift.cashierEn || shift.cashier);

    mainContent.style.display = 'none';
    const mainHeader = document.querySelector('.shifts-header');
    if (mainHeader) mainHeader.style.display = 'none';
    subView.classList.add('active');

    subView.innerHTML = `
        <div class="shift-invoices-header">
            <button type="button" class="shifts-back-btn" onclick="backToShiftsList()" title="${isAr ? 'العودة لقائمة الورديات' : 'Back to Shifts'}">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <h2 class="shifts-title" style="font-size: 20px;">
                ${isAr ? `فواتير الوردية ${shift.id} (${cashierName})` : `Shift ${shift.id} Invoices (${cashierName})`}
            </h2>
            <button type="button" class="shift-pill-btn" onclick="printShiftReport('${shift.id}')">
                <i class="fa-solid fa-print"></i> ${isAr ? 'طباعة تقرير' : 'Print Report'}
            </button>
        </div>

        <div style="padding: 0 24px 24px; max-width: 1280px; width: 100%; margin: 0 auto; overflow-y: auto; flex: 1;">
            <!-- Summary Badges -->
            <div class="shift-invoices-summary-cards">
                <div class="shift-summary-card">
                    <span class="card-lbl">${isAr ? 'عدد الفواتير' : 'Invoices Count'}</span>
                    <span class="card-val">${f.ordersCount}</span>
                </div>
                <div class="shift-summary-card highlight">
                    <span class="card-lbl">${isAr ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                    <span class="card-val">${formatCurrency(f.netSales)}</span>
                </div>
                <div class="shift-summary-card">
                    <span class="card-lbl">${isAr ? 'المبيعات النقدية' : 'Cash Sales'}</span>
                    <span class="card-val">${formatCurrency(f.cashTotal)}</span>
                </div>
                <div class="shift-summary-card">
                    <span class="card-lbl">${isAr ? 'مبيعات مدى / بطاقات' : 'Card / Mada'}</span>
                    <span class="card-val">${formatCurrency(f.cardTotal)}</span>
                </div>
            </div>

            <!-- Invoices Table -->
            <div class="shift-invoices-table-card">
                ${f.shiftOrders.length === 0 ? `
                    <div style="text-align: center; padding: 48px 20px; color: #6b7280;">
                        <i class="fa-solid fa-receipt" style="font-size: 40px; margin-bottom: 12px; color: #9ca3af;"></i>
                        <p style="font-size: 16px; margin: 0;">${isAr ? 'لا توجد فواتير مسجلة ضمن هذه الوردية حالياً' : 'No invoices recorded for this shift yet'}</p>
                    </div>
                ` : `
                    <table class="shift-invoices-table">
                        <thead>
                            <tr>
                                <th>${isAr ? 'رقم الفاتورة' : 'Invoice ID'}</th>
                                <th>${isAr ? 'الوقت' : 'Time'}</th>
                                <th>${isAr ? 'العميل' : 'Customer'}</th>
                                <th>${isAr ? 'النوع' : 'Type'}</th>
                                <th>${isAr ? 'طريقة الدفع' : 'Payment'}</th>
                                <th>${isAr ? 'المبلغ' : 'Amount'}</th>
                                <th style="text-align: center;">${isAr ? 'معاينة' : 'Receipt'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${f.shiftOrders.map(o => `
                                <tr>
                                    <td><strong>${escapeHtml(o.id)}</strong></td>
                                    <td>${o.dateFormatted || formatShiftDisplayDate(o.date)}</td>
                                    <td>${escapeHtml(o.customer || (isAr ? 'عميل نقدي' : 'Cash Customer'))}</td>
                                    <td>${escapeHtml(o.orderType || o.type || '-')}</td>
                                    <td>${escapeHtml(o.method || o.paymentMethod || '-')}</td>
                                    <td style="font-weight: bold; color: #14918e;">${formatCurrency(o.grandTotal || o.total || 0)}</td>
                                    <td style="text-align: center;">
                                        <button type="button" 
                                                class="btn btn-sm btn-outline-info" 
                                                style="border-radius: 8px; padding: 4px 10px;"
                                                onclick="previewExistingOrderReceipt('${o.id}')"
                                                title="${isAr ? 'معاينة الفاتورة' : 'View Receipt'}">
                                            <i class="fa-solid fa-receipt"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
    `;
}

// Return from Invoices Sub-view to Shifts list
function backToShiftsList() {
    const mainContent = document.getElementById('shiftsMainContent');
    const subView = document.getElementById('shiftInvoicesSubView');
    if (subView) {
        subView.classList.remove('active');
        subView.innerHTML = '';
    }
    if (mainContent) {
        mainContent.style.display = 'flex';
    }
    const mainHeader = document.querySelector('.shifts-header');
    if (mainHeader) mainHeader.style.display = 'flex';
}
