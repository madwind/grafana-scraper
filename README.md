## 📄 Docker Documentation: `madwind/grafana-scraper`

该项目是一个容器化服务，旨在利用 **Playwright** 自动化登录 Grafana Dashboard，并定期捕获 Dashboard 画面，将其作为 **MJPEG (Motion JPEG)** 视频流通过 HTTP 提供。这使得您可以将 Grafana Cloud 或本地 Grafana 实时画面嵌入到不支持复杂网页的显示器或监控系统中。

### 🐳 Docker Hub 仓库

**`madwind/grafana-scraper`**

### 📋 环境变量说明

| 变量名                | 描述（用途）                                                          | 默认值                 | 必填    |
|:-------------------| :-------------------------------------------------------------- | :------------------ | :---- |
| `DASHBOARD_URL`    | **目标 Grafana Dashboard 的完整 URL**                                | 无                   | 是     |
| `GRAFANA_MAIL`     | Grafana 登录邮箱或用户名                                                | 无                   | 是     |
| `GRAFANA_PASSWORD` | Grafana 登录密码                                                    | 无                   | 是     |
| `REFRESH_TOKEN`    | 刷新页面 Token，通过 `/refresh?token={REFRESH_TOKEN}` 触发               | 无                   | 否     |
| `VIEWPORT_WIDTH`   | 浏览器视口宽度（用于完整渲染 Dashboard）                                       | `2560`              | 否     |
| `VIEWPORT_HEIGHT`  | 浏览器视口高度（需 ≥ `CLIP_TOP + CLIP_HEIGHT`，未设置时自动计算）                  | 自动计算                | 否     |
| `CLIP_LEFT`        | 截图裁剪区域左上角 X 坐标（像素）                                              | `0`                 | 否     |
| `CLIP_TOP`         | 截图裁剪区域左上角 Y 坐标（像素）                                              | `140`               | 否     |
| `CLIP_WIDTH`       | 截图裁剪区域宽度（像素），默认等于 `VIEWPORT_WIDTH`                              | 同 `VIEWPORT_WIDTH`  | 否     |
| `CLIP_HEIGHT`      | 截图裁剪区域高度（像素），默认等于 `VIEWPORT_HEIGHT`                             | 同 `VIEWPORT_HEIGHT` | 否     |
| `QUALITY`          | JPG 压缩质量（1–100，数值越小体积越小）                                        | `30`                | 否     |
| `CAPTURE_INTERVAL` | 截图 / 帧更新间隔时间（毫秒），例如 `10000` = 10 秒一帧                        | `10000`             | 否     |
| `HTTP_PORT`        | 容器内部 HTTP 服务监听端口，用于对外提供 MJPEG 视频流                               | `57333`             | 否     |
| `BROWSER_LOCALE`   | 浏览器语言环境（修复 Grafana 图表崩溃问题），影响 `navigator.language`、Intl 格式化 | `en-US`             | 否 |
| `PROXY_SERVER`     | 浏览器使用的代理服务器（如 `http://host:port`）                               | 无                   | 否     |
| `HEADLESS`         | 是否启用无头模式（`true` / `false`）                                      | `true`              | 否     |
