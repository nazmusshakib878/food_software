const fs = require('fs');
const css = `
/* Order History Card Responsive */
@media (max-width: 768px) {
    .order-history-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
    }
    .order-history-details {
        flex-direction: column;
        width: 100%;
        gap: 10px;
    }
    .detail-row {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 8px;
    }
    .detail-label {
        margin-top: 0;
    }
    .order-history-actions {
        width: 100%;
        justify-content: flex-end;
        margin-left: 0;
    }
}
`;
fs.appendFileSync('css/style.css', '\n' + css);
