/* =========================================================
   SHIFTS.JS - Cashier & Branch Shift Management
   Matches POS reference video workflow & visual structure
   ========================================================= */

// Ensure shifts state is initialized
function getShiftsCollection() {
    return (typeof shifts !== 'undefined' && Array.isArray(shifts)) ? shifts : [];
}

let closingShiftId = null;
let currentShiftReport = null;
let branchCloseInProgress = false;

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

    const currentShifts = getShiftsCollection().filter(shift => {
        return String(shift.companyId ?? shift.company_id ?? '') === String(currentUser?.companyId ?? '') &&
            String(shift.branchId ?? shift.branch_id ?? '') === String(currentUser?.branchId ?? '');
    });
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    const mayManageBranch = typeof canManageBranchShifts === 'function' && canManageBranchShifts();
    const rows = currentShifts.length ? currentShifts.map(shift => {
        const isClosed = shift.status === 'closed';
        const ownerName = isAr ? (shift.cashierAr || shift.cashier || '') : (shift.cashierEn || shift.cashier || '');
        const statusLabel = isClosed ? (isAr ? 'الوردية مغلقة' : 'Closed Shift') : (isAr ? 'إغلاق الوردية' : 'Close Shift');
        return `
            <div class="shift-row" id="shift_row_${escapeHtml(shift.id)}">
                <div class="shift-actions">
                    <button type="button" class="shift-pill-btn btn-close-shift ${isClosed ? 'is-closed' : ''}"
                        ${isClosed || closingShiftId ? 'disabled' : ''}
                        onclick="handleShiftCloseClick('${escapeHtml(shift.id)}')">${statusLabel}</button>
                    <button type="button" class="shift-pill-btn" onclick="printShiftReport('${escapeHtml(shift.id)}')">${isAr ? 'طباعة الوردية' : 'Print Shift'}</button>
                    <button type="button" class="shift-pill-btn" onclick="viewShiftInvoices('${escapeHtml(shift.id)}')">${isAr ? 'عرض الفواتير' : 'View Invoices'}</button>
                </div>
                <div class="shift-meta">
                    <div class="shift-cashier-name">${escapeHtml(ownerName)}</div>
                    <div class="shift-date-time">${formatShiftDisplayDate(shift.openedAt || shift.opened_at)}</div>
                </div>
            </div>`;
    }).join('') : `<div class="shifts-empty-state">${isAr ? 'لا توجد وردية مسجلة لهذا المستخدم.' : 'No shifts are available for this branch.'}</div>`;

    container.innerHTML = `
        <header class="shifts-header">
            <button type="button" class="shifts-back-btn" onclick="switchView('pos')" title="${isAr ? 'العودة لنقطة البيع' : 'Back to POS'}">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <h1 class="shifts-title">${isAr ? 'الورديات' : 'Shifts'}</h1>
            <div class="shifts-header-spacer"></div>
        </header>
        <main class="shifts-main-content" id="shiftsMainContent">
            <div class="shifts-card">${rows}</div>
            <div class="shift-close-loader" id="shiftCloseLoader" role="status" aria-live="polite" aria-label="${isAr ? 'جاري إغلاق الوردية' : 'Closing shift'}" ${closingShiftId ? '' : 'hidden'}>
                <span></span><span></span><span></span>
            </div>
        </main>
        <footer class="shifts-footer" id="shiftsFooter">
            <button type="button" class="btn-close-branch" onclick="confirmCloseBranchShifts()" title="${isAr ? 'إغلاق ورديات الفرع' : 'Close Branch Shifts'}" ${mayManageBranch ? '' : 'hidden'}>
                ${isAr ? 'إغلاق ورديات الفرع' : 'Close Branch Shifts'}
            </button>
            <button type="button" class="btn-print-branch" onclick="printBranchShiftsSummary()" title="${isAr ? 'طباعة' : 'Print'}" ${mayManageBranch ? '' : 'hidden'}>
                ${isAr ? 'طباعة' : 'Print'}
            </button>
        </footer>
        <section class="shift-invoices-view" id="shiftInvoicesSubView"></section>
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

function handleShiftCloseClick(shiftId) {
    const shift = getShiftsCollection().find(item => String(item.id) === String(shiftId));
    if (!shift || shift.status !== 'active' || closingShiftId) return;
    executeCloseShift(shiftId);
}

// Execute single shift closing
async function executeCloseShift(shiftId) {
    const currentShifts = getShiftsCollection();
    const shift = currentShifts.find(s => s.id === shiftId);
    if (!shift || closingShiftId) return;

    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    closingShiftId = shiftId;
    renderShiftsScreen();

    try {
        const response = await fetch(`/api/shifts/${encodeURIComponent(shiftId)}/close`, {
            method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' }
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || `Shift close failed (${response.status})`);

        Object.assign(shift, {
            status: result.shift.status,
            closedAt: result.shift.closed_at,
            openedAt: result.shift.opened_at,
            openingCash: Number(result.shift.opening_cash),
        });
        if (typeof persistData === 'function') persistData();
        closingShiftId = null;
        renderShiftsScreen();
        currentShiftReport = await loadShiftReport(shiftId);
        if (typeof soundSuccess === 'function') soundSuccess();
        showShiftReport(currentShiftReport);
    } catch (error) {
        closingShiftId = null;
        renderShiftsScreen();
        if (typeof showToast === 'function') showToast(error.message || 'Shift service is unavailable.', 'danger');
        return;
    }
}

async function loadShiftReport(shiftId) {
    const response = await fetch(`/api/shifts/${encodeURIComponent(shiftId)}/report`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.shift) throw new Error(result.error || 'Shift report could not be loaded.');
    return result;
}

async function refreshShiftStatuses() {
    try {
        const response = await fetch('/api/shifts', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        if (!response.ok) return false;
        const result = await response.json();
        if (!result.success || !Array.isArray(result.shifts)) return false;
        shifts = result.shifts.map(shift => ({
            id: shift.id, shiftNumber: shift.shift_number, cashier: shift.cashier,
            cashierEn: shift.cashier_en, cashierAr: shift.cashier_ar,
            userId: shift.user_id, staffId: shift.staff_id, companyId: shift.company_id,
            branchId: shift.branch_id, openedAt: shift.opened_at, closedAt: shift.closed_at,
            status: shift.status, openingCash: Number(shift.opening_cash), notes: shift.notes,
        }));
        if (document.getElementById('shiftsView')?.classList.contains('active') &&
            !document.getElementById('shiftInvoicesSubView')?.classList.contains('active') &&
            !document.querySelector('.shift-report-screen')) renderShiftsScreen();
        return true;
    } catch (_) {
        // A transient poll failure leaves the last server-confirmed state visible.
        return false;
    }
}

function showShiftReport(report) {
    const container = document.getElementById('shiftsView');
    if (!container) return;
    const isAr = currentLang === 'ar';
    const shift = report.shift;
    const company = report.company || {};
    const branch = report.branch || {};
    const summary = report.summary || {};
    const creatorName = isAr ? (shift.cashier_ar || shift.cashier) : (shift.cashier_en || shift.cashier);
    const businessName = isAr ? (company.legal_name || company.name) : (company.legal_name || company.name);
    const money = amount => typeof formatCurrency === 'function' ? formatCurrency(Number(amount || 0)) : String(Number(amount || 0).toFixed(2));
    container.innerHTML = `
        <section class="shift-report-screen" aria-labelledby="shiftReportTitle">
            <header class="shift-report-heading">
                <div class="shift-report-brand">Nur Foodes</div>
                <div>${escapeHtml(businessName || '')}</div>
                ${branch.name ? `<div>${escapeHtml(branch.name)}</div>` : ''}
                ${company.tax_number ? `<div>${isAr ? 'الرقم الضريبي' : 'Tax Number'}: ${escapeHtml(company.tax_number)}</div>` : ''}
            </header>
            <h1 id="shiftReportTitle">${isAr ? 'تقرير الوردية' : 'Shift Report'}</h1>
            <dl class="shift-report-details">
                <div><dt>${isAr ? 'اسم الوردية' : 'Shift Name'}</dt><dd>${escapeHtml(shift.shift_number || shift.id)}</dd></div>
                <div><dt>${isAr ? 'منشئ الوردية' : 'Shift Creator'}</dt><dd>${escapeHtml(creatorName || '')}</dd></div>
                <div><dt>${isAr ? 'الوردية مغلقة' : 'Closed Shift'}</dt><dd>${shift.status === 'closed' ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}</dd></div>
                <div><dt>${isAr ? 'تاريخ الإنشاء' : 'Shift Create Date'}</dt><dd>${formatShiftDisplayDate(shift.opened_at)}</dd></div>
                <div><dt>${isAr ? 'تاريخ الإغلاق' : 'Shift Closure Date'}</dt><dd>${shift.closed_at ? formatShiftDisplayDate(shift.closed_at) : '—'}</dd></div>
                <div><dt>${isAr ? 'الرصيد الافتتاحي' : 'Initial Shift Balance'}</dt><dd>${money(shift.opening_cash)}</dd></div>
                <div><dt>${isAr ? 'عدد الفواتير' : 'Invoices'}</dt><dd>${Number(summary.orderCount || 0)}</dd></div>
                <div><dt>${isAr ? 'الإجمالي' : 'Sales Total'}</dt><dd>${money(summary.grandTotal)}</dd></div>
                <div><dt>${isAr ? 'الضريبة' : 'Tax'}</dt><dd>${money(summary.tax)}</dd></div>
                <div><dt>${isAr ? 'الخصومات' : 'Discounts'}</dt><dd>${money(summary.discount)}</dd></div>
                ${(report.payments || []).map(payment => `<div><dt>${escapeHtml(payment.method)}</dt><dd>${money(payment.amount)}</dd></div>`).join('')}
            </dl>
            <div class="shift-report-actions">
                <button type="button" class="btn-close-branch" onclick="acknowledgeShiftReport('${escapeHtml(shift.id)}')">${isAr ? 'موافق' : 'OK'}</button>
                <button type="button" class="btn-print-branch" onclick="printShiftReport('${escapeHtml(shift.id)}')">${isAr ? 'طباعة' : 'Print'}</button>
            </div>
            <p class="shift-report-error" id="shiftReportError" role="alert" aria-live="polite"></p>
        </section>`;
}

async function acknowledgeShiftReport(shiftId) {
    const errorEl = document.getElementById('shiftReportError');
    try {
        const report = await loadShiftReport(shiftId);
        if (report.shift.status !== 'closed' || !report.shift.closed_at) throw new Error('The shift closure could not be confirmed.');
        const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || 'Session revocation could not be confirmed.');

        currentUser = { role: 'guest', name: 'Guest', canOpenSidebar: false, permissions: [] };
        currentCart = [];
        selectedCartLineId = null;
        selectedCartItemIndex = null;
        currentOrderNotes = '';
        currentClientPhone = '';
        orders = [];
        shifts = [];
        currentShiftReport = null;
        try {
            for (const key of ['nurpos_user', 'nurpos_active_order', 'nurpos_current_shift', 'nurpos_orders', 'nurpos_shifts']) localStorage.removeItem(key);
        } catch (_) {}
        window.location.replace('index.html');
    } catch (error) {
        if (errorEl) errorEl.textContent = error.message || 'Logout could not be completed. Retry.';
    }
}

// Confirm Close Branch Shifts
async function confirmCloseBranchShifts() {
    if (typeof canManageBranchShifts !== 'function' || !canManageBranchShifts()) {
        if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'لا تملك صلاحية إغلاق ورديات الفرع.' : 'You do not have permission to close branch shifts.', 'danger');
        return;
    }
    if (branchCloseInProgress) return;
    if (!(await refreshShiftStatuses())) {
        if (typeof showToast === 'function') showToast('Could not refresh branch shifts. Please try again.', 'danger');
        return;
    }
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
async function executeCloseBranchShifts() {
    if (typeof canManageBranchShifts !== 'function' || !canManageBranchShifts()) {
        if (typeof showToast === 'function') showToast(currentLang === 'ar' ? 'لا تملك صلاحية إغلاق ورديات الفرع.' : 'You do not have permission to close branch shifts.', 'danger');
        return;
    }
    if (branchCloseInProgress) return;
    branchCloseInProgress = true;
    const currentShifts = getShiftsCollection();
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    let closedCount = 0;

    try {
        const response = await fetch('/api/shifts/close-branch', {
            method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' }
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !Array.isArray(result.shifts)) {
            throw new Error(result.error || `Branch shift close failed (${response.status})`);
        }
        closedCount = Number(result.closedCount) || 0;
        const closedById = new Map(result.shifts.map(shift => [String(shift.id), shift]));
        shifts = currentShifts.map(shift => {
            const closedShift = closedById.get(String(shift.id));
            return closedShift ? { ...shift, status: closedShift.status, closedAt: closedShift.closed_at || closedShift.closedAt } : shift;
        });
    } catch (error) {
        branchCloseInProgress = false;
        if (typeof showToast === 'function') showToast(error.message || 'Shift service is unavailable.', 'danger');
        return;
    }
    branchCloseInProgress = false;

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
async function printShiftReport(shiftId) {
    try {
        const report = await loadShiftReport(shiftId);
        const shift = report.shift;
        const company = report.company || {};
        const branch = report.branch || {};
        const summary = report.summary || {};
        const isAr = currentLang === 'ar';
        const money = value => typeof formatCurrency === 'function' ? formatCurrency(Number(value || 0)) : Number(value || 0).toFixed(2);
        const row = (label, value) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0;border-bottom:1px solid #ddd"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? '')}</strong></div>`;
        const html = `<article style="font:14px/1.5 Arial,sans-serif;color:#111;max-width:420px;margin:auto;padding:16px">
            <header style="text-align:center;border-bottom:2px dashed #555;padding-bottom:10px;margin-bottom:12px">
                <strong style="font-size:20px">Nur Foodes</strong>
                ${company.name ? `<div>${escapeHtml(company.name)}</div>` : ''}
                ${company.legal_name ? `<div>${escapeHtml(company.legal_name)}</div>` : ''}
                ${branch.name ? `<div>${escapeHtml(branch.name)}</div>` : ''}
                ${company.tax_number ? `<div>${isAr ? 'الرقم الضريبي' : 'Tax Number'}: ${escapeHtml(company.tax_number)}</div>` : ''}
                <h2>${isAr ? 'تقرير الوردية' : 'Shift Report'}</h2>
            </header>
            ${row(isAr ? 'اسم الوردية' : 'Shift Name', shift.shift_number || shift.id)}
            ${row(isAr ? 'منشئ الوردية' : 'Shift Creator', isAr ? (shift.cashier_ar || shift.cashier) : (shift.cashier_en || shift.cashier))}
            ${row(isAr ? 'الوردية مغلقة' : 'Closed Shift', shift.status === 'closed' ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No'))}
            ${row(isAr ? 'تاريخ الإنشاء' : 'Created', formatShiftDisplayDate(shift.opened_at))}
            ${row(isAr ? 'تاريخ الإغلاق' : 'Closed', shift.closed_at ? formatShiftDisplayDate(shift.closed_at) : '—')}
            ${row(isAr ? 'الرصيد الافتتاحي' : 'Opening Balance', money(shift.opening_cash))}
            ${row(isAr ? 'عدد الفواتير' : 'Invoices', String(summary.orderCount || 0))}
            ${row(isAr ? 'الإجمالي' : 'Sales Total', money(summary.grandTotal))}
            ${row(isAr ? 'الضريبة' : 'Tax', money(summary.tax))}
            ${row(isAr ? 'الخصومات' : 'Discounts', money(summary.discount))}
            ${(report.payments || []).map(payment => row(payment.method, money(payment.amount))).join('')}
        </article>`;
        if (typeof routePrintJob === 'function') await routePrintJob('reports', html, `Shift Report - ${shift.id}`);
        else window.print();
    } catch (error) {
        if (typeof showToast === 'function') showToast(error.message || 'Shift report could not be loaded.', 'danger');
    }
}

// Print Branch Shifts Summary Report via Reports Printer
async function printBranchShiftsSummary() {
    const currentShifts = getShiftsCollection();
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    if (typeof canManageBranchShifts !== 'function' || !canManageBranchShifts()) {
        const ownShift = currentShifts.find(shift => String(shift.userId ?? shift.user_id) === String(currentUser.id));
        if (ownShift) printShiftReport(ownShift.id);
        else if (typeof showToast === 'function') showToast(isAr ? 'لا توجد وردية للطباعة.' : 'No Staff shift is available to print.', 'info');
        return;
    }

    let branchReports;
    try {
        branchReports = await Promise.all(currentShifts.map(shift => loadShiftReport(shift.id)));
    } catch (error) {
        if (typeof showToast === 'function') showToast(error.message || 'Branch shift reports could not be loaded.', 'danger');
        return;
    }

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

    const shiftRowsHtml = branchReports.map(report => {
        const sh = report.shift || {};
        const summary = report.summary || {};
        const payments = Array.isArray(report.payments) ? report.payments : [];
        const paymentTotal = matcher => payments.reduce((sum, payment) => matcher(String(payment.method || '').toLowerCase()) ? sum + Number(payment.amount || 0) : sum, 0);
        const f = {
            ordersCount: Math.max(0, Number(summary.orderCount || 0) - Number(summary.cancelledCount || 0)),
            grossSales: Number(summary.subtotal || 0),
            discountsTotal: Number(summary.discount || 0),
            taxTotal: Number(summary.tax || 0),
            netSales: Number(summary.grandTotal || 0),
            cashTotal: paymentTotal(method => method.includes('cash')),
            cardTotal: paymentTotal(method => !method.includes('cash') && !method.includes('ajel') && !method.includes('online') && !method.includes('delivery')),
            onlineTotal: paymentTotal(method => method.includes('ajel') || method.includes('online') || method.includes('delivery')),
        };
        totalOrders += f.ordersCount;
        totalGross += f.grossSales;
        totalDiscounts += f.discountsTotal;
        totalTax += f.taxTotal;
        totalNet += f.netSales;
        totalCash += f.cashTotal;
        totalCard += f.cardTotal;
        totalOnline += f.onlineTotal;

        const name = isAr ? (sh.cashier_ar || sh.cashier) : (sh.cashier_en || sh.cashier);
        const status = sh.status === 'closed' ? (isAr ? 'Ù…ØºÙ„Ù‚Ø©' : 'Closed') : (isAr ? 'Ù†Ø´Ø·Ø©' : 'Active');

        return `
            <tr style="border-bottom: 1px dotted #ccc;">
                <td style="padding: 4px 2px;"><strong>${escapeHtml(sh.id)}</strong><br><small>${escapeHtml(name || '')}</small></td>
                <td style="padding: 4px 2px; text-align: center;">${status}<br><small>${f.ordersCount} ${isAr ? 'ÙÙˆØ§ØªÙŠØ±' : 'invoices'}</small></td>
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

async function viewShiftInvoices(shiftId) {
    const shift = getShiftsCollection().find(item => String(item.id) === String(shiftId));
    if (!shift) return;
    const isAr = currentLang === 'ar';
    const mainContent = document.getElementById('shiftsMainContent');
    const subView = document.getElementById('shiftInvoicesSubView');
    if (!mainContent || !subView) return;
    mainContent.style.display = 'none';
    document.querySelector('.shifts-header')?.style.setProperty('display', 'none');
    document.getElementById('shiftsFooter')?.style.setProperty('display', 'none', 'important');
    subView.classList.add('active');
    subView.innerHTML = `<div class="shift-invoices-header"><button type="button" class="shifts-back-btn" onclick="backToShiftsList()"><i class="fa-solid fa-chevron-left"></i></button><h2 class="shifts-title">${isAr ? 'فواتير الوردية' : 'Shift Invoices'}</h2><span></span></div><div class="shift-invoices-loading" role="status">${isAr ? 'جارٍ تحميل الفواتير…' : 'Loading invoices…'}</div>`;
    try {
        const response = await fetch(`/api/shifts/${encodeURIComponent(shiftId)}/invoices`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || 'Invoices could not be loaded.');
        const ordersForShift = result.orders || [];
        subView.innerHTML = `<div class="shift-invoices-header"><button type="button" class="shifts-back-btn" onclick="backToShiftsList()"><i class="fa-solid fa-chevron-left"></i></button><h2 class="shifts-title">${isAr ? 'فواتير الوردية' : 'Shift Invoices'}</h2><button type="button" class="shift-pill-btn" onclick="printShiftReport('${escapeHtml(shiftId)}')">${isAr ? 'طباعة التقرير' : 'Print Shift'}</button></div><div class="shift-invoices-content">${ordersForShift.length ? `<table class="shift-invoices-table"><thead><tr><th>${isAr ? 'رقم الفاتورة' : 'Invoice ID'}</th><th>${isAr ? 'الوقت' : 'Time'}</th><th>${isAr ? 'طريقة الدفع' : 'Payment'}</th><th>${isAr ? 'المبلغ' : 'Amount'}</th></tr></thead><tbody>${ordersForShift.map(order => `<tr><td><strong>${escapeHtml(order.id)}</strong></td><td>${formatShiftDisplayDate(order.created_at)}</td><td>${escapeHtml(order.method || '—')}</td><td>${typeof formatCurrency === 'function' ? formatCurrency(Number(order.grand_total || 0)) : Number(order.grand_total || 0).toFixed(2)}</td></tr>`).join('')}</tbody></table>` : `<div class="shifts-empty-state">${isAr ? 'لا توجد فواتير مسجلة لهذه الوردية.' : 'No invoices recorded for this shift.'}</div>`}</div>`;
    } catch (error) {
        subView.innerHTML = `<div class="shift-invoices-header"><button type="button" class="shifts-back-btn" onclick="backToShiftsList()"><i class="fa-solid fa-chevron-left"></i></button><h2 class="shifts-title">${isAr ? 'فواتير الوردية' : 'Shift Invoices'}</h2><span></span></div><p class="shift-report-error">${escapeHtml(error.message || 'Invoices could not be loaded.')}</p>`;
    }
}

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
    const mainFooter = document.getElementById('shiftsFooter') || document.querySelector('.shifts-footer');
    if (mainFooter) {
        mainFooter.classList.remove('hidden');
        mainFooter.style.removeProperty('display');
    }
}
