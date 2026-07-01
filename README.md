# SmartPet Vercel Cloud

这是一个用于 ESP32-S3 智能桌宠的远程操控网站。通信模型完全采用“ESP32 主动访问网站”的方式：

```text
ESP32 -> 网站：POST /api/smartpet/status 上报状态
ESP32 -> 网站：GET  /api/smartpet/command 拉取一条待执行命令
ESP32 -> 网站：POST /api/smartpet/ack 回报命令执行结果
```

网站不会尝试主动连接 ESP32，因此适合校园网、宿舍 Wi-Fi、手机热点等没有公网 IP 的环境。

## 1. 功能

- 网页控制台显示桌宠最新状态。
- 网页点击按钮生成一条待执行命令。
- ESP32 定时短轮询 `/api/smartpet/command` 取走命令。
- ESP32 执行后调用 `/api/smartpet/ack` 回报结果。
- ESP32 周期性调用 `/api/smartpet/status` 上报状态。
- 支持 `Authorization: Bearer <token>` 形式的设备鉴权。
- 使用 Upstash Redis 持久化状态和命令；未配置 Upstash 时提供本地内存回退，仅用于开发调试。

## 2. ESP32-facing API

### POST /api/smartpet/status

请求头：

```http
Content-Type: application/json
Authorization: Bearer your-token
```

请求体：

```json
{
  "device": "smartpet-01",
  "mode": "website",
  "power": "NORMAL",
  "emotion": 5,
  "food": "HUNGRY",
  "remain": 0,
  "motion": "NULL",
  "uptime_ms": 123456
}
```

响应：

```json
{ "ok": true }
```

### GET /api/smartpet/command?device=smartpet-01

请求头：

```http
Authorization: Bearer your-token
```

没有命令：

```json
{ "ok": true, "command": "" }
```

有命令：

```json
{
  "ok": true,
  "id": "cmd-1001",
  "command": "setmot 4"
}
```

特点：

- 一次最多返回一条命令。
- 不返回数组。
- 命令不超过 80 字节。
- 命令被 GET 下发后会进入 DELIVERED 状态。
- 如果 10 秒内没有 ack，允许再次下发；该时间可由 `SMARTPET_COMMAND_REDELIVER_MS` 配置。

### POST /api/smartpet/ack

请求头：

```http
Content-Type: application/json
Authorization: Bearer your-token
```

请求体：

```json
{
  "device": "smartpet-01",
  "id": "cmd-1001",
  "command": "setmot 4",
  "result": "OK"
}
```

支持的 result：

```text
OK
BAD_COMMAND
BUSY
IGNORED_SLEEPING
HTTP_ERROR
```

响应：

```json
{ "ok": true }
```

## 3. Dashboard-only API

网页控制台还使用了几个后台接口：

```text
GET  /api/smartpet/admin/state
POST /api/smartpet/admin/command
POST /api/smartpet/admin/clear
```

这些接口需要管理员密码 `SMARTPET_ADMIN_PASSWORD`。它们不是给 ESP32 用的。

## 4. 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

本地开发时如果没有设置 `SMARTPET_ADMIN_PASSWORD`，默认管理员密码是：

```text
admin
```

生产部署时必须设置自己的密码。

## 5. 环境变量

在 Vercel Project Settings -> Environment Variables 中设置：

```env
SMARTPET_API_TOKEN=your-device-token
SMARTPET_ADMIN_PASSWORD=your-admin-password
SMARTPET_DEFAULT_DEVICE=smartpet-01
NEXT_PUBLIC_DEFAULT_DEVICE=smartpet-01
UPSTASH_REDIS_REST_URL=your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
SMARTPET_COMMAND_REDELIVER_MS=10000
```

如果 `SMARTPET_API_TOKEN` 为空，设备 API 将不校验 Authorization。只建议本地临时调试这样做。

## 6. Vercel 部署步骤

1. 把本项目推送到 GitHub。
2. 打开 Vercel，选择 Add New Project。
3. 导入该 GitHub 仓库。
4. Framework Preset 选择 Next.js。
5. 在 Environment Variables 中填入上面的变量。
6. 在 Vercel Marketplace 或 Upstash 控制台创建 Redis，把 REST URL 和 Token 填入环境变量。
7. Deploy。
8. 在 Vercel Domains 中绑定你的域名，例如 `pet.example.com`。

`vercel.json` 已配置：

```json
{
  "regions": ["hkg1"]
}
```

这会尽量让 Vercel Functions 在香港区域运行，便于国内网络环境访问。静态页面仍由 Vercel Edge 网络分发。

## 7. ESP32 请求示例

### 拉取命令

```cpp
HTTPClient http;
http.begin("https://pet.example.com/api/smartpet/command?device=smartpet-01");
http.addHeader("Authorization", "Bearer your-token");
int code = http.GET();
```

### 上报状态

```cpp
HTTPClient http;
http.begin("https://pet.example.com/api/smartpet/status");
http.addHeader("Content-Type", "application/json");
http.addHeader("Authorization", "Bearer your-token");
int code = http.POST(jsonBody);
```

### 确认命令

```cpp
HTTPClient http;
http.begin("https://pet.example.com/api/smartpet/ack");
http.addHeader("Content-Type", "application/json");
http.addHeader("Authorization", "Bearer your-token");
int code = http.POST(jsonBody);
```

## 8. 建议轮询频率

```text
拉取命令：每 1 到 2 秒一次
状态上报：每 3 到 5 秒一次
关键事件：立即上报一次
请求超时：1000 到 2000 ms
失败重试：逐步退避到 10 到 30 秒
```

## 9. 命令白名单

网页只允许下发这些命令：

```text
touch
feed
state
setemo 1~10
setful true
setful false
setmot 0
setmot 1
setmot 2
setmot 3
setmot 4
setslp true
setslp false
```

ESP32 收到 command 后，可以直接复用现有 `commandParseText()` 进入原状态机。

## 10. 注意事项

- Vercel 没有中国大陆节点，大陆访问稳定性不如国内云。建议使用自定义域名、低频短轮询、请求超时和退避重试。
- 不要让网页直接连接 ESP32。
- 不要把设备 token 写进前端代码。
- Upstash Redis 是生产部署的推荐存储；内存回退只适合本地调试。
