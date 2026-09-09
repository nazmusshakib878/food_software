const fs = require('fs');
const css = `
/* Order History Actions Responsive Tweaks */
@media (max-width: 600px) {
    .order-history-actions {
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
    }
    .action-btn {
        flex: 1 1 calc(50% - 8px); /* 2 buttons per row */
        text-align: center;
        padding: 8px 4px;
        font-size: 12px;
    }
}
`;
fs.appendFileSync('css/style.css', '\n' + css);
