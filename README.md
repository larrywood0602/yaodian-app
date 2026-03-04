<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 要点 AI（Web + iOS）

## 1) 先配置环境变量

```bash
cp .env.example .env
```

至少填写这些值：

- `QWEN_API_KEY`（后端模型调用）
- `VITE_API_BASE_URL`（iOS 原生包访问后端）
- 如果要接 MemFire（后端使用）：
  - `MEMFIRE_URL`
  - `MEMFIRE_SERVICE_ROLE_KEY`（只放后端）
  - `MEMFIRE_ANON_KEY`（可给前端/移动端）

## 2) 本地启动前后端（Web 调试）

```bash
npm install
npm run dev:server
npm run dev:web
```

默认地址：

- Web: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:8787`

## 3) iOS 连接后端并同步

先确认 `.env` 中的 `VITE_API_BASE_URL`：

- iOS 模拟器（同一台 Mac）可用：`http://127.0.0.1:8787`
- 真机调试用你 Mac 的局域网 IP：`http://<你的Mac局域网IP>:8787`

然后执行：

```bash
npm run ios:sync
npm run ios:open
```

iOS 包里前端请求会走 `VITE_API_BASE_URL`。若未配置，App 内会直接报错提醒。

## 4) 密钥安全规则

- iOS/Web 端不要放 `MEMFIRE_SERVICE_ROLE_KEY`
- `MEMFIRE_SERVICE_ROLE_KEY` 只允许后端读取
- 任何 `.env` 文件都不要提交到 Git

## 5) MemFire 后端接口（已接入）

健康检查：

```bash
curl http://127.0.0.1:8787/api/memfire/health
```

Admin 路由（后端管理权限，使用 service_role）：

- `POST /api/memfire/admin/select`
- `POST /api/memfire/admin/insert`
- `POST /api/memfire/admin/upsert`
- `POST /api/memfire/admin/update`
- `POST /api/memfire/admin/delete`

如果设置了 `MEMFIRE_ADMIN_TOKEN`，以上路由都必须带：

```http
x-admin-token: <MEMFIRE_ADMIN_TOKEN>
```

User 路由（用户会话 + RLS）：

- `POST /api/memfire/user/select`
- `POST /api/memfire/user/insert`
- `POST /api/memfire/user/upsert`
- `POST /api/memfire/user/update`
- `POST /api/memfire/user/delete`

User 路由必须带用户 token：

```http
Authorization: Bearer <memfire_user_access_token>
```

`select` 请求体示例：

```json
{
  "table": "profiles",
  "columns": "*",
  "filters": [
    { "column": "user_id", "op": "eq", "value": "uid-123" }
  ],
  "orderBy": "created_at",
  "ascending": false,
  "limit": 20
}
```

`upsert` 请求体示例：

```json
{
  "table": "profiles",
  "data": {
    "id": "uid-123",
    "nickname": "Larry"
  },
  "onConflict": "id"
}
```

## 6) iOS/Web 调用封装（MemfireApiService）

已提供封装：

- [memfire.ts](/Users/larry/Downloads/要点app/src/services/memfire.ts)

用法示例（用户态，推荐）：

```ts
import { memfireApi } from "./services/memfire";

const rows = await memfireApi.userSelect(
  {
    table: "profiles",
    columns: "*",
    filters: [{ column: "id", op: "eq", value: "uid-123" }],
    limit: 1,
  },
  userAccessToken
);
```

如果你不想每次传 token，可在初始化时注入：

```ts
import { MemfireApiService } from "./services/memfire";

const api = new MemfireApiService({
  getAccessToken: async () => {
    return localStorage.getItem("memfire_access_token");
  },
});
```

Admin 示例（仅后端管理场景，避免在客户端暴露）：

```ts
const rows = await memfireApi.adminSelect(
  { table: "profiles", limit: 10 },
  "<MEMFIRE_ADMIN_TOKEN>"
);
```

## 7) 阿里云 ECS 公网部署（PM2 + Nginx）

在 ECS 上执行（建议使用 `ecs-user`）：

```bash
git clone <你的仓库地址> /opt/yaodian-app
cd /opt/yaodian-app
cp deploy/.env.ecs.example .env
# 编辑 .env：填写 QWEN/MEMFIRE 密钥，并确认
# HOST=0.0.0.0
# QWEN_MODEL=qwen3.5-plus
# VITE_API_BASE_URL=http://<你的公网IP或域名>

REPO_URL="<你的仓库地址>" \
BRANCH="main" \
PUBLIC_HOST="<你的公网IP或域名>" \
bash scripts/ecs_deploy_public.sh
```

验证：

```bash
curl http://127.0.0.1:8787/api/health
curl http://<你的公网IP或域名>/api/qwen/health
curl http://<你的公网IP或域名>/api/memfire/health
```

iOS 打包前，本地项目 `.env` 里要使用同一个公网后端地址：

```bash
VITE_API_BASE_URL="http://<你的公网IP或域名>"
npm run ios:sync
```
