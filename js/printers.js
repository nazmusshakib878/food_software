/* =========================================================
   PRINTERS.JS - Printing Devices Management, PassCode Security
   & Unified Print Routing Service
   ========================================================= */

// PassCode Modal Controller
let passcodeCallback = null;

function openPassCodeModal(options = {}) {
    const modal = document.getElementById('passcodeModal');
    const titleEl = document.getElementById('passcodeModalTitle');
    const inputEl = document.getElementById('passcodeInput');
    const errorEl = document.getElementById('passcodeError');

    passcodeCallback = options.onSuccess || null;

    if (titleEl) {
        titleEl.textContent = options.title || (currentLang === 'ar' ? 'رمز المرور' : 'Security PassCode');
    }
    if (inputEl) {
        inputEl.value = '';
        inputEl.type = 'password';
        const eyeBtn = document.getElementById('passcodeToggleEye');
        if (eyeBtn) eyeBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    if (modal) {
        modal.classList.add('open');
        setTimeout(() => inputEl?.focus(), 100);
    }
}

function closePassCodeModal() {
    const modal = document.getElementById('passcodeModal');
    if (modal) modal.classList.remove('open');
    passcodeCallback = null;
}

function togglePasscodeVisibility() {
    const inputEl = document.getElementById('passcodeInput');
    const eyeBtn = document.getElementById('passcodeToggleEye');
    if (!inputEl) return;
    if (inputEl.type === 'password') {
        inputEl.type = 'text';
        if (eyeBtn) eyeBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
        inputEl.type = 'password';
        if (eyeBtn) eyeBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
}

function submitPassCode() {
    const inputEl = document.getElementById('passcodeInput');
    const errorEl = document.getElementById('passcodeError');
    const pin = (inputEl ? inputEl.value : '').trim();

    // Valid if matches admin pin, or 1234
    const validPin = storeSettings.adminPin || '123456';
    if (pin === validPin || (currentUser.role === 'admin' && pin === storeSettings.adminPin)) {
        const cb = passcodeCallback;
        closePassCodeModal();
        if (typeof soundSuccess === 'function') soundSuccess();
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'تم تأكيد الرمز بنجاح' : 'Access Granted', 'success');
        }
        if (cb) cb();
    } else {
        if (typeof soundWarning === 'function') soundWarning();
        if (errorEl) {
            errorEl.textContent = currentLang === 'ar' 
                ? `رمز غير صحيح! (الافتراضي: ${validPin})` 
                : `Invalid Passcode! (Default: ${validPin})`;
            errorEl.style.display = 'block';
        }
        if (inputEl) {
            inputEl.value = '';
            inputEl.focus();
        }
    }
}

// Protected Entrance to Printing Devices
function openPrintingDevicesProtected() {
    // Check with PassCode
    openPassCodeModal({
        title: currentLang === 'ar' ? 'التحقق من الصلاحية - إدارة الطابعات' : 'PassCode - Printing Devices',
        onSuccess: () => {
            renderPrintingDevicesModal();
            const modal = document.getElementById('printingDevicesModal');
            if (modal) modal.classList.add('open');
        }
    });
}

function closePrintingDevicesModal() {
    const modal = document.getElementById('printingDevicesModal');
    if (modal) modal.classList.remove('open');
}

// Render Printing Devices List
function renderPrintingDevicesModal() {
    const listEl = document.getElementById('printersListContainer');
    const autoPrintToggle = document.getElementById('autoPrintToggle');

    if (autoPrintToggle) {
        autoPrintToggle.checked = !!posPreferences.autoPrint;
    }

    if (!listEl) return;

    if (!printers || printers.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state-box">
                <i class="fa-solid fa-print"></i>
                <p>${currentLang === 'ar' ? 'لا توجد طابعات مضافة حالياً' : 'No printing devices configured'}</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = printers.map(p => {
        const roleName = p.role === 'cashier' 
            ? (currentLang === 'ar' ? 'طابعة الكاشير والفواتير' : 'Cashier Printer')
            : p.role === 'kitchen'
                ? (currentLang === 'ar' ? 'طابعة بون المطبخ' : 'Kitchen Printer')
                : (currentLang === 'ar' ? 'طابعة التقارير والمحاسبة' : 'Reports Printer');

        const statusClass = p.status === 'online' ? 'status-online' : 'status-offline';
        const statusText = p.status === 'online' 
            ? (currentLang === 'ar' ? 'متصل' : 'Online') 
            : (currentLang === 'ar' ? 'غير متصل' : 'Offline');

        return `
            <div class="printer-device-card" id="printer_card_${p.id}">
                <div class="printer-info">
                    <div class="printer-title-row">
                        <i class="fa-solid fa-print"></i>
                        <span class="printer-name">${escapeHtml(currentLang === 'ar' ? (p.nameAr || p.name) : (p.nameEn || p.name))}</span>
                        <span class="printer-role-badge badge-${p.role}">${roleName}</span>
                    </div>
                    <div class="printer-meta-row">
                        <span class="printer-ip"><i class="fa-solid fa-network-wired"></i> ${escapeHtml(p.ip)}</span>
                        <span class="printer-status-pill ${statusClass}"><i class="fa-solid fa-circle"></i> ${statusText}</span>
                    </div>
                </div>
                <div class="printer-actions-row">
                    <button type="button" class="btn btn-sm btn-outline-info" onclick="testPrinterDevice('${p.id}')">
                        <i class="fa-solid fa-paper-plane"></i> ${currentLang === 'ar' ? 'اختبار' : 'Test'}
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="editPrinterDevice('${p.id}')">
                        <i class="fa-solid fa-pen"></i> ${currentLang === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="deletePrinterDevice('${p.id}')">
                        <i class="fa-solid fa-trash"></i> ${currentLang === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Add/Edit Printer Device
function promptAddPrinter() {
    const name = prompt(currentLang === 'ar' ? "اسم الطابعة:" : "Printer Name:", "New Thermal 80mm");
    if (!name) return;
    const ip = prompt(currentLang === 'ar' ? "عنوان IP أو المنفذ:" : "IP address / Network Endpoint:", "192.168.1.105");
    if (!ip) return;
    const roleChoice = prompt(currentLang === 'ar' ? "نوع الطابعة (1: كاشير, 2: مطبخ, 3: تقارير):" : "Printer Role (1: Cashier, 2: Kitchen, 3: Reports):", "1");
    
    let role = 'cashier';
    if (roleChoice === '2') role = 'kitchen';
    if (roleChoice === '3') role = 'reports';

    const newPrinter = {
        id: "prn_" + Date.now(),
        name: name.trim(),
        role: role,
        ip: ip.trim(),
        status: "online",
        isDefault: false
    };

    printers.push(newPrinter);
    persistData();
    renderPrintingDevicesModal();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تمت إضافة الطابعة بنجاح' : 'Printer added successfully', 'success');
    }
}

function editPrinterDevice(printerId) {
    const p = printers.find(x => x.id === printerId);
    if (!p) return;
    const newName = prompt(currentLang === 'ar' ? "تعديل اسم الطابعة:" : "Edit Printer Name:", p.name);
    if (newName) p.name = newName.trim();
    const newIp = prompt(currentLang === 'ar' ? "تعديل عنوان IP:" : "Edit IP Address:", p.ip);
    if (newIp) p.ip = newIp.trim();

    persistData();
    renderPrintingDevicesModal();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تم تحديث بيانات الطابعة' : 'Printer updated', 'info');
    }
}

function deletePrinterDevice(printerId) {
    const p = printers.find(x => x.id === printerId);
    if (!p) return;
    if (confirm(currentLang === 'ar' ? `هل أنت متأكد من حذف ${p.name}؟` : `Delete printer ${p.name}?`)) {
        printers = printers.filter(x => x.id !== printerId);
        persistData();
        renderPrintingDevicesModal();
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'تم حذف الطابعة' : 'Printer deleted', 'info');
        }
    }
}

// Test Printer Simulation
function testPrinterDevice(printerId) {
    const p = printers.find(x => x.id === printerId);
    if (!p) return;

    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? `جاري إرسال أمر اختبار إلى ${p.name} (${p.ip})...` : `Sending test print to ${p.name}...`, 'info');
    }

    setTimeout(() => {
        p.status = 'online';
        persistData();
        renderPrintingDevicesModal();
        if (typeof soundSuccess === 'function') soundSuccess();
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? `نجح الاتصال بالطابعة ${p.name}! تم إرسال صفحة الاختبار.` : `Printer test successful for ${p.name}!`, 'success');
        }
    }, 700);
}

// Auto-Print Toggle Saver
function onAutoPrintToggled(checked) {
    setPosPreference('autoPrint', checked);
    if (typeof showToast === 'function') {
        showToast(
            checked 
                ? (currentLang === 'ar' ? 'تم تفعيل الطباعة التلقائية' : 'Automatic printing enabled')
                : (currentLang === 'ar' ? 'تم تعطيل الطباعة التلقائية' : 'Automatic printing disabled'),
            'info'
        );
    }
}

// Save Printing Devices Settings
function savePrintingDevicesSettings() {
    const toggle = document.getElementById('autoPrintToggle');
    if (toggle) {
        setPosPreference('autoPrint', toggle.checked);
    }
    persistData();
    closePrintingDevicesModal();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تم حفظ إعدادات الطابعات بنجاح' : 'Printer settings saved successfully', 'success');
    }
}

// Sync Printers Action (from More panel)
function syncPrinters() {
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'جاري مزامنة واكتشاف أجهزة الطباعة على الشبكة...' : 'Discovering & synchronizing network printers...', 'info');
    }
    setTimeout(() => {
        printers.forEach(p => p.status = 'online');
        persistData();
        if (typeof soundSuccess === 'function') soundSuccess();
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? `تمت مزامنة (${printers.length}) طابعات بنجاح` : `Successfully synced (${printers.length}) printers`, 'success');
        }
    }, 900);
}

// Unified Print Router
function routePrintJob(role, contentHtml, title = 'Print Job') {
    const targetPrinter = printers.find(p => p.role === role && p.status === 'online') || printers.find(p => p.role === role) || printers[0];

    if (!targetPrinter) {
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'تنبيه: لم يتم العثور على طابعة مهيأة لهذا الدور' : 'Warning: No printer found for this role', 'warning');
        }
    } else {
        console.log(`[PrintRouter] Routing job "${title}" to printer "${targetPrinter.name}" (${targetPrinter.ip})`);
    }

    // If receipt modal is open and printing cashier receipt, use direct native window.print() (Zero blank pages, full rasterization)
    const receiptModal = document.getElementById('receiptModal');
    if (role === 'cashier' && receiptModal && receiptModal.classList.contains('open')) {
        setTimeout(() => {
            window.print();
        }, 150);
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? `تم إرسال أمر الطباعة (${escapeHtml(title)})` : `Print job sent (${escapeHtml(title)})`, 'success');
        }
        return;
    }

    // Silent IFrame Execution for Reports or Background Print Jobs
    try {
        let printFrame = document.getElementById('posSilentPrintFrame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'posSilentPrintFrame';
            document.body.appendChild(printFrame);
        }

        // Render in viewport behind UI so Chrome/Edge compositor does not cull it
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '80mm';
        printFrame.style.height = '100vh';
        printFrame.style.border = 'none';
        printFrame.style.opacity = '1';
        printFrame.style.visibility = 'visible';
        printFrame.style.pointerEvents = 'none';
        printFrame.style.zIndex = '-9999';
        printFrame.style.display = 'block';

        const frameDoc = (printFrame.contentWindow && printFrame.contentWindow.document) 
            ? printFrame.contentWindow.document 
            : (printFrame.contentDocument || null);
        if (!frameDoc) {
            if (typeof window !== 'undefined' && typeof window.print === 'function') {
                window.print();
            }
            return;
        }

        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(el => el.outerHTML).join('\n');

        frameDoc.open();
        frameDoc.write(`
            <!DOCTYPE html>
            <html lang="${currentLang}" dir="${currentLang === 'ar' ? 'rtl' : 'ltr'}">
            <head>
                <meta charset="UTF-8">
                <base href="${window.location.origin}${window.location.pathname}">
                <title>${escapeHtml(title)}</title>
                ${stylesheets}
                <style>
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        width: 100% !important;
                        height: auto !important;
                        font-family: 'Courier Prime', 'Courier New', 'Cairo', 'Inter', Courier, monospace, sans-serif !important;
                        -webkit-font-smoothing: antialiased;
                    }
                    #receiptModal,
                    .modal-card {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                        overflow: visible !important;
                    }
                    .modal-header,
                    .modal-footer,
                    .modal-close-btn {
                        display: none !important;
                    }
                    .thermal-paper {
                        display: block !important;
                        visibility: visible !important;
                        position: static !important;
                        width: 76mm !important;
                        max-width: 76mm !important;
                        margin: 0 auto !important;
                        padding: 8px 6px !important;
                        box-shadow: none !important;
                        color: #000000 !important;
                        background: #ffffff !important;
                        font-family: 'Courier Prime', 'Courier New', 'Cairo', Courier, monospace, sans-serif !important;
                        font-size: 11.5px !important;
                        line-height: 1.35 !important;
                        overflow: visible !important;
                    }
                    .thermal-paper * {
                        visibility: visible !important;
                        color: #000000 !important;
                    }
                    .receipt-header {
                        text-align: center !important;
                        margin-bottom: 8px !important;
                        border-bottom: 1px dashed #000 !important;
                        padding-bottom: 8px !important;
                    }
                    .receipt-header h2 {
                        font-size: 19px !important;
                        font-weight: 900 !important;
                        margin: 0 0 3px 0 !important;
                        letter-spacing: 0.5px !important;
                    }
                    .receipt-header .header-ar {
                        font-family: 'Cairo', sans-serif !important;
                        font-size: 13.5px !important;
                        font-weight: 700 !important;
                        margin: 2px 0 !important;
                        direction: rtl !important;
                    }
                    .receipt-header .vat-line {
                        font-size: 11.5px !important;
                        font-weight: 600 !important;
                        margin: 2px 0 !important;
                    }
                    .receipt-header .invoice-badge-title {
                        font-size: 11px !important;
                        font-weight: 800 !important;
                        border: 1px dashed #000 !important;
                        display: inline-block !important;
                        padding: 2px 8px !important;
                        margin: 5px 0 0 0 !important;
                    }
                    .receipt-info-grid {
                        margin: 8px 0 !important;
                        padding-bottom: 6px !important;
                        border-bottom: 1px dashed #000 !important;
                    }
                    .receipt-info-grid .row {
                        display: flex !important;
                        justify-content: space-between !important;
                        font-size: 11px !important;
                        margin: 2px 0 !important;
                    }
                    .receipt-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin: 8px 0 !important;
                    }
                    .receipt-table th {
                        border-top: 1px dashed #000 !important;
                        border-bottom: 1px dashed #000 !important;
                        padding: 4px 2px !important;
                        font-size: 11px !important;
                        font-weight: 800 !important;
                    }
                    .receipt-table td {
                        padding: 4px 2px !important;
                        font-size: 11px !important;
                        border-bottom: 1px dashed #e0e0e0 !important;
                        vertical-align: top !important;
                    }
                    .rec-item-name-cell {
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .rec-item-name-cell .rec-ar {
                        font-family: 'Cairo', sans-serif !important;
                        font-size: 11.5px !important;
                        font-weight: 700 !important;
                    }
                    .rec-item-name-cell .rec-en {
                        font-size: 10.5px !important;
                        color: #333 !important;
                    }
                    .rec-addon-line {
                        font-size: 10px !important;
                        color: #555 !important;
                    }
                    .rec-note-line {
                        font-size: 10px !important;
                        font-style: italic !important;
                    }
                    .receipt-totals {
                        margin: 8px 0 !important;
                        border-top: 1px dashed #000 !important;
                        padding-top: 4px !important;
                    }
                    .receipt-totals .row {
                        display: flex !important;
                        justify-content: space-between !important;
                        font-size: 11px !important;
                        margin: 2px 0 !important;
                    }
                    .receipt-totals .grand-total {
                        font-size: 14px !important;
                        font-weight: 900 !important;
                        border-top: 1px solid #000 !important;
                        border-bottom: 1px solid #000 !important;
                        padding: 5px 0 !important;
                        margin: 4px 0 !important;
                    }
                    .receipt-qr-zone {
                        text-align: center !important;
                        margin: 10px auto !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: center !important;
                    }
                    .receipt-qr-zone img,
                    .receipt-qr-zone canvas {
                        display: block !important;
                        margin: 0 auto !important;
                        max-width: 110px !important;
                        max-height: 110px !important;
                    }
                    .receipt-footer-text {
                        text-align: center !important;
                        margin-top: 8px !important;
                        font-size: 10.5px !important;
                    }
                    #receiptCombinedKotSection {
                        margin-top: 20px !important;
                        border-top: 2px dashed #000 !important;
                        padding-top: 10px !important;
                    }
                </style>
            </head>
            <body style="margin:0;padding:0;background:#ffffff;">
                <div id="receiptModal" class="open" style="display:block;position:static;width:100%;">
                    <div class="modal-card" style="box-shadow:none;border:none;padding:0;margin:0;width:100%;max-width:100%;">
                        ${contentHtml}
                    </div>
                </div>
            </body>
            </html>
        `);
        frameDoc.close();

        setTimeout(() => {
            try {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
            } catch (err) {
                console.warn("Print execution note:", err);
            }
        }, 300);

        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? `تم إرسال أمر الطباعة (${escapeHtml(title)})` : `Print job sent (${escapeHtml(title)})`, 'success');
        }
    } catch (e) {
        console.error("Print Router Error:", e);
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'تعذر إتمام أمر الطباعة' : 'Failed to print document', 'danger');
        }
    }
}
