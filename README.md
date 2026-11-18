## 📄 Docker Documentation: `madwind/grafana-scraper`

该项目是一个容器化服务，旨在利用 **Playwright** 自动化登录 Grafana Dashboard，并定期捕获 Dashboard 画面，将其作为 **MJPEG (
Motion JPEG)** 视频流通过 HTTP 提供。这使得您可以将 Grafana Cloud 或本地 Grafana 实时画面嵌入到不支持复杂网页的显示器或监控系统中。

### 🐳 Docker Hub 仓库

**`madwind/grafana-scraper`**

### 本地运行

需要 Node.js 22.18.0 或更高版本，直接使用 Node 原生 TypeScript 支持，无需 `tsx` 或编译步骤。

```bash
npm ci
npx playwright install --with-deps --only-shell chromium
# 设置下方必填环境变量，并准备好 Unix socket 所在目录后启动
npm start
```

使用 `npm run typecheck` 检查类型，不生成 JavaScript 文件。IDEA 的 TypeScript 设置中选择项目的 `node_modules/typescript`；项目根目录的 `tsconfig.json` 已配置 Node 类型和原生 `.ts` 导入支持。

### 📋 环境变量说明

| 变量名                | 描述（用途）                                                      | 默认值     | 必填 |
|:-------------------|:------------------------------------------------------------|:--------|:---|
| `DASHBOARD_URL`    | **目标 Grafana Dashboard 的完整 URL**                            | 无       | 是  |
| `GRAFANA_MAIL`     | Grafana 登录邮箱或用户名                                            | 无       | 是  |
| `GRAFANA_PASSWORD` | Grafana 登录密码                                                | 无       | 是  |
| `TOKENS`           | 访问 Token，支持单个或多个；多个值可用逗号、分号、空格或换行分隔                   | 无       | 否  |
| `CSS_SELECTOR`     | 截图元素CSS选择器                                                  | 'body'  | 是  |
| `VIEWPORT_WIDTH`   | 浏览器视口宽度（用于完整渲染 Dashboard）                                   | `2560`  | 否  |
| `VIEWPORT_HEIGHT`  | 浏览器视口高度（需 ≥ `CLIP_TOP + CLIP_HEIGHT`，未设置时自动计算）              | 自动计算    | 否  |
| `QUALITY`          | JPG 压缩质量（1–100，数值越小体积越小）                                    | `30`    | 否  |
| `CAPTURE_INTERVAL` | 截图 / 帧更新间隔时间（毫秒），例如 `10000` = 10 秒一帧                        | `10000` | 否  |
| `HTTP_PORT`        | 本机 HTTP 端口，用于提供 MJPEG 视频流                                          | `18085` | 否  |
| `BROWSER_LOCALE`   | 浏览器语言环境（修复 Grafana 图表崩溃问题），影响 `navigator.language`、Intl 格式化 | `en-US` | 否  |
| `PROXY_SERVER`     | 浏览器使用的代理服务器（如 `http://host:port`）                           | 无       | 否  |
| `HEADLESS`         | 是否启用无头模式（`true` / `false`）                                  | `true`  | 否  |

### 多 Token 示例

如果有 7 个用户，可以给每个用户分配一个 Token：

```bash
TOKENS=user1-token,user2-token,user3-token,user4-token,user5-token,user6-token,user7-token
```

如果只有 1 个用户，也使用同一个变量：

```bash
TOKENS=user1-token
```

访问时使用各自的 Token：

```text
https://grafana.ak3s.de/?token=user1-token
https://grafana.ak3s.de/refresh?token=user1-token
```

### 本机 HTTP 与 Nginx

从 `3.0.0` 起，服务通过 TCP 提供 HTTP，默认监听 `127.0.0.1:18085`。从旧版 Unix socket 部署升级时，将镜像和 Nginx 上游一起切换，并移除共享挂载及目录权限初始化。

K3s 将 Grafana Scraper 和 Nginx 部署到同一节点，两者通过 `hostNetwork` 共享节点的回环地址。Scraper 继续以 UID/GID `65532` 运行，Playwright 浏览器安装在 `/ms-playwright`。调整 `HTTP_PORT` 时同步更新 Nginx 上游端口。Nginx 关闭响应缓冲以便逐帧转发 MJPEG。

```nginx
location / {
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 300s;
    proxy_pass http://127.0.0.1:18085;
}
```

在服务所在的网络命名空间内可直接请求刷新接口：

```bash
curl -N 'http://127.0.0.1:18085/refresh?token=user1-token'
```
