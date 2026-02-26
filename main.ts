import {chromium} from 'playwright';
import * as http from 'node:http';
import {VERSION} from "./version";

const env = process.env;

const PROXY_SERVER = env.PROXY_SERVER
const HEADLESS = env.HEADLESS ?? 'true'

const BROWSER_LOCALE = env.BROWSER_LOCALE ?? 'en-US'
const TIMEZONE_ID = env.TZ;

const DASHBOARD_URL = env.DASHBOARD_URL;
const GRAFANA_MAIL = env.GRAFANA_MAIL;
const GRAFANA_PASSWORD = env.GRAFANA_PASSWORD;
const TOKEN = env.TOKEN;
const VIEWPORT_WIDTH = Number(env.VIEWPORT_WIDTH ?? 2560);

const CSS_SELECTOR = env.CSS_SELECTOR ?? 'body'

// const clipLeft = Number(env.CLIP_LEFT ?? 0);
// const clipTop = Number(env.CLIP_TOP ?? 0);
// const clipWidth = Number(env.CLIP_WIDTH ?? viewportWidth);
// const clipHeight = Number(env.CLIP_HEIGHT ?? 1175);

// const VIEWPORT_BUFFER = 200;

const viewportHeight = Number(env.VIEWPORT_HEIGHT ?? 2560);
const quality = Number(env.QUALITY ?? 30);
const interval = Number(env.CAPTURE_INTERVAL ?? 10000);
const port = Number(env.HTTP_PORT ?? 57333);

if (!DASHBOARD_URL || !GRAFANA_MAIL || !GRAFANA_PASSWORD) {
    console.error('Error: DASHBOARD_URL, GRAFANA_MAIL, and GRAFANA_PASSWORD must be set.');
    process.exit(1);
}

(async () => {
    console.log(`grafana-scraper starting (version=${VERSION})`);
    console.log('Launching browser...');

    const browser = await chromium.launch({headless: HEADLESS.toLowerCase() !== "false"});

    console.log('Creating browser context...');
    const context = await browser.newContext({
        proxy: PROXY_SERVER ? {server: PROXY_SERVER} : undefined,
        viewport: {width: VIEWPORT_WIDTH, height: viewportHeight},
        locale: BROWSER_LOCALE,
        timezoneId: TIMEZONE_ID
    });

    const page = await context.newPage();

    console.log(`Navigating to dashboard: ${DASHBOARD_URL}`);
    await page.goto(DASHBOARD_URL, {waitUntil: 'domcontentloaded', timeout: 60000});

    console.log('Setting localStorage...');
    await page.evaluate(() => {
        localStorage.setItem('grafana.grafana-setupguide-app.banners.free', 'false');
        localStorage.setItem('grafana.navigation.docked', 'false');
        localStorage.setItem('grafana.grafana-setupguide-app.modals.plan-picker', 'false');
    });

    console.log('Clicking Grafana login link...');
    await page.locator('a[href="login/grafana_com"]').click();

    console.log('Filling login email...');
    await page.locator('input[name="login"]').fill(GRAFANA_MAIL);
    await page.locator('button[type="submit"]').click();

    console.log('Filling password...');
    await page.locator('input[name="password"]').fill(GRAFANA_PASSWORD);
    await page.locator('button[type="submit"]').click();

    console.log('Disabling animations...');
    await page.addStyleTag({
        content: `
            * {
                animation: none !important;
                transition: none !important;
            }
        `
    });

    console.log('Waiting for dom content loaded...');

    console.log('Resetting localStorage after login...');
    await page.waitForURL(DASHBOARD_URL, {waitUntil: 'domcontentloaded'});
    await page.evaluate(() => {
        localStorage.setItem('grafana.grafana-setupguide-app.banners.adaptive_metrics_recommendations', 'false');
        localStorage.setItem('grafana.grafana-setupguide-app.banners.free', 'false');
        localStorage.setItem('grafana.navigation.docked', 'false');
        localStorage.setItem('grafana.grafana-setupguide-app.modals.plan-picker', 'false');
    });

    console.log('Starting shared MJPEG server...');
    const clients: http.ServerResponse[] = [];
    let latestFrame: Buffer | null = null;
    let captureAble = true;

    async function captureFrame() {
        try {
            const targetElement = page.locator(CSS_SELECTOR)
            latestFrame = await targetElement.screenshot({
                type: 'jpeg',
                quality,
                // clip: {x: clipLeft, y: clipTop, width: clipWidth, height: clipHeight}
            });

        } catch (e) {
            console.error('Screenshot error:', e);
        }
    }

    await captureFrame();

    setInterval(() => {
        if (captureAble) {
            captureFrame()
                .then(() => clients.forEach(client => sendFrame(client)))
        }
    }, interval);

    const sendFrame = (res: http.ServerResponse) => {
        if (!latestFrame) return;
        try {
            res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${latestFrame.length}\r\n\r\n`);
            res.write(latestFrame);
            res.write('\r\n');
        } catch (e) {
            console.error('SendFrame error:', e);
        }
    };

    const server = http.createServer((req, res) => {
        if (req.method !== 'GET') {
            res.writeHead(405, {'Content-Type': 'text/plain'});
            res.end('Method Not Allowed');
            return;
        }
        const reqUrl = new URL(req.url, 'http://localhost');
        const pathname = reqUrl.pathname;
        if (TOKEN !== undefined) {
            const requestToken = reqUrl.searchParams.get('token');
            if (requestToken !== TOKEN) {
                req.socket.destroy();
                return;
            }
        }
        if (pathname === '/refresh') {
            console.log('refreshing...');
            captureAble = false
            page.reload({waitUntil: 'networkidle'})
                .then(() => {
                    console.log('start capture..');
                    captureAble = true
                })
        }

        res.writeHead(200, {
            'Content-Type': 'multipart/x-mixed-replace; boundary=frame'
        });

        sendFrame(res);
        sendFrame(res);
        clients.push(res);

        req.on('close', () => {
            const index = clients.indexOf(res);
            if (index !== -1) {
                clients.splice(index, 1);
            }
        });
    });

    server.listen(port, () => console.log(`MJPEG server started on port ${port}`));
})();
