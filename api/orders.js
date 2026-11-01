// POST /api/orders
// Protected Backend Endpoint enforcing Role-Based Order Validation
const authService = require('./_auth_service');

const AUTHORIZED_PARTNERS = [
    'hungerstation', 'jahiz', 'ninja', 'keeta', 'mrsool', 'toyou', 'thechefz', 'management', 'mosque'
];

const STANDARD_ORDER_TYPES = [
    'delivery', 'local', 'receive', 'cars', 'delivery_d'
];

module.exports = async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        res.setHeader('Allow', ['POST', 'GET']);
        return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }

    const cookies = authService.parseCookies(req.headers.cookie);
    let token = cookies['nurpos_session'];

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Session required' });
    }

    const session = authService.getSession(token);
    if (!session) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Session expired or invalid' });
    }

    const user = session.user;

    // Handle GET for health / session check on orders endpoint
    if (req.method === 'GET') {
        return res.status(200).json({
            success: true,
            user: { id: user.id, name: user.name, role: user.role }
        });
    }

    // Process POST order validation
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
        }
    }

    const customerId = (body?.customerId || 'cash').toLowerCase();
    const orderTypeId = (body?.orderTypeId || 'delivery').toLowerCase();

    // 1. Validate Order Type (Must be one of the five standard order types)
    if (!STANDARD_ORDER_TYPES.includes(orderTypeId)) {
        return res.status(400).json({
            success: false,
            error: `Invalid order type '${orderTypeId}'. Must be one of: ${STANDARD_ORDER_TYPES.join(', ')}`
        });
    }

    // 2. Strict Role-Based Validation for Staff
    // Staff role must NEVER submit delivery partner orders or non-cash customer types
    if (user.role === 'staff') {
        if (customerId !== 'cash' || AUTHORIZED_PARTNERS.includes(customerId)) {
            authService.recordSecurityEvent(
                'UNAUTHORIZED_STAFF_PARTNER_ORDER_ATTEMPT',
                req.headers['x-forwarded-for'],
                user.id
            );
            return res.status(403).json({
                success: false,
                error: 'ACCESS DENIED: Staff role cannot submit Delivery Partner orders. Cash Customer only.'
            });
        }
    }

    // 3. Validate Cashier / Admin permitted customer IDs
    const allowedCustomerIds = ['cash', ...AUTHORIZED_PARTNERS];
    if (!allowedCustomerIds.includes(customerId)) {
        return res.status(400).json({
            success: false,
            error: `Invalid customer type '${customerId}'.`
        });
    }

    // 4. Success: order is authorized and validated
    return res.status(200).json({
        success: true,
        message: 'Order validated and authorized successfully',
        orderId: body?.orderId || body?.id || ('ORD-' + Date.now()),
        tenant: {
            companyId: user.companyId || 'CMP-001',
            branchId: user.branchId || 'BR-001'
        },
        authorizedUser: {
            id: user.id,
            staffId: user.staffId,
            name: user.name,
            role: user.role
        },
        orderSummary: {
            customerId,
            orderTypeId
        }
    });
};

