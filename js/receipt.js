/* =========================================================
   RECEIPT.JS - Thermal Receipt Rendering, ZATCA TLV QR & PDF Export
   ========================================================= */

// Official ZATCA Phase 1 TLV (Tag-Length-Value) Base64 Encoder
function generateZatcaTlvBase64(seller, vatNo, timeStr, totalStr, taxStr) {
    try {
        function getTlvBuffer(tag, value) {
            const encoder = new TextEncoder();
            const valBytes = encoder.encode(String(value || ''));
            const buf = new Uint8Array(2 + valBytes.length);
            buf[0] = tag;
            buf[1] = valBytes.length;
            buf.set(valBytes, 2);
            return buf;
        }

        const t1 = getTlvBuffer(1, seller);
        const t2 = getTlvBuffer(2, vatNo);
        const t3 = getTlvBuffer(3, timeStr);
        const t4 = getTlvBuffer(4, totalStr);
        const t5 = getTlvBuffer(5, taxStr);

        const totalLen = t1.length + t2.length + t3.length + t4.length + t5.length;
        const combined = new Uint8Array(totalLen);
        let offset = 0;
        [t1, t2, t3, t4, t5].forEach(t => {
            combined.set(t, offset);
            offset += t.length;
        });

        let binary = '';
        const len = combined.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(combined[i]);
        }
        return btoa(binary);
    } catch (e) {
        console.warn("ZATCA TLV encoding fallback:", e);
        return `Seller: ${seller} | VAT: ${vatNo} | Total: ${totalStr}`;
    }
}

function renderReceipt(order) {
    if (!order) return;

    const storeNameEn = (order.storeNameEn || (typeof storeSettings !== 'undefined' && storeSettings.nameEn) || 'NUR FOODES').toUpperCase();
    const companyAr = order.companyNameAr || order.companyName || (typeof storeSettings !== 'undefined' && (storeSettings.companyNameAr || storeSettings.companyName)) || 'شركة صح للتجارة';
    const vatNum = order.vatNumber || (typeof storeSettings !== 'undefined' && storeSettings.vatNumber) || '300987654300003';
    
    const storeEl = document.getElementById('recStoreName');
    if (storeEl) storeEl.innerText = storeNameEn;
    const compEl = document.getElementById('recCompanyName');
    if (compEl) compEl.innerText = companyAr;
    const vatEl = document.getElementById('recVatNumber');
    if (vatEl) vatEl.innerText = `VAT: ${vatNum}`;
    
    // Clean order number without leading #
    const rawOrderNum = order.id || `ORD-${order.seq || '1013'}`;
    const orderNumEl = document.getElementById('recOrderNum');
    if (orderNumEl) orderNumEl.innerText = String(rawOrderNum).replace(/^#/, '');

    // Historical Date/Time: prefer saved order.dateFormatted or format original order.date
    let dtDisplay = order.dateFormatted;
    if (!dtDisplay && order.date) {
        try {
            dtDisplay = new Date(order.date).toLocaleString((typeof currentLang !== 'undefined' && currentLang === 'ar') ? 'ar-SA' : 'en-US');
        } catch (e) {
            dtDisplay = String(order.date);
        }
    }
    const dtEl = document.getElementById('recDateTime');
    if (dtEl) dtEl.innerText = dtDisplay || new Date().toLocaleString('en-US');

    // Clean order type display (matching Image 1 e.g. DINE-IN (Table 1))
    let typeDisplay;
    if (order.type === 'dine_in' || order.type === 'local' || order.orderTypeId === 'local') {
        const tableNum = (order.table && order.table !== '-') ? order.table : 'Table 1';
        typeDisplay = `DINE-IN (${tableNum})`;
    } else if (order.type === 'takeaway' || order.type === 'receive' || order.orderTypeId === 'receive') {
        typeDisplay = `TAKEAWAY`;
    } else if (order.type === 'delivery' || order.orderTypeId === 'delivery') {
        typeDisplay = `DELIVERY`;
    } else if (order.type === 'cars' || order.orderTypeId === 'cars') {
        typeDisplay = `CARS`;
    } else if (order.type === 'delivery_d' || order.orderTypeId === 'delivery_d') {
        typeDisplay = `DELIVERY D`;
    } else {
        typeDisplay = String(order.type || order.orderType || 'DINE-IN').toUpperCase();
    }
    const typeEl = document.getElementById('recOrderType');
    if (typeEl) typeEl.innerText = typeDisplay;

    const cashierEl = document.getElementById('recCashier');
    if (cashierEl) {
        cashierEl.innerText = order.cashier || (typeof currentUser !== 'undefined' && currentUser ? (currentUser.name || currentUser.nameEn) : 'Cashier') || 'Nawaf Saeed';
    }

    const tbody = document.getElementById('recItemsTbody');
    if (tbody) {
        tbody.innerHTML = (order.items || []).map(item => {
            const addonsTotal = (item.addons && item.addons.length)
                ? item.addons.reduce((sum, a) => sum + (Number(a.price) || 0), 0)
                : 0;
            const unitPriceWithAddons = Number(item.price) + addonsTotal;
            const lineTotal = item.total !== undefined ? Number(item.total) : (unitPriceWithAddons * Number(item.qty));

            const addonsHtml = (item.addons && item.addons.length)
                ? `<div class="rec-addon-line">+ ${item.addons.map(a => `${escapeHtml(a.nameAr || a.nameEn)} (+${Number(a.price).toFixed(2)})`).join(', ')}</div>`
                : '';
            const modifiersHtml = (item.modifiers && item.modifiers.length)
                ? item.modifiers.map(m => {
                    const label = escapeHtml(((typeof currentLang !== 'undefined' && currentLang === 'ar') && m.labelAr) ? m.labelAr : (m.labelEn || m.labelAr || ''));
                    const qtyText = (m.qty && m.qty > 1) ? ` x${m.qty}` : '';
                    const priceText = (Number(m.price) > 0) ? ` (+${Number(m.price).toFixed(2)})` : '';
                    return `<div class="rec-addon-line" style="color: #555; padding-inline-start: 12px;">+ ${label}${qtyText}${priceText}</div>`;
                }).join('')
                : '';
            const noteHtml = item.note
                ? `<div class="rec-note-line">* ${escapeHtml(item.note)}</div>`
                : '';

            const arText = item.arName || '';
            const enText = item.enName || item.name || '';

            return `
                <tr>
                    <td class="td-item">
                        <div class="rec-item-name-cell">
                            <span class="rec-ar" dir="rtl">${escapeHtml(arText)}</span>
                            <span class="rec-en">${escapeHtml(enText)}</span>
                        </div>
                        ${addonsHtml}
                        ${modifiersHtml}
                        ${noteHtml}
                    </td>
                    <td class="col-qty" style="vertical-align: top;">${item.qty}</td>
                    <td class="col-total" style="vertical-align: top;">${lineTotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="border-bottom: 1px solid #000; padding: 0; margin: 0; height: 6px;"></td>
                </tr>
            `;
        }).join('');
    }

    const subEl = document.getElementById('recSubtotal');
    if (subEl) subEl.innerText = (order.subtotal !== undefined ? Number(order.subtotal) : 0).toFixed(2);
    
    const taxEl = document.getElementById('recTax');
    if (taxEl) taxEl.innerText = (order.tax !== undefined ? Number(order.tax) : 0).toFixed(2);
    
    const discEl = document.getElementById('recDiscount');
    if (discEl) discEl.innerText = (order.discount !== undefined ? Number(order.discount) : 0).toFixed(2);

    // Support both order.grandTotal (from payment.js) and order.total fallback
    const grandTotal = Number(order.grandTotal !== undefined ? order.grandTotal : (order.total || 0));
    const grandEl = document.getElementById('recGrandTotal');
    if (grandEl) grandEl.innerText = `SAR ${grandTotal.toFixed(2)}`;

    const methodEl = document.getElementById('recMethod');
    if (methodEl) methodEl.innerText = order.method || order.payMethod || order.paymentMethod || 'Cash';

    const paidEl = document.getElementById('recPaid');
    if (paidEl) paidEl.innerText = Number(order.paid !== undefined ? order.paid : (order.amountPaid !== undefined ? order.amountPaid : grandTotal || 0)).toFixed(2);

    const changeEl = document.getElementById('recChange');
    if (changeEl) changeEl.innerText = Number(order.change !== undefined ? order.change : (order.changeReturn || 0)).toFixed(2);

    // Net before VAT display
    const netEl = document.getElementById('recNet');
    if (netEl) {
        const netVal = Number(order.netBeforeVat !== undefined ? order.netBeforeVat : (order.taxableAmount !== undefined ? order.taxableAmount : (grandTotal - (Number(order.tax) || 0))));
        netEl.innerText = netVal.toFixed(2);
    }

    const trDisplay = order.taxRate !== undefined && order.taxRate !== null ? order.taxRate : ((typeof storeSettings !== 'undefined' && storeSettings.taxRate !== undefined) ? storeSettings.taxRate : 15);
    const taxLbl = document.getElementById('recTaxLabel');
    if (taxLbl) {
        taxLbl.innerText = (typeof currentLang !== 'undefined' && currentLang === 'ar') ? `ضريبة القيمة المضافة المتضمنة (${trDisplay}%):` : `Included VAT (${trDisplay}%):`;
    }

    // Demo / Sample Badge for explicit non-fiscal receipts
    let demoBadge = document.getElementById('recDemoBadge');
    if (order.isDemo || order.isSample) {
        if (!demoBadge) {
            demoBadge = document.createElement('div');
            demoBadge.id = 'recDemoBadge';
            demoBadge.className = 'rec-demo-badge';
            demoBadge.style.cssText = 'border: 1px dashed #d97706; background: #fffbeb; color: #b45309; font-size: 10px; font-weight: 800; text-align: center; padding: 3px 6px; margin: 4px 0; border-radius: 4px;';
            const hdr = document.querySelector('.receipt-header') || document.getElementById('thermalReceiptNode');
            if (hdr) hdr.appendChild(demoBadge);
        }
        demoBadge.style.display = 'block';
        demoBadge.innerText = (typeof currentLang !== 'undefined' && currentLang === 'ar') ? '*** فاتورة تجريبية - ليست إشعاراً ضريبياً ***' : '*** SAMPLE / DEMO - NOT A TAX RECEIPT ***';
    } else if (demoBadge) {
        demoBadge.style.display = 'none';
    }

    // Dynamic ZATCA-compliant QR Code generation
    const qrContainer = document.getElementById('receiptQr');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        const zatcaBase64 = generateZatcaTlvBase64(
            order.companyName || order.companyNameAr || (typeof storeSettings !== 'undefined' && (storeSettings.companyName || storeSettings.nameAr)) || 'Nur Foodes',
            order.vatNumber || (typeof storeSettings !== 'undefined' && storeSettings.vatNumber) || '300987654300003',
            order.date || new Date().toISOString(),
            grandTotal.toFixed(2),
            (order.tax !== undefined ? Number(order.tax) : 0).toFixed(2)
        );

        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: zatcaBase64,
                    width: 110,
                    height: 110,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });

                // Ensure an <img> element with dataURL exists for reliable iframe outerHTML printing
                setTimeout(() => {
                    try {
                        const cvs = qrContainer.querySelector('canvas');
                        if (cvs && typeof cvs.toDataURL === 'function') {
                            let img = qrContainer.querySelector('img');
                            if (!img) {
                                img = document.createElement('img');
                                qrContainer.appendChild(img);
                            }
                            img.src = cvs.toDataURL('image/png');
                            img.style.display = 'block';
                            img.style.margin = '0 auto';
                        }
                    } catch (qe) {}
                }, 50);
            }
        } catch (e) {
            console.warn("QR Code Generation Error:", e);
        }
    }
}

function printReceiptDirect() {
    // Direct native window print: Since #receiptModal is already open, printing the main window is 100% reliable and never produces blank pages in Chrome/Edge.
    window.print();
}

function downloadReceiptPdf() {
    const node = document.getElementById('thermalReceiptNode');
    if (!node) return;

    const orderNum = (document.getElementById('recOrderNum')?.innerText || 'Order').replace(/^#/, '');

    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'جاري إنشاء ملف PDF وتنزيله...' : 'Generating and downloading PDF...', 'info');
    }

    const opt = {
        margin: [4, 2, 4, 2],
        filename: `Receipt-${orderNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: [80, 297], orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(node).save().then(() => {
            if (typeof showToast === 'function') {
                showToast(currentLang === 'ar' ? 'تم تنزيل ملف الفاتورة PDF بنجاح!' : 'Receipt PDF downloaded successfully!', 'success');
            }
        }).catch(err => {
            console.warn("html2pdf fallback to native print:", err);
            window.print();
        });
    } else {
        window.print();
    }
}

function getKitchenOrderTicketHtml(targetOrder) {
    const order = targetOrder || lastCompletedOrder || (typeof orders !== 'undefined' ? orders[0] : null);
    if (!order) return '';

    const rawOrderNum = order.id || `ORD-${order.seq || '1013'}`;
    const orderId = rawOrderNum.replace(/^#/, '');

    let typeDisplay;
    if (order.type === 'dine_in' || order.type === 'local' || order.orderTypeId === 'local') {
        const tableNum = (order.table && order.table !== '-') ? order.table : 'Table 1';
        typeDisplay = `DINE-IN (${tableNum})`;
    } else if (order.type === 'takeaway' || order.type === 'receive' || order.orderTypeId === 'receive') {
        typeDisplay = `TAKEAWAY`;
    } else if (order.type === 'delivery' || order.orderTypeId === 'delivery') {
        typeDisplay = `DELIVERY`;
    } else if (order.type === 'cars' || order.orderTypeId === 'cars') {
        typeDisplay = `CARS`;
    } else if (order.type === 'delivery_d' || order.orderTypeId === 'delivery_d') {
        typeDisplay = `DELIVERY D`;
    } else {
        typeDisplay = String(order.type || order.orderType || 'DINE-IN').toUpperCase();
    }

    const kitchenPrinter = (typeof printers !== 'undefined' && Array.isArray(printers)) ? printers.find(p => p.role === 'kitchen') : null;
    const disabledCategories = kitchenPrinter && Array.isArray(kitchenPrinter.disabledCategories) ? kitchenPrinter.disabledCategories : [];
    const filteredItems = (order.items || []).filter(item => !disabledCategories.includes(item.catId));

    if (filteredItems.length === 0) return '';

    const itemsHtml = filteredItems.map(item => {
        const addonsHtml = (item.addons && item.addons.length)
            ? `<div class="kot-addon-line">+ ${item.addons.map(a => escapeHtml(a.nameAr ? `${a.nameAr} / ${a.nameEn || ''}` : (a.nameEn || ''))).join(', ')}</div>`
            : '';
        const modifiersHtml = (item.modifiers && item.modifiers.length)
            ? item.modifiers.map(m => {
                const label = escapeHtml(m.labelAr ? `${m.labelAr} / ${m.labelEn || ''}` : (m.labelEn || ''));
                const qtyText = (m.qty && m.qty > 1) ? ` x${m.qty}` : '';
                return `<div class="kot-addon-line" style="color: #444; padding-inline-start: 12px;">+ ${label}${qtyText}</div>`;
            }).join('')
            : '';
        const noteHtml = item.note
            ? `<div class="kot-note-line">** NOTE: ${escapeHtml(item.note)} **</div>`
            : '';

        const arText = item.arName || '';
        const enText = item.enName || item.name || '';

        return `
            <div class="kot-item-row" dir="${currentLang === 'ar' ? 'rtl' : 'ltr'}">
                <span class="kot-qty-badge">${item.qty}X</span>
                <div class="kot-item-details">
                    <div class="kot-item-name">${escapeHtml(arText || enText)}</div>
                    ${arText && enText ? `<div class="kot-item-subname">${escapeHtml(enText)}</div>` : ''}
                    ${addonsHtml}
                    ${modifiersHtml}
                    ${noteHtml}
                </div>
            </div>
            <div style="border-bottom: 1px solid #000; margin: 4px 0 8px 0;"></div>
        `;
    }).join('');

    const kotHeaderTitle = currentLang === 'ar' ? '*** تذكرة تجهيز المطبخ (KOT) ***' : '*** Kitchen Order Ticket (KOT) ***';
    const kotFooterNotice = currentLang === 'ar' ? '[ شاشة المطبخ - جاهز للطهي ]' : '[ Kitchen Display - Ready to Cook ]';
    const timeLabel = currentLang === 'ar' ? 'الوقت:' : 'Time:';
    const cashierLabel = currentLang === 'ar' ? 'الكاشير:' : 'Cashier:';
    const timeStr = order.dateFormatted || new Date().toLocaleString();
    const cashierName = order.cashier || (typeof currentUser !== 'undefined' ? currentUser.name : 'Cashier') || 'Cashier';

    return `
        <div class="kot-header">
            <div class="kot-title">${kotHeaderTitle}</div>
            <div class="kot-order-num">${orderId}</div>
            <div class="kot-type-badge">${typeDisplay}</div>
            <div class="kot-meta-row">
                <span>${timeLabel} ${timeStr}</span>
                <span>${cashierLabel} ${cashierName}</span>
            </div>
        </div>
        <div class="kot-items-list">
            ${itemsHtml}
        </div>
        <div class="kot-footer">
            ${kotFooterNotice}
        </div>
    `;
}

function renderKitchenTicket(order) {
    if (!order) return;
    const node = document.getElementById('thermalKitchenNode');
    if (node) {
        node.innerHTML = getKitchenOrderTicketHtml(order);
    }
}

function previewKitchenTicket(orderId) {
    const order = (typeof orders !== 'undefined') ? orders.find(o => o.id === orderId) : null;
    if (!order) return;
    renderKitchenTicket(order);
    const modal = document.getElementById('kitchenTicketModal');
    if (modal) modal.classList.add('open');
}

function closeKitchenTicketModal() {
    document.getElementById('kitchenTicketModal')?.classList.remove('open');
}

function printKitchenTicketDirect() {
    window.print();
}





function closeReceiptModal() {
    document.getElementById('receiptModal')?.classList.remove('open');
}

function previewExistingOrderReceipt(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    lastCompletedOrder = order;
    renderReceipt(order);
    document.getElementById('receiptModal')?.classList.add('open');
}

function previewSampleTaxInvoice() {
    const sample = (typeof SAMPLE_ORD_1013 !== 'undefined') ? SAMPLE_ORD_1013 : {
        id: "ORD-1013",
        seq: 1013,
        date: "2026-09-07T16:13:05",
        dateFormatted: "9/7/2026, 4:13:05 PM",
        type: "dine_in",
        orderType: "DINE-IN (Table 1)",
        orderTypeId: "local",
        table: "Table 1",
        cashier: "Nawaf Saeed",
        customer: "Walk-in Customer",
        paymentMethod: "cash",
        paidAmount: 206.43,
        change: 0.00,
        subtotal: 179.50,
        tax: 26.93,
        discount: 0.00,
        total: 206.43,
        items: [
            { id: "item_meat_burger", name: "Meat Burger", enName: "Meat Burger", arName: "برجر لحم", price: 13.50, qty: 5, total: 67.50 },
            { id: "item_chicken_strips_meal", name: "Chicken Strips Meal", enName: "Chicken Strips Meal", arName: "وجبة دجاج استربس", price: 18.50, qty: 1, total: 18.50 },
            { id: "item_tandoori", name: "Tandoori", enName: "Tandoori", arName: "تندوري", price: 10.50, qty: 1, total: 10.50 },
            { id: "item_fish_sandwich", name: "Fish sandwich", enName: "Fish sandwich", arName: "سمك", price: 9.50, qty: 1, total: 9.50 },
            { id: "item_shish_tawooq", name: "Shish Tawooq", enName: "Shish Tawooq", arName: "شيش طاووق", price: 9.50, qty: 5, total: 47.50 },
            { id: "item_chicken_strips_burger", name: "Chicken Strips Burger", enName: "Chicken Strips Burger", arName: "برجر دجاج استربس", price: 12.50, qty: 1, total: 12.50 },
            { id: "item_mineral_water", name: "Mineral Water", enName: "Mineral Water", arName: "مياه معدنية", price: 1.50, qty: 1, total: 1.50 },
            { id: "item_large_fries", name: "Large Fries", enName: "Large Fries", arName: "بطاطس كبير", price: 6.00, qty: 2, total: 12.00 }
        ]
    };
    renderReceipt(sample);
    const modal = document.getElementById('receiptModal');
    if (modal) modal.classList.add('open');
}
