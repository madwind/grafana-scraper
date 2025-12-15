## 📄 Docker Documentation: `madwind/grafana-scraper`

该项目是一个容器化服务，旨在利用 **Playwright** 自动化登录 Grafana Dashboard，并定期捕获 Dashboard 画面，将其作为 **MJPEG (Motion JPEG)** 视频流通过 HTTP 提供。这使得您可以将 Grafana Cloud 或本地 Grafana 实时画面嵌入到不支持复杂网页的显示器或监控系统中。

### 🐳 Docker Hub 仓库

**`madwind/grafana-scraper`**

### 📋 环境变量说明

| 变量名 | 描述 (用途)                                    | 默认值     | 必填 |
| :--- |:-------------------------------------------|:--------| :--- |
| `DASHBOARD_URL` | **目标 Grafana Dashboard 的完整 URL**。          | 无       | 是 |
| `GRAFANA_MAIL` | Grafana 登录邮箱或用户名。                          | 无       | 是 |
| `GRAFANA_PASSWORD` | Grafana 登录密码。                              | 无       | 是 |
| `VIEWPORT_WIDTH` | 浏览器视口的宽度（截图宽度）。                            | `2560`  | 否 |
| `VIEWPORT_HEIGHT` | 浏览器视口的高度（截图高度）。                            | `1305`  | 否 |
| `QUALITY` | JPG压缩质量。                                   | `30`    | 否 |
| `CAPTURE_INTERVAL` | **截图/帧更新间隔时间**（毫秒）。例如 `10000ms` = 10秒更新一帧。 | `10000` | 否 |
| `HTTP_PORT` | 容器内部的 HTTP 服务监听端口，用于对外提供 MJPEG 视频流。        | `57333` | 否 |
