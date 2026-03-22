# 厂区智能物资定位管理系统

> 飞书 H5 网页应用 — 解决厂区内「物品在哪里」的高频需求

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + TypeScript + Vant 4 |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | MySQL |
| 飞书集成 | JSSDK + 开放平台 API |
| 共享类型 | TypeScript（shared/） |

## 快速开始

```bash
# 安装依赖
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# 配置环境变量
cp server/.env.example server/.env

# 启动开发服务（前后端同时）
npm run dev
```

- 前端: http://localhost:3000
- 后端: http://localhost:3001

## 项目结构

```
client/          # Vue 3 前端
server/          # Express 后端
shared/          # 前后端共享类型与常量
lark-bot/        # 飞书机器人（后续开发）
.github/         # PR 模板、Issue 模板
```

## 协作流程

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)
