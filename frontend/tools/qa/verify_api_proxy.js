const proxy = require('../../../api/_proxy');

function response() {
    return {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
        end(value) { this.body = value; }
    };
}

(async () => {
    delete process.env.NURPOS_LARAVEL_API_ORIGIN;
    let res = response();
    await proxy({ method: 'GET', url: '/api/orders', headers: {} }, res);
    if (res.statusCode !== 503) throw new Error('Unconfigured origin should fail closed with 503');

    process.env.NURPOS_LARAVEL_API_ORIGIN = 'https://laravel.example.test';
    res = response();
    await proxy({ method: 'GET', url: '/api/not-a-route', headers: {} }, res);
    if (res.statusCode !== 404) throw new Error('Unknown API route should be rejected');

    const originalFetch = global.fetch;
    let observed;
    global.fetch = async (url, options) => {
        observed = { url: String(url), options };
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    res = response();
    await proxy({ method: 'GET', url: '/api/branches', headers: {} }, res);
    if (res.statusCode !== 200 || observed.url !== 'https://laravel.example.test/api/branches') throw new Error('Branch endpoint was not accepted by the API proxy');

    res = response();
    await proxy({ method: 'GET', url: '/api/health', headers: {} }, res);
    if (res.statusCode !== 200 || observed.url !== 'https://laravel.example.test/api/health') throw new Error('Health endpoint was not accepted by the API proxy');

    res = response();
    await proxy({ method: 'GET', url: '/api/setup', headers: {} }, res);
    if (res.statusCode !== 200 || observed.url !== 'https://laravel.example.test/api/setup') throw new Error('Owner setup status route was not accepted by the API proxy');

    res = response();
    await proxy({ method: 'GET', url: '/api/index?_route=auth%2Fsession', headers: {} }, res);
    if (res.statusCode !== 200 || observed.url !== 'https://laravel.example.test/api/auth/session') throw new Error('Single-function rewrite did not dispatch the authentication session route');

    res = response();
    await proxy({ method: 'GET', url: '/api/index?_route=reports&from=2026-11-01&to=2026-11-04', headers: {} }, res);
    if (res.statusCode !== 200 || observed.url !== 'https://laravel.example.test/api/reports?from=2026-11-01&to=2026-11-04') throw new Error('Single-function rewrite did not preserve endpoint query parameters');

    res = response();
    await proxy({
        method: 'POST', url: '/api/setup',
        headers: { 'content-type': 'application/json', 'x-owner-setup-token': 'test-token-do-not-use' },
        body: { name: 'Test only' }
    }, res);
    if (res.statusCode !== 200 || observed.options.headers['X-Owner-Setup-Token'] !== 'test-token-do-not-use') throw new Error('Owner setup token header was not forwarded');

    res = response();
    await proxy({
        method: 'POST', url: '/api/orders',
        headers: { cookie: 'other=ignored; nurpos_session=opaque-token', 'content-type': 'application/json' },
        body: { orderId: 'test-only' }
    }, res);
    global.fetch = originalFetch;
    if (res.statusCode !== 200 || observed.options.headers.Authorization !== 'Bearer opaque-token') throw new Error('Session cookie was not translated to bearer auth');
    if ('Cookie' in observed.options.headers) throw new Error('Browser cookies should not be forwarded to Laravel');
    if (observed.url !== 'https://laravel.example.test/api/orders') throw new Error(`Unexpected target ${observed.url}`);
    if (res.headers['cache-control'] !== 'no-store') throw new Error('Private API response is not marked no-store');
    console.log('API proxy verification passed: fail-closed configuration, route allowlist including owner setup, cookie-to-bearer translation, no cookie forwarding, and no-store responses.');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
