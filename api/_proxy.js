const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const ROUTES = [
    /^\/api\/health$/,
    /^\/api\/auth\/(login|pin|session|logout)$/,
    /^\/api\/setup$/,
    /^\/api\/(orders|reports|customers|inventory|shifts)$/,
    /^\/api\/branches$/,
    /^\/api\/orders\/[^/]+\/cancel$/,
    /^\/api\/orders\/[^/]+\/status$/,
    /^\/api\/catalog\/(categories|products)$/,
    /^\/api\/catalog\/products\/[^/]+$/,
    /^\/api\/catalog\/categories\/[^/]+$/,
    /^\/api\/inventory\/(movements|adjustments)$/,
    /^\/api\/shifts\/active$/,
    /^\/api\/shifts\/close-branch$/,
    /^\/api\/shifts\/[^/]+\/(report|invoices)$/,
    /^\/api\/shifts\/[^/]+\/close$/,
];

module.exports = async function proxyToLaravel(req, res) {
    if (!ALLOWED_METHODS.has(req.method || '')) {
        res.setHeader('Allow', [...ALLOWED_METHODS].join(', '));
        res.statusCode = 405;
        return res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    }

    const configuredOrigin = process.env.NURPOS_LARAVEL_API_ORIGIN;
    if (!configuredOrigin) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: 'Laravel API origin is not configured' }));
    }

    let origin;
    try {
        origin = new URL(configuredOrigin);
        if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Invalid API origin');
        if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') throw new Error('Production API origin must use HTTPS');
    } catch (_) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: 'Laravel API origin is invalid' }));
    }

    // Vercel rewrites the entire /api/* namespace to this single catch-all
    // function to stay within Hobby's 12-function deployment limit. Depending
    // on rewrite routing, the function may receive either /api/... or /... .
    const requestUrl = new URL(req.url || '/', 'https://frontend.invalid');
    const path = requestUrl.pathname.startsWith('/api/')
        ? requestUrl.pathname
        : `/api${requestUrl.pathname === '/' ? '' : requestUrl.pathname}`;
    if (!ROUTES.some(route => route.test(path))) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: 'API route not found' }));
    }
    const target = new URL(path + requestUrl.search, origin.origin);
    const headers = { Accept: req.headers.accept || 'application/json' };
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    else if (req.headers.cookie) {
        const session = req.headers.cookie.split(';').map(v => v.trim()).find(v => v.startsWith('nurpos_session='));
        if (session) {
            try { headers.Authorization = `Bearer ${decodeURIComponent(session.slice('nurpos_session='.length))}`; } catch (_) {}
        }
    }
    if (req.headers['x-owner-setup-token']) headers['X-Owner-Setup-Token'] = req.headers['x-owner-setup-token'];
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    if (req.headers['x-request-id']) headers['X-Request-ID'] = req.headers['x-request-id'];

    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
        if (typeof req.body === 'string') body = req.body;
        else if (req.body !== undefined) body = JSON.stringify(req.body);
        else {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            body = Buffer.concat(chunks);
        }
    }

    try {
        const upstream = await fetch(target, { method: req.method, headers, body, redirect: 'manual' });
        if (upstream.status >= 300 && upstream.status < 400) throw new Error('Unexpected upstream redirect');
        const contentType = upstream.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-store');
        const retryAfter = upstream.headers.get('retry-after');
        if (retryAfter) res.setHeader('Retry-After', retryAfter);
        const setCookie = upstream.headers.get('set-cookie');
        if (setCookie) res.setHeader('Set-Cookie', setCookie);
        res.statusCode = upstream.status;
        return res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (_) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: 'Laravel API is unavailable' }));
    }
};
