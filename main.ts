import {firefox} from 'playwright';
import * as http from 'node:http';
import {VERSION} from "./version";

const env = process.env;

const dashboardUrl = env.DASHBOARD_URL;
const mail = env.GRAFANA_MAIL;
const password = env.GRAFANA_PASSWORD;
const token = env.TOKEN;
const width = Number(env.VIEWPORT_WIDTH ?? 2560);
const height = Number(env.VIEWPORT_HEIGHT ?? 1305);
const clip_x = Number(env.CLIP_X ?? 0);
const clip_y = Number(env.CLIP_Y ?? 140);
const quality = Number(env.QUALITY ?? 30);
const interval = Number(env.CAPTURE_INTERVAL ?? 10000);
const port = Number(env.HTTP_PORT ?? 57333);

if (!dashboardUrl || !mail || !password) {
    console.error('Error: DASHBOARD_URL, GRAFANA_MAIL, and GRAFANA_PASSWORD must be set.');
    process.exit(1);
}

(async () => {
    console.log(`grafana-scraper starting (version=${VERSION})`);
    console.log('Launching browser...');
    const browser = await firefox.launch();

    console.log('Creating browser context...');
    const context = await browser.newContext({
        viewport: {width, height}
    });

    const page = await context.newPage();

    console.log(`Navigating to dashboard: ${dashboardUrl}`);
    await page.goto(dashboardUrl, {waitUntil: 'domcontentloaded', timeout: 60000});

    console.log('Setting localStorage...');
    await page.evaluate(() => {
        localStorage.setItem('grafana.grafana-setupguide-app.banners.free', 'false');
        localStorage.setItem('grafana.navigation.docked', 'false');
        localStorage.setItem('grafana.grafana-setupguide-app.modals.plan-picker', 'false');
    });

    console.log('Clicking Grafana login link...');
    await page.locator('a[href="login/grafana_com"]').click();

    console.log('Filling login email...');
    await page.locator('input[name="login"]').fill(mail);
    await page.locator('button[type="submit"]').click();

    console.log('Filling password...');
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    console.log('Resetting localStorage after login...');
    await page.evaluate(() => {
        localStorage.setItem('grafana.grafana-setupguide-app.banners.free', 'false');
        localStorage.setItem('grafana.navigation.docked', 'false');
        localStorage.setItem('grafana.grafana-setupguide-app.modals.plan-picker', 'false');
    });

    console.log('Disabling animations...');
    await page.addStyleTag({
        content: `
            * {
                animation: none !important;
                transition: none !important;
            }
        `
    });

    console.log('Waiting for network idle...');
    await page.waitForURL(dashboardUrl, {waitUntil: 'networkidle'});

    console.log('Starting shared MJPEG server...');
    const clients: http.ServerResponse[] = [];
    let latestFrame: Buffer | null = null;
    let captureAble = true;

    async function captureFrame() {
        try {
            latestFrame = await page.screenshot({
                type: 'jpeg',
                quality,
                clip: {x: clip_x, y: clip_y, width, height}
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
        if (token !== undefined) {
            const requestToken = reqUrl.searchParams.get('token');
            if (requestToken !== token) {
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
