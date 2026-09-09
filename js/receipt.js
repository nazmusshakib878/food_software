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

    const storeNameEn = (storeSettings.nameEn || 'NUR FOODES').toUpperCase();
    const companyAr = storeSettings.companyNameAr || storeSettings.companyName || 'شركة صح للتجارة';
    document.getElementById('recStoreName').innerText = storeNameEn;
    document.getElementById('recCompanyName').innerText = companyAr;
    document.getElementById('recVatNumber').innerText = `VAT: ${storeSettings.vatNumber || '300987654300003'}`;
    
    // Clean order number without leading #
    const rawOrderNum = order.id || `ORD-${order.seq || '1013'}`;
    document.getElementById('recOrderNum').innerText = rawOrderNum.replace(/^#/, '');
    document.getElementById('recDateTime').innerText = order.dateFormatted || new Date().toLocaleString('en-US');

    // Clean order type display (matching Image 1 e.g. DINE-IN (Table 1))
    let typeDisplay;
    if (order.type === 'dine_in' || order.orderTypeId === 'local') {
        const tableNum = (order.table && order.table !== '-') ? order.table : 'Table 1';
        typeDisplay = `DINE-IN (${tableNum})`;
    } else if (order.type === 'takeaway' || order.orderTypeId === 'receive') {
        typeDisplay = `TAKEAWAY`;
    } else if (order.type === 'delivery' || order.orderTypeId === 'delivery') {
        typeDisplay = `DELIVERY`;
    } else {
        typeDisplay = String(order.type || order.orderType || 'DINE-IN').toUpperCase();
    }
    document.getElementById('recOrderType').innerText = typeDisplay;
    document.getElementById('recCashier').innerText = order.cashier || currentUser.name || 'Nawaf Saeed';

    const tbody = document.getElementById('recItemsTbody');
    if (tbody) {
        tbody.innerHTML = (order.items || []).map(item => {
            const addonsTotal = (item.addons && item.addons.length)
                ? item.addons.reduce((sum, a) => sum + (Number(a.price) || 0), 0)
                : 0;
            const unitPriceWithAddons = Number(item.price) + addonsTotal;
            const lineTotal = unitPriceWithAddons * Number(item.qty);

            const addonsHtml = (item.addons && item.addons.length)
                ? `<div class="rec-addon-line">+ ${item.addons.map(a => `${escapeHtml(a.nameAr || a.nameEn)} (+${Number(a.price).toFixed(2)})`).join(', ')}</div>`
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
                        ${noteHtml}
                    </td>
                    <td class="col-qty">${item.qty}</td>
                    <td class="col-total">${lineTotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('recSubtotal').innerText = (order.subtotal || 0).toFixed(2);
    document.getElementById('recTax').innerText = (order.tax || 0).toFixed(2);
    document.getElementById('recDiscount').innerText = (order.discount || 0).toFixed(2);
    document.getElementById('recGrandTotal').innerText = `SAR ${(order.total || 0).toFixed(2)}`;
    document.getElementById('recMethod').innerText = order.method || 'Cash';
    document.getElementById('recPaid').innerText = (order.paid || order.total || 0).toFixed(2);
    document.getElementById('recChange').innerText = (order.change || 0).toFixed(2);

    // Dynamic ZATCA-compliant QR Code generation
    const qrContainer = document.getElementById('receiptQr');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        const zatcaBase64 = generateZatcaTlvBase64(
            storeSettings.companyName || storeSettings.nameAr || 'Nur Foodes',
            storeSettings.vatNumber || '300987654300003',
            order.date || new Date().toISOString(),
            (order.total || 0).toFixed(2),
            (order.tax || 0).toFixed(2)
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
            }
        } catch (e) {
            console.warn("QR Code Generation Error:", e);
        }
    }

    // Populate the Combined KOT Section
    // Populate the Combined KOT Section
    const kotSection = document.getElementById('receiptCombinedKotSection');
    const kotContent = document.getElementById('receiptCombinedKotContent');
    if (kotSection && kotContent) {
        try {
            const kotHtml = getKitchenOrderTicketHtml(order);
            if (kotHtml && kotHtml.trim() !== '') {
                kotContent.innerHTML = kotHtml;
                kotSection.style.display = 'block';
            } else {
                kotSection.style.display = 'none';
            }
        } catch (e) {
            console.error("Error generating KOT HTML:", e);
            kotSection.style.display = 'none';
        }
    }
}

function printReceiptDirect() {
    const node = document.getElementById('thermalReceiptNode');
    if (node && typeof routePrintJob === 'function') {
        routePrintJob('cashier', node.outerHTML, 'Tax Invoice Receipt & KOT');
    } else {
        window.print();
    }
}

function getKitchenOrderTicketHtml(targetOrder) {
    const order = targetOrder || lastCompletedOrder || (typeof orders !== 'undefined' ? orders[0] : null);
    if (!order) return '';

    const typeStr = (order.type === 'dine_in')
        ? (currentLang === 'ar' ? `محلي - طاولة ${order.table && order.table !== '-' ? order.table : '1'}` : `Dine-in - Table ${order.table && order.table !== '-' ? order.table : '1'}`)
        : (order.type === 'takeaway' ? (currentLang === 'ar' ? 'سفري' : 'Takeaway') : (currentLang === 'ar' ? 'توصيل' : 'Delivery'));

    const itemsHtml = (order.items || []).map(item => {
        const addonsHtml = (item.addons && item.addons.length)
            ? `<div style="font-size: 13px; font-weight: bold; margin-top: 2px;">+ ${item.addons.map(a => escapeHtml(currentLang === 'ar' ? (a.nameAr || a.nameEn) : (a.nameEn || a.nameAr))).join(', ')}</div>`
            : '';
        const notePrefix = currentLang === 'ar' ? '** ملاحظة: ' : '** Note: ';
        const noteHtml = item.note
            ? `<div style="font-size: 13px; font-weight: 900; background: #000; color: #fff; padding: 2px 6px; display: inline-block; margin-top: 4px; border-radius: 3px;">${notePrefix}${escapeHtml(item.note)} **</div>`
            : '';

        return `
            <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; border-bottom: 1px dashed #777; padding-bottom: 8px; text-align: ${currentLang === 'ar' ? 'right' : 'left'};" dir="${currentLang === 'ar' ? 'rtl' : 'ltr'}">
                <span style="font-size: 20px; font-weight: 900; border: 2px solid #000; padding: 2px 8px; border-radius: 4px; line-height: 1.1;">
                    ${item.qty}X
                </span>
                <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: 900;">${escapeHtml(currentLang === 'ar' ? item.arName : item.enName)}</div>
                    <div style="font-size: 13px; font-weight: 700; color: #444;">${escapeHtml(currentLang === 'ar' ? item.enName : item.arName)}</div>
                    ${addonsHtml}
                    ${noteHtml}
                </div>
            </div>
        `;
    }).join('');

    const kotHeaderTitle = currentLang === 'ar' ? '*** تذكرة تجهيز المطبخ ***' : '*** Kitchen Order Ticket (KOT) ***';
    const kotFooterNotice = currentLang === 'ar' ? '[ شاشة المطبخ - جاهز للطهي ]' : '[ Kitchen Display - Ready to Cook ]';
    const timeLabel = currentLang === 'ar' ? 'الوقت:' : 'Time:';
    const cashierLabel = currentLang === 'ar' ? 'الكاشير:' : 'Cashier:';

    return `
        <div class="kot-header" style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px;">
            <div style="font-size: 14px; font-weight: 900;">${kotHeaderTitle}</div>
            <div style="font-size: 28px; font-weight: 900; margin: 4px 0;">${order.id}</div>
            <div style="display: inline-block; border: 2px solid #000; padding: 4px 12px; font-size: 14px; font-weight: 900; border-radius: 6px; margin: 4px 0;">${typeStr}</div>
            <div style="font-size: 11px; margin-top: 4px;">${timeLabel} ${order.dateFormatted || new Date().toLocaleString()}</div>
            <div style="font-size: 11px;">${cashierLabel} ${order.cashier || 'Cashier'}</div>
        </div>
        <div>
            ${itemsHtml}
        </div>
        <div style="text-align: center; margin-top: 14px; font-size: 11px; border-top: 1px solid #000; padding-top: 6px;">
            ${kotFooterNotice}
        </div>
    `;
}



function downloadReceiptPDF() {
    const element = document.getElementById('thermalReceiptNode');
    if (!element) return;

    const orderId = (lastCompletedOrder ? (lastCompletedOrder.id || 'ORD-1013') : (document.getElementById('recOrderNum')?.innerText || 'ORD-1013')).replace(/^#/, '');
    showToast(currentLang === 'ar' ? "جاري إنشاء وتحميل ملف PDF الفاتورة..." : "Generating PDF invoice...", "success");

    // Remove box shadow and margin bleed temporarily during capture to prevent height overflow
    const prevShadow = element.style.boxShadow;
    const prevMargin = element.style.margin;
    element.style.boxShadow = 'none';
    element.style.margin = '0 auto';

    // Measure exact element dimensions for dynamic single 80mm thermal roll page
    const elemWidth = element.offsetWidth || 280;
    const elemHeight = element.scrollHeight || element.offsetHeight || 500;
    const printableWidth = 76; // 80mm roll with 2mm margins each side (80 - 4 = 76mm)
    const contentHeightMm = printableWidth * (elemHeight / elemWidth);
    // Generous height buffer so the receipt never spills into a 2nd page
    const pageHeightMm = Math.max(140, Math.ceil(contentHeightMm + 18));

    const opt = {
        margin: [2, 2, 2, 2],
        filename: `Receipt-${orderId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: [80, pageHeightMm], orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
    };

    const cleanup = () => {
        element.style.boxShadow = prevShadow;
        element.style.margin = prevMargin;
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
            // Strict 1-Page Guarantee: delete any trailing blank pages
            const totalPages = pdf.internal.getNumberOfPages();
            if (totalPages > 1) {
                for (let p = totalPages; p > 1; p--) {
                    pdf.deletePage(p);
                }
            }
        }).save().then(() => {
            cleanup();
            showToast(currentLang === 'ar' ? "تم تحميل الفاتورة بنجاح!" : "Receipt PDF downloaded!", "success");
        }).catch(err => {
            cleanup();
            console.error("PDF generation failed:", err);
            showToast(currentLang === 'ar' ? "حدث خطأ أثناء تحميل PDF، جاري فتح الطباعة المباشرة" : "PDF failed. Opening direct print...", "danger");
            window.print();
        });
    } else {
        cleanup();
        window.print();
    }
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
