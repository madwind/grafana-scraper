import { firefox } from 'playwright';
import * as http from 'node:http';

const env = process.env;

const dashboardUrl = env.DASHBOARD_URL;
const mail = env.GRAFANA_MAIL;
const password = env.GRAFANA_PASSWORD;
const width = Number(env.VIEWPORT_WIDTH ?? 2560);
const height = Number(env.VIEWPORT_HEIGHT ?? 1305);
const interval = Number(env.CAPTURE_INTERVAL ?? 10000);
const port = Number(env.HTTP_PORT ?? 57333);

(async () => {
    console.log('Launching browser...');
    const browser = await firefox.launch();

    console.log('Creating browser context...');
    const context = await browser.newContext({
        viewport: { width, height }
    });

    const page = await context.newPage();

    console.log(`Navigating to dashboard: ${dashboardUrl}`);
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

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

    console.log('Starting MJPEG server...');
    const server = http.createServer(async (req, res) => {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            return;
        }

        console.log('Client connected');

        res.writeHead(200, {
            'Content-Type': 'multipart/x-mixed-replace; boundary=frame'
        });

        while (true) {
            const buffer = await page.screenshot({
                type: 'jpeg',
                quality: 60,
                clip: { x: 0, y: 80, width, height }
            });

            res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${buffer.length}\r\n\r\n`);
            res.write(buffer);
            res.write('\r\n');

            await new Promise(r => setTimeout(r, interval));
        }
    });

    server.listen(port, () => console.log(`MJPEG server started on port ${port}`));
})();
