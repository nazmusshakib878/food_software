// GET /api/reports
// Protected Backend Endpoint enforcing Role-Based Access Control
const authService = require('./_auth_service');

module.exports = async function handler(req, res) {
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

    // Strict Role-Based Access Control for Management Reports
    if (user.role === 'staff' || !user.permissions.includes('open_sidebar')) {
        authService.recordSecurityEvent('UNAUTHORIZED_REPORT_ACCESS_ATTEMPT', req.headers['x-forwarded-for'], user.id);
        return res.status(403).json({
            success: false,
            error: 'ACCESS DENIED: Insufficient permissions for management reports'
        });
    }

    // Cashier and Admin are authorized
    return res.status(200).json({
        success: true,
        companyId: user.companyId,
        branchId: user.branchId,
        authorizedUser: {
            id: user.id,
            name: user.name,
            role: user.role
        },
        message: 'Authorized access to management report telemetry'
    });
};
