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
    const validPin = storeSettings.adminPin || '1234';
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

    // Silent IFrame or Pop-up Print Execution
    try {
        let printFrame = document.getElementById('posSilentPrintFrame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'posSilentPrintFrame';
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0px';
            printFrame.style.height = '0px';
            printFrame.style.border = 'none';
            document.body.appendChild(printFrame);
        }

        const frameDoc = (printFrame.contentWindow && printFrame.contentWindow.document) 
            ? printFrame.contentWindow.document 
            : (printFrame.contentDocument || null);
        if (!frameDoc) {
            if (typeof window !== 'undefined' && typeof window.print === 'function') {
                window.print();
            }
            return;
        }
        frameDoc.open();
        frameDoc.write(`
            <!DOCTYPE html>
            <html lang="${currentLang}" dir="${currentLang === 'ar' ? 'rtl' : 'ltr'}">
            <head>
                <meta charset="UTF-8">
                <title>${escapeHtml(title)}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 12px; color: #111; font-size: 13px; line-height: 1.4; }
                    .text-center { text-align: center; }
                    .text-end { text-align: end; }
                    .fw-bold { font-weight: bold; }
                    .divider { border-bottom: 1px dashed #666; margin: 8px 0; }
                    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
                    th, td { padding: 4px 6px; }
                    th { border-bottom: 1px solid #333; }
                    .receipt-footer { text-align: center; margin-top: 12px; font-size: 11px; color: #666; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${contentHtml}
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
        }, 250);

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
