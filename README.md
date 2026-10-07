## 📄 Docker Documentation: `madwind/grafana-scraper`

该项目是一个容器化服务，旨在利用 **Playwright** 自动化登录 Grafana Dashboard，并定期捕获 Dashboard 画面，将其作为 **MJPEG (
Motion JPEG)** 视频流通过 HTTP 提供。这使得您可以将 Grafana Cloud 或本地 Grafana 实时画面嵌入到不支持复杂网页的显示器或监控系统中。

### 🐳 Docker Hub 仓库

**`madwind/grafana-scraper`**

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
| `HTTP_SOCKET`      | HTTP 服务监听的 Unix socket 绝对路径，用于提供 MJPEG 视频流                   | `/run/grafana-scraper/grafana-scraper.sock` | 否 |
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

### Unix socket 与 nginx

服务仅监听 Unix socket，不再使用 `HTTP_PORT` 或暴露 TCP 端口。启动时清理遗留 socket，正常退出时关闭连接并移除 socket。程序不创建目录或修改权限，目录必须由部署环境提前准备；已被其它服务监听的 socket 或同名普通文件不会被覆盖。

Kubernetes 部署与其它项目一致：将宿主机 `/dev/shm/grafana-scraper` 挂载到服务的 `/run/grafana-scraper`，nginx 以只读方式挂载同一目录，两者须运行在同一节点。root initContainer 将目录属主设为 `1000:1000`、权限设为 `0755`；主容器以 Node 用户（UID/GID `1000`）运行。chart 启动命令设置 `umask 000`，让新创建的 socket 权限为 `0777`，供 nginx worker 连接。Playwright 浏览器统一安装到 `/ms-playwright`，供非 root 用户读取。

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
    proxy_pass http://unix:/run/grafana-scraper/grafana-scraper.sock;
}
```

本地 Linux 调试可使用：

```bash
curl --unix-socket /run/grafana-scraper/grafana-scraper.sock 'http://localhost/refresh?token=user1-token'
```
