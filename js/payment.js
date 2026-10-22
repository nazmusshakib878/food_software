/* =========================================================
   PAYMENT.JS - Refined POS Payment & Checkout Screen
   ========================================================= */

function getOrderChannelPolicy(channelId) {
    const onlinePartners = ['hungerstation', 'jahiz', 'ninja', 'keeta', 'mrsool', 'toyou', 'thechefz'];
    if (onlinePartners.includes(channelId)) return 'ONLINE_PARTNER';
    if (channelId === 'management') return 'STAFF_EXPENSE';
    return 'NORMAL';
}

function getAllowedPaymentMethods(channelPolicy) {
    if (channelPolicy === 'ONLINE_PARTNER') return ['credit']; // Only Ajel / Credit allowed
    return ['cash', 'bank236_visa', 'bank236_mada', 'bank237_visa', 'bank237_mada', 'bank238_visa', 'bank238_mada', 'bank239_visa', 'bank239_mada', 'credit'];
}

function getCheckoutDestination(channelPolicy) {
    if (channelPolicy === 'STAFF_EXPENSE') return 'STAFF_EXPENSE_SCREEN';
    return 'PAYMENT_SCREEN';
}

// --- NEW PAYMENT STATE MODEL ---
let paymentState = {
    cash: "",
    bank236_visa: "",
    bank236_mada: "",
    bank237_visa: "",
    bank237_mada: "",
    bank238_visa: "",
    bank238_mada: "",
    bank239_visa: "",
    bank239_mada: "",
    credit: ""
};

let activePaymentInput = null;
let lastTap = 0;

function resetPaymentState() {
    for (let key in paymentState) {
        paymentState[key] = "";
    }
    activePaymentInput = null;
    
    // Collapse all accordions
    document.querySelectorAll('.pay-accordion').forEach(el => {
        el.classList.remove('expanded');
    });
    
    // Clear active UI inputs
    document.querySelectorAll('.pay-input-row input').forEach(input => {
        input.value = "";
        input.classList.remove('active-input');
    });
}

function openPaymentModal() {
    if (currentCart.length === 0) {
        soundWarning && soundWarning();
        showToast && showToast(currentLang === 'ar' ? "أضف عناصر للطلب أولاً" : "Add items to order first", "danger");
        return;
    }

    const policy = getOrderChannelPolicy(currentCustomerId);
    const dest = getCheckoutDestination(policy);

    if (dest === 'STAFF_EXPENSE_SCREEN') {
        openStaffMealExpenseModal();
        return;
    }

    const allowedMethods = getAllowedPaymentMethods(policy);
    let allowedAccordionIds = [];
    document.querySelectorAll('.pay-accordion').forEach(el => {
        const accId = el.id.replace('acc_', '');
        let isAllowed = false;
        if (accId === 'cash' && allowedMethods.includes('cash')) isAllowed = true;
        if (accId === 'credit' && allowedMethods.includes('credit')) isAllowed = true;
        if (accId.startsWith('bank')) {
            if (allowedMethods.includes(accId + '_visa') || allowedMethods.includes(accId + '_mada')) {
                isAllowed = true;
            }
        }
        el.style.display = isAllowed ? 'block' : 'none';
        if (isAllowed) allowedAccordionIds.push(accId);
    });

    resetPaymentState();
    updateRemainingUI();
    document.getElementById('paymentModal').classList.add('open');
    
    if (allowedAccordionIds.length === 1) {
        toggleAccordion(allowedAccordionIds[0]);
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('open');
}

function toggleAccordion(methodId) {
    const accId = 'acc_' + methodId;
    const currentEl = document.getElementById(accId);
    if (!currentEl) return;
    
    const isExpanded = currentEl.classList.contains('expanded');
    
    // Collapse all
    document.querySelectorAll('.pay-accordion').forEach(el => {
        el.classList.remove('expanded');
    });
    
    if (!isExpanded) {
        currentEl.classList.add('expanded');
        
        // Auto-select first input in this accordion if nothing is active, or if we want to default it
        if (methodId === 'cash') focusPaymentInput('cash');
        else if (methodId === 'credit') focusPaymentInput('credit');
        else if (methodId.startsWith('bank')) {
            // default to VISA
            focusPaymentInput(methodId + '_visa');
        }
    }
}

function focusPaymentInput(fieldId) {
    activePaymentInput = fieldId;
    updateRemainingUI();
}

function handleInputTap(fieldId) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 500 && tapLength > 0 && activePaymentInput === fieldId) {
        // Double tap
        fillRemaining(fieldId);
    } else {
        // Single tap
        focusPaymentInput(fieldId);
    }
    lastTap = currentTime;
}

function fillRemaining(fieldId) {
    focusPaymentInput(fieldId);
    
    const remaining = getRemaining();
    if (remaining > 0) {
        let currentVal = parseFloat(paymentState[fieldId]) || 0;
        let newVal = currentVal + remaining;
        paymentState[fieldId] = newVal.toFixed(2);
    }
    updateRemainingUI();
}

function calculateAllocated() {
    let total = 0;
    for (let key in paymentState) {
        total += parseFloat(paymentState[key]) || 0;
    }
    return total;
}

function getRemaining() {
    const totals = calculateCartTotals();
    const allocated = calculateAllocated();
    return Math.max(0, totals.grandTotal - allocated);
}

function getChange() {
    const totals = calculateCartTotals();
    const allocated = calculateAllocated();
    return Math.max(0, allocated - totals.grandTotal);
}

function updateRemainingUI() {
    const remaining = getRemaining();
    const remainingEl = document.getElementById('payModalRemaining');
    if (remainingEl) {
        remainingEl.innerText = remaining.toFixed(2);
    }
    
    for (let key in paymentState) {
        const inputEl = document.getElementById('input_' + key);
        if (inputEl) {
            inputEl.value = paymentState[key];
            if (activePaymentInput === key) {
                inputEl.classList.add('active-input');
            } else {
                inputEl.classList.remove('active-input');
            }
        }
    }
}

function pressNumpad(key) {
    if (!activePaymentInput) return;
    
    let currentVal = paymentState[activePaymentInput];
    
    if (key === 'CLEAR') {
        currentVal = "";
    } else if (key === 'BACK') {
        currentVal = currentVal.slice(0, -1);
    } else if (key === '.') {
        if (currentVal === '') currentVal = '0.';
        else if (!currentVal.includes('.')) currentVal += '.';
    } else {
        if (currentVal === '0' && key === '0') return;
        
        let testVal = currentVal;
        if (testVal === '0') testVal = key;
        else {
            if (testVal.includes('.')) {
                const parts = testVal.split('.');
                if (parts[1] && parts[1].length >= 2) return;
            }
            testVal += key;
        }
        
        if (activePaymentInput !== 'cash') {
            const totals = calculateCartTotals();
            let allocatedOthers = 0;
            for (let k in paymentState) {
                if (k !== activePaymentInput) {
                    allocatedOthers += parseFloat(paymentState[k]) || 0;
                }
            }
            let maxAllowed = Math.max(0, totals.grandTotal - allocatedOthers);
            if (parseFloat(testVal) > maxAllowed) {
                return;
            }
        }
        
        currentVal = testVal;
    }
    
    paymentState[activePaymentInput] = currentVal;
    updateRemainingUI();
}

function pressNumpadQuick(val) {
    if (!activePaymentInput) return;
    
    let newVal = parseFloat(val);
    if (activePaymentInput !== 'cash') {
        const totals = calculateCartTotals();
        let allocatedOthers = 0;
        for (let k in paymentState) {
            if (k !== activePaymentInput) {
                allocatedOthers += parseFloat(paymentState[k]) || 0;
            }
        }
        let maxAllowed = Math.max(0, totals.grandTotal - allocatedOthers);
        if (newVal > maxAllowed) {
            newVal = maxAllowed;
        }
    }
    
    paymentState[activePaymentInput] = newVal.toFixed(2);
    updateRemainingUI();
}

// Ensure the application can call this externally if it tries to 
function updatePaymentModalUI(grandTotal) {
    updateRemainingUI();
}

let isProcessingCheckout = false;

function processCheckoutPay() {
    if (isProcessingCheckout) return;
    isProcessingCheckout = true;

    const remaining = getRemaining();
    const totals = calculateCartTotals();
    const allocated = calculateAllocated();

    if (remaining > 0.001) {
        isProcessingCheckout = false;
        soundWarning && soundWarning();
        showToast && showToast(currentLang === 'ar' ? "الرجاء إكمال المبلغ المتبقي." : "Please complete the remaining payment amount.", "danger");
        return;
    }
    
    // Determine primary method for receipt (legacy fallback)
    let mainMethod = "Cash";
    let maxAmount = -1;
    let methodCount = 0;
    let paymentBreakdown = {};
    
    for (let key in paymentState) {
        let amount = parseFloat(paymentState[key]) || 0;
        if (amount > 0) {
            methodCount++;
            paymentBreakdown[key] = amount;
            if (amount > maxAmount) {
                maxAmount = amount;
                if (key === 'cash') mainMethod = "Cash";
                else if (key === 'credit') mainMethod = "Ajel";
                else if (key.includes('bank236')) mainMethod = "Bank 236";
                else if (key.includes('bank237')) mainMethod = "Bank 237";
                else if (key.includes('bank238')) mainMethod = "Bank 238";
                else if (key.includes('bank239')) mainMethod = "Bank 239";
            }
        }
    }
    
    if (methodCount > 1) {
        mainMethod = "Split";
    } else if (methodCount === 0) {
        // Assume full cash if somehow bypassed with 0 total
        mainMethod = "Cash";
    }
    
    // Complete the transaction
    completeOrderAndShowReceipt(null, mainMethod, paymentBreakdown, allocated);
}

// Modified to accept custom breakdown
function completeOrderAndShowReceipt(staffAllocation = null, method = "Cash", breakdown = {}, paidAmount = 0) {
    const totals = calculateCartTotals();
    if (currentCart.length === 0) {
        isProcessingCheckout = false;
        soundWarning && soundWarning();
        showToast && showToast(currentLang === 'ar' ? "السلة فارغة!" : "Cart is empty!", "danger");
        return;
    }

    const paid = staffAllocation ? totals.grandTotal : paidAmount;
    
    if (!staffAllocation && Math.round(paid * 100) < Math.round(totals.grandTotal * 100)) {
        isProcessingCheckout = false;
        soundWarning && soundWarning();
        showToast && showToast(currentLang === 'ar' ? "المبلغ المدفوع أقل من الإجمالي!" : "Paid amount is less than total!", "danger");
        return;
    }

    const tableVal = (currentOrderTypeId === 'local' || currentOrderType === 'dine_in' || currentOrderType === 'local')
        ? (document.getElementById('tableSelect')?.value || 'Table 1')
        : '-';

    const customerObj = (typeof customers !== 'undefined' && Array.isArray(customers)) 
        ? customers.find(c => c.id === currentCustomerId) 
        : null;
    const posTypeObj = (typeof POS_ORDER_TYPES !== 'undefined' && Array.isArray(POS_ORDER_TYPES))
        ? POS_ORDER_TYPES.find(t => t.id === currentOrderTypeId)
        : null;
    const orderTypeObj = (typeof orderTypes !== 'undefined' && Array.isArray(orderTypes)) 
        ? orderTypes.find(t => t.id === currentOrderTypeId) 
        : null;

    let resolvedOrderTypeName;
    if (currentLang === 'ar') {
        resolvedOrderTypeName = (orderTypeObj && orderTypeObj.nameAr) || (posTypeObj && posTypeObj.nameAr) || 'محلي';
    } else {
        resolvedOrderTypeName = (posTypeObj && posTypeObj.nameEn) || (orderTypeObj && orderTypeObj.nameEn) || 'local';
    }

    let finalMethod = staffAllocation ? "Staff Expense" : method;
    const activeShift = (typeof shifts !== 'undefined' && Array.isArray(shifts)) ? (shifts.find(s => s.status === 'active') || shifts[0]) : null;

    const orderRecord = {
        id: `ORD-${nextOrderSeq}`,
        seq: nextOrderSeq,
        shiftId: activeShift ? activeShift.id : 'SH-101',
        date: new Date().toISOString(),
        dateFormatted: new Date().toLocaleString(currentLang === 'ar' ? 'ar-SA' : 'en-US'),
        type: currentOrderType,
        table: tableVal,
        customer: customerObj ? (currentLang === 'ar' ? customerObj.nameAr : customerObj.nameEn) : (currentLang === 'ar' ? 'عميل نقدي' : 'Cash Customer'),
        customerId: currentCustomerId,
        orderType: resolvedOrderTypeName,
        orderTypeId: currentOrderTypeId,
        notes: currentOrderNotes,
        phone: currentClientPhone,
        status: 'new',
        cashier: currentUser.name || 'Cashier',
        items: currentCart.map(i => ({
            lineId: i.lineId || generateCartLineId(),
            id: i.id,
            catId: i.catId || i.category || null, // Preserved for KOT category filter
            arName: i.arName,
            enName: i.enName,
            price: i.price,
            qty: i.qty,
            addons: (i.addons && i.addons.length) ? i.addons.map(a => ({ ...a })) : [],
            modifiers: (i.modifiers && i.modifiers.length) ? i.modifiers.map(m => ({ ...m })) : [],
            note: i.note || ''
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        taxableAmount: totals.taxableAmount,
        netBeforeVat: totals.netBeforeVat,
        taxRate: totals.taxRate !== undefined ? totals.taxRate : Math.max(0, Number(storeSettings.taxRate) || 0),
        total: totals.grandTotal,
        grandTotal: totals.grandTotal,
        paid: paid,
        change: Math.max(0, Math.round((paid - totals.grandTotal) * 100) / 100),
        method: finalMethod,
        paymentBreakdown: breakdown,
        staffAllocation: staffAllocation || null
    };

    orders.unshift(orderRecord);
    nextOrderSeq += 1;

    currentCart.forEach(cartItem => {
        const product = items.find(i => i.id === cartItem.id);
        if (product && product.stock !== undefined && product.stock !== null) {
            product.stock = Math.max(0, product.stock - cartItem.qty);
            if (product.stock <= 0) {
                product.available = false;
            }
        }
    });

    persistData();
    if (typeof updateKdsStockAlert === 'function') updateKdsStockAlert();
    updatePosOrderBadge();
    soundSuccess && soundSuccess();

    try {
        if (typeof confetti === 'function') {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
    } catch (e) {}

    lastCompletedOrder = orderRecord;
    closePaymentModal();
    if (typeof closeMobileCart === 'function') closeMobileCart();

    const tableSelect = document.getElementById('tableSelect');
    if (tableSelect) tableSelect.value = 'Table 1';

    currentCart = [];
    selectedCartLineId = null;
    selectedCartItemIndex = null;
    if (typeof closeItemModifierPanel === 'function') closeItemModifierPanel();
    currentOrderNotes = '';
    currentClientPhone = '';
    customDiscount = 0;
    resetPaymentState();
    currentCustomerId = 'cash';
    currentOrderTypeId = 'delivery';
    currentOrderType = 'delivery';
    if (typeof clearActiveOrderState === 'function') clearActiveOrderState();
    if (typeof renderCustomerSelector === 'function') renderCustomerSelector();
    if (typeof renderOrderTypeSelector === 'function') renderOrderTypeSelector();
    renderCart();
    renderProducts();

    showToast && showToast(currentLang === 'ar' ? "تم تسجيل الطلب والدفع بنجاح!" : "Order completed successfully!", "success");

    // Render receipt content into DOM (modal stays closed until print sequence decides to show it)
    if (typeof renderReceipt === 'function') renderReceipt(orderRecord);

    console.log('[PAY PRINT] payment success');

    if (posPreferences && posPreferences.autoPrint) {
        // Print sequence: KOT → CUT → Invoice → CUT
        // The sequence itself opens/closes receiptModal at the correct time.
        // Do NOT open receiptModal here before the sequence — let executeKitchenPrint
        // control the modal visibility so only KOT prints first.
        if (typeof runPostPaymentPrintSequence === 'function') {
            runPostPaymentPrintSequence(orderRecord);
        } else {
            // Fallback: no sequence function available, open receipt and print directly
            document.getElementById('receiptModal')?.classList.add('open');
            setTimeout(() => {
                window.print();
            }, 500);
        }
    } else {
        // autoPrint is off — just show the receipt modal for manual printing
        document.getElementById('receiptModal')?.classList.add('open');
    }

    // Free the lock after everything is dispatched
    isProcessingCheckout = false;
}

// --- STAFF MEAL EXPENSE LOGIC ---
const STAFF_MEAL_FIELD_IDS = [
    'staffManagementMeals',
    'staffOwnerMeals',
    'staffHospitality',
    'staffEmployeeMeals'
];

let lastStaffTapTime = 0;
let lastStaffTapFieldId = null;
let lastStaffTouchAutoFillTime = 0;
let isStaffMealProcessing = false;

function openStaffMealExpenseModal() {
    isStaffMealProcessing = false;
    lastStaffTapTime = 0;
    lastStaffTapFieldId = null;
    lastStaffTouchAutoFillTime = 0;

    // Ensure section body is expanded
    const body = document.getElementById('staffMealSectionBody');
    const icon = document.getElementById('wajbatToggleIcon');
    if (body) body.classList.remove('collapsed');
    if (icon) icon.classList.remove('rotated');

    STAFF_MEAL_FIELD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    calculateStaffMealRemaining();
    document.getElementById('staffMealExpenseModal').classList.add('open');
}

function closeStaffMealExpenseModal() {
    isStaffMealProcessing = false;
    lastStaffTapTime = 0;
    lastStaffTapFieldId = null;
    lastStaffTouchAutoFillTime = 0;
    document.getElementById('staffMealExpenseModal').classList.remove('open');
}

function toggleStaffMealWajbat() {
    const body = document.getElementById('staffMealSectionBody');
    const icon = document.getElementById('wajbatToggleIcon');
    if (!body) return;
    const isCollapsed = body.classList.toggle('collapsed');
    if (icon) {
        icon.classList.toggle('rotated', isCollapsed);
    }
}

function calculateStaffMealRemaining() {
    const totals = calculateCartTotals();
    const grandTotal = Math.max(0, totals.grandTotal || 0);

    let allocated = 0;
    STAFF_MEAL_FIELD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value !== '') {
            const val = parseFloat(el.value);
            if (!isNaN(val)) {
                allocated += val;
            }
        }
    });

    allocated = Math.round(allocated * 100) / 100;
    const remaining = Math.round((grandTotal - allocated) * 100) / 100;

    const remainingEl = document.getElementById('staffMealRemaining');
    if (remainingEl) {
        remainingEl.innerText = formatCurrency(Math.max(0, remaining));
        if (Math.abs(remaining) < 0.005) {
            remainingEl.style.color = "#0d9488"; // balanced (teal)
        } else if (remaining < 0) {
            remainingEl.style.color = "#ef4444"; // over-allocated (red)
        } else {
            remainingEl.style.color = "#0f766e"; // pending allocation
        }
    }
    return { grandTotal, allocated, remaining };
}

function autoFillStaffMealField(fieldId) {
    if (!STAFF_MEAL_FIELD_IDS.includes(fieldId)) return;

    const totals = calculateCartTotals();
    const grandTotal = Math.max(0, totals.grandTotal || 0);

    // Sum of all OTHER fields
    let otherSum = 0;
    STAFF_MEAL_FIELD_IDS.forEach(id => {
        if (id !== fieldId) {
            const el = document.getElementById(id);
            if (el && el.value !== '') {
                const val = parseFloat(el.value);
                if (!isNaN(val) && val > 0) {
                    otherSum += val;
                }
            }
        }
    });

    otherSum = Math.round(otherSum * 100) / 100;
    const maxAvailable = Math.max(0, Math.round((grandTotal - otherSum) * 100) / 100);

    const targetEl = document.getElementById(fieldId);
    if (targetEl) {
        if (maxAvailable > 0) {
            targetEl.value = maxAvailable.toFixed(2);
        } else {
            targetEl.value = '0.00';
        }

        calculateStaffMealRemaining();

        targetEl.classList.add('autofill-highlight');
        setTimeout(() => targetEl.classList.remove('autofill-highlight'), 400);
    }
}

function handleStaffMealTouchEnd(e, inputEl) {
    if (!inputEl) return;
    const now = Date.now();
    const timeSinceLastTap = now - lastStaffTapTime;

    // Two quick intentional taps on the same field
    if (lastStaffTapFieldId === inputEl.id && timeSinceLastTap >= 80 && timeSinceLastTap <= 450) {
        if (e && e.cancelable) {
            e.preventDefault(); // Prevent double-tap zoom
        }
        lastStaffTapTime = 0;
        lastStaffTapFieldId = null;
        lastStaffTouchAutoFillTime = now;
        autoFillStaffMealField(inputEl.id);
        return;
    }

    // First tap or tap on different field: focus normally without auto-fill
    lastStaffTapTime = now;
    lastStaffTapFieldId = inputEl.id;
}

function handleStaffMealDblClick(inputEl) {
    if (!inputEl) return;
    const now = Date.now();
    // Prevent synthetic duplicate execution if touch recently triggered it
    if (now - lastStaffTouchAutoFillTime < 600) {
        return;
    }
    autoFillStaffMealField(inputEl.id);
}

function confirmStaffMealExpense() {
    if (isStaffMealProcessing) return; // Prevent double-click multiple orders

    const totals = calculateCartTotals();
    const mgmt = parseFloat(document.getElementById('staffManagementMeals')?.value) || 0;
    const owner = parseFloat(document.getElementById('staffOwnerMeals')?.value) || 0;
    const hosp = parseFloat(document.getElementById('staffHospitality')?.value) || 0;
    const emp = parseFloat(document.getElementById('staffEmployeeMeals')?.value) || 0;

    // Negative values rejection
    if (mgmt < 0 || owner < 0 || hosp < 0 || emp < 0) {
        soundWarning && soundWarning();
        showToast && showToast(currentLang === 'ar' ? 'لا يمكن إدخال قيم سالبة' : 'Negative values are not allowed', 'danger');
        return;
    }

    const allocated = Math.round((mgmt + owner + hosp + emp) * 100) / 100;
    const targetTotal = Math.round(totals.grandTotal * 100) / 100;

    if (Math.abs(allocated - targetTotal) > 0.01) {
        soundWarning && soundWarning();
        showToast && showToast(currentLang === 'ar' ? 'يجب أن يساوي مجموع التخصيص الإجمالي' : 'Total allocated must equal order total', 'danger');
        return;
    }

    isStaffMealProcessing = true;

    const staffAllocation = {
        management: mgmt,
        owner: owner,
        hospitality: hosp,
        employee: emp
    };

    try {
        closeStaffMealExpenseModal();
        completeOrderAndShowReceipt(staffAllocation);
    } finally {
        setTimeout(() => {
            isStaffMealProcessing = false;
        }, 1200);
    }
}

// Keyboard events
document.addEventListener('keydown', (e) => {
    const payModal = document.getElementById('paymentModal');
    if (!payModal || !payModal.classList.contains('open')) return;

    if (document.activeElement && document.activeElement.tagName === 'INPUT' && !document.activeElement.readOnly) return;

    if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        pressNumpad(e.key);
    } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        pressNumpad('.');
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        pressNumpad('BACK');
    } else if (e.key === 'Escape') {
        e.preventDefault();
        closePaymentModal();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        processCheckoutPay();
    } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        pressNumpad('CLEAR');
    }
});
