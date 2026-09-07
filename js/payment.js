/* =========================================================
   PAYMENT.JS - Numpad, Payment Calculation & Checkout Engine
   ========================================================= */

function openPaymentModal() {
    if (currentCart.length === 0) {
        soundWarning();
        showToast(currentLang === 'ar' ? "يرجى إضافة أصناف إلى الطلب أولاً" : "Add items to order first", "danger");
        return;
    }

    const totals = calculateCartTotals();
    paymentInput = '';
    
    document.getElementById('payModalTotal').innerText = formatCurrency(totals.grandTotal);
    updatePaymentModalUI(totals.grandTotal);
    document.getElementById('paymentModal').classList.add('open');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('open');
}

function selectPayMethod(method, el) {
    selectedPayMethod = method;
    document.querySelectorAll('.pay-method-radio').forEach(r => {
        r.classList.remove('active');
        const dot = r.querySelector('.radio-dot');
        if (dot) dot.className = 'radio-dot fa-regular fa-circle';
    });
    el.classList.add('active');
    const activeDot = el.querySelector('.radio-dot');
    if (activeDot) activeDot.className = 'radio-dot fa-solid fa-circle-check';

    const totals = calculateCartTotals();
    if (method !== 'Cash') {
        // Digital / Card payments require exact transaction amount (no cash change)
        paymentInput = totals.grandTotal.toFixed(2);
    } else if (paymentInput === totals.grandTotal.toFixed(2)) {
        // Reset to allow cash typing if exact
        paymentInput = '';
    }
    updatePaymentModalUI(totals.grandTotal);
}

function pressNumpad(key) {
    if (key === 'CLEAR') {
        paymentInput = '';
    } else if (key === 'BACK') {
        paymentInput = paymentInput.slice(0, -1);
    } else if (key === '.') {
        if (paymentInput === '') {
            paymentInput = '0.';
        } else if (!paymentInput.includes('.')) {
            paymentInput += '.';
        }
    } else {
        // Digits
        if (paymentInput === '0' && key === '0') {
            return;
        }
        if (paymentInput === '0') {
            paymentInput = key;
        } else {
            // Prevent entering more than 2 decimal digits
            if (paymentInput.includes('.')) {
                const parts = paymentInput.split('.');
                if (parts[1] && parts[1].length >= 2) {
                    return; // already 2 decimals
                }
            }
            paymentInput += key;
        }
    }

    const totals = calculateCartTotals();
    updatePaymentModalUI(totals.grandTotal);
}

function pressNumpadQuick(val) {
    const totals = calculateCartTotals();
    if (val === 'EXACT') {
        paymentInput = totals.grandTotal.toFixed(2);
    } else {
        paymentInput = String(val);
    }
    updatePaymentModalUI(totals.grandTotal);
}

function updatePaymentModalUI(grandTotal) {
    const isExactDefault = paymentInput === '';
    const paid = isExactDefault ? grandTotal : (parseFloat(paymentInput) || 0);
    const change = Math.round((paid - grandTotal) * 100) / 100;

    const paidEl = document.getElementById('payModalPaid');
    const changeEl = document.getElementById('payModalChange');
    const changeLabel = document.getElementById('changeLabel');

    if (paidEl) paidEl.innerText = formatCurrency(paid);

    if (changeLabel && changeEl) {
        if (change >= 0) {
            changeLabel.innerText = currentLang === 'ar' ? "المبلغ المتبقي للعميل" : "Change Return";
            changeEl.innerText = formatCurrency(change);
            changeEl.style.color = "var(--success)";
        } else {
            changeLabel.innerText = currentLang === 'ar' ? "المبلغ المتبقي على العميل" : "Remaining Due";
            changeEl.innerText = formatCurrency(Math.abs(change));
            changeEl.style.color = "var(--danger)";
        }
    }
}

function completeOrderAndShowReceipt() {
    const totals = calculateCartTotals();
    if (currentCart.length === 0) {
        soundWarning();
        showToast(currentLang === 'ar' ? "السلة فارغة!" : "Cart is empty!", "danger");
        return;
    }

    const isExactDefault = paymentInput === '';
    const paid = isExactDefault ? totals.grandTotal : (parseFloat(paymentInput) || 0);

    // Floating-point safe comparison
    if (Math.round(paid * 100) < Math.round(totals.grandTotal * 100)) {
        soundWarning();
        showToast(currentLang === 'ar' ? "المبلغ المدفوع أقل من إجمالي الفاتورة!" : "Paid amount is less than total!", "danger");
        return;
    }

    // Determine table: Dine-in has table; Takeaway & Delivery have '-'
    const tableVal = (currentOrderTypeId === 'local' || currentOrderType === 'dine_in')
        ? (document.getElementById('tableSelect')?.value || 'Table 1')
        : '-';

    const customerObj = (typeof customers !== 'undefined' && Array.isArray(customers)) 
        ? customers.find(c => c.id === currentCustomerId) 
        : null;
    const orderTypeObj = (typeof orderTypes !== 'undefined' && Array.isArray(orderTypes)) 
        ? orderTypes.find(t => t.id === currentOrderTypeId) 
        : null;

    const orderRecord = {
        id: `ORD-${nextOrderSeq}`,
        seq: nextOrderSeq,
        date: new Date().toISOString(),
        dateFormatted: new Date().toLocaleString(currentLang === 'ar' ? 'ar-SA' : 'en-US'),
        type: currentOrderType,
        table: tableVal,
        customer: customerObj ? (currentLang === 'ar' ? customerObj.nameAr : customerObj.nameEn) : 'عميل نقدي',
        customerId: currentCustomerId,
        orderType: orderTypeObj ? (currentLang === 'ar' ? orderTypeObj.nameAr : orderTypeObj.nameEn) : 'محلي',
        orderTypeId: currentOrderTypeId,
        notes: currentOrderNotes,
        phone: currentClientPhone,
        status: 'new', // KDS order tracking: 'new' | 'preparing' | 'ready' | 'served'
        cashier: currentUser.name || 'Cashier',
        // Lightweight items copy with modifiers and kitchen notes
        items: currentCart.map(i => ({
            id: i.id,
            arName: i.arName,
            enName: i.enName,
            price: i.price,
            qty: i.qty,
            addons: (i.addons && i.addons.length) ? i.addons.map(a => ({ ...a })) : [],
            note: i.note || ''
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.grandTotal,
        paid: paid,
        change: Math.max(0, Math.round((paid - totals.grandTotal) * 100) / 100),
        method: selectedPayMethod
    };

    orders.unshift(orderRecord);
    nextOrderSeq += 1;
    persistData();
    updatePosOrderBadge();
    soundSuccess();

    // Celebration Confetti
    try {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    } catch (e) {}

    lastCompletedOrder = orderRecord;
    closePaymentModal();
    closeMobileCart();

    // Reset Table Selection back to Table 1 for next customer
    const tableSelect = document.getElementById('tableSelect');
    if (tableSelect) tableSelect.value = 'Table 1';

    // Reset Cart and Notes for Next Sale
    currentCart = [];
    currentOrderNotes = '';
    currentClientPhone = '';
    customDiscount = 0;
    paymentInput = '';
    renderCart();
    renderProducts();

    showToast(currentLang === 'ar' ? "تم تسجيل الطلب والدفع بنجاح!" : "Order completed successfully!", "success");
    renderReceipt(orderRecord);
    document.getElementById('receiptModal')?.classList.add('open');

    // Automatic Printing if enabled
    if (posPreferences && posPreferences.autoPrint && typeof routePrintJob === 'function') {
        setTimeout(() => {
            const receiptNode = document.getElementById('thermalReceiptNode');
            if (receiptNode) {
                routePrintJob('cashier', receiptNode.innerHTML, `Receipt #${orderRecord.seq}`);
            }
        }, 500);
    }
}

// Physical Keyboard & POS Numpad Hardware Event Listener
document.addEventListener('keydown', (e) => {
    const payModal = document.getElementById('paymentModal');
    if (!payModal || !payModal.classList.contains('open')) return;

    // Do not interfere if user is typing into an input field
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

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
        completeOrderAndShowReceipt();
    } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        pressNumpad('CLEAR');
    }
});
