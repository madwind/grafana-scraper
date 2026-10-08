import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, lstat, rm} from 'node:fs/promises';
import {createServer, get} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

// Local Grafana-shaped login fixture: exercise real Chromium without credentials.
const fixture = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    if (req.url === '/login/grafana_com') {
        res.end(`<form onsubmit="event.preventDefault(); this.innerHTML = '<input name=password><button type=submit>Login</button>'; this.onsubmit = () => { document.cookie = 'loggedIn=1; path=/'; location.href = '/'; return false; }"><input name="login"><button type="submit">Next</button></form>`);
    } else {
        res.end(req.headers.cookie?.includes('loggedIn=1')
            ? '<h1>Smoke dashboard</h1>'
            : '<a href="login/grafana_com">Login</a>');
    }
});
await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
const directory = await mkdtemp(join(tmpdir(), 'grafana-smoke-'));
const socketPath = join(directory, 'http.sock');
const child = spawn(process.execPath, ['main.ts'], {
    env: {...process.env, DASHBOARD_URL: `http://127.0.0.1:${fixture.address().port}/`,
        GRAFANA_MAIL: 'smoke@example.invalid', GRAFANA_PASSWORD: 'fixture',
        HTTP_SOCKET: socketPath, VIEWPORT_WIDTH: '320', VIEWPORT_HEIGHT: '240',
        CAPTURE_INTERVAL: '100', TOKENS: 'smoke-token'},
    stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
child.stdout.on('data', data => { logs += data; });
child.stderr.on('data', data => { logs += data; });
const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({code, signal})));
function request(path, stream = false) {
    return new Promise((resolve, reject) => {
        const req = get({socketPath, path}, res => {
            if (stream) {
                res.once('data', chunk => {
                    resolve({status: res.statusCode, type: res.headers['content-type'], body: chunk.toString()});
                    res.destroy();
                });
            } else {
                let body = '';
                res.on('data', chunk => { body += chunk; });
                res.on('end', () => resolve({status: res.statusCode, body}));
            }
        });
        req.setTimeout(10000, () => req.destroy(new Error('Request timed out')));
        req.on('error', reject);
    });
}
try {
    for (let attempt = 0; !logs.includes('MJPEG server started on Unix socket'); attempt++) {
        assert.equal(child.exitCode, null, logs);
        assert.equal(child.signalCode, null, logs);
        assert.ok(attempt < 600, `Startup timed out\n${logs}`);
        await delay(100);
    }
    assert.ok((await lstat(socketPath)).isSocket());
    const stream = await request('/?token=smoke-token', true);
    assert.equal(stream.status, 200);
    assert.match(stream.type, /multipart\/x-mixed-replace/);
    assert.match(stream.body, /Content-Type: image\/jpeg/);
    await assert.rejects(request('/?token=invalid'));
    const refresh = await request('/refresh?token=smoke-token');
    assert.equal(refresh.status, 200);
    assert.equal(refresh.body, 'Refreshed');
    child.kill('SIGTERM');
    const result = await Promise.race([exited, delay(10000).then(() => { throw new Error('Shutdown timed out'); })]);
    assert.equal(result.code, 0, logs);
    await assert.rejects(lstat(socketPath), {code: 'ENOENT'});
    console.log(`PASS: ${process.version}, Chromium login, MJPEG, token auth, refresh, SIGTERM and socket cleanup`);
} catch (error) {
    console.error(logs);
    throw error;
} finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exited;
    await new Promise(resolve => fixture.close(resolve));
    await rm(directory, {recursive: true, force: true});
}
