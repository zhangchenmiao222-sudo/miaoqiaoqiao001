# 厂区智能物资定位管理系统

## 项目概述

妙巧巧（山西）技术发展有限公司的厂区智能物资定位管理系统，以飞书网页应用（H5）形态开发，嵌入飞书工作台，解决厂区内「物品在哪里」的高频需求。

**完整产品需求文档见: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md)**
（包含全部9大功能模块、34项具体功能、8种角色权限、六层痛点分析）

> 注意：原产品文档中提到的飞书小程序 API（tt.scanCode、tt.chooseImage、tt.getRecorderManager、tt.setStorage 等）已不可用。飞书已于2025年1月起下线新企业的小程序能力，本项目改用 H5 网页应用 + 飞书 JSSDK 方案实现等效功能。

## 技术方案变更对照

| 原方案 (小程序) | 现方案 (H5) | 说明 |
|---|---|---|
| tt.scanCode | html5-qrcode 库 | 调用浏览器摄像头扫码 |
| tt.chooseImage | `<input type="file" accept="image/*" capture>` | 浏览器原生拍照/选图 |
| tt.getRecorderManager | MediaRecorder + Web Audio API | 浏览器原生录音 |
| tt.setStorage | localStorage + Service Worker | 离线缓存 |
| tt.login | 飞书 JSSDK 网页授权 (OAuth) | 网页免密登录 |
| 飞书小程序框架 (.ttml/.ttss) | Vue 3 + Vite + TypeScript | 标准 H5 SPA |
| 小程序工作台入口 | 飞书网页应用工作台入口 | 在飞书开放平台配置 |

## 技术栈

- **前端**: Vue 3 + Vite + TypeScript + Vant 4 (移动端UI库)
- **后端**: Node.js + Express + TypeScript
- **数据库**: MySQL / PostgreSQL
- **飞书集成**: 飞书 JSSDK (网页端) + 飞书开放平台服务端 API（通讯录/消息卡片/审批/Bot）
- **共享类型**: TypeScript（shared/ 目录）
- **设备能力**: html5-qrcode (扫码), MediaRecorder (录音), Service Worker (离线)

## 目录结构

```
client/                # H5 前端 (Vue 3 + Vite)
  src/
    views/             # 页面: Home, Search, Map, ItemDetail, Scan, Browse, Dashboard, Onboarding
    components/        # 公共组件
    composables/       # 组合式函数 (useSearch, useAuth, useCache...)
    stores/            # Pinia 状态管理
    services/          # API 请求封装
    utils/             # 工具函数 (pinyin, cache, lark-jssdk)
    assets/            # 厂区平面图、图标
    router/            # Vue Router 路由配置
  public/
    sw.js              # Service Worker 离线缓存
  index.html
  vite.config.ts
server/                # 后端服务
  src/
    routes/            # RESTful API 路由
    controllers/
    models/            # 数据模型 & ORM
    middleware/         # 鉴权(飞书OAuth)、权限、审计日志
    services/          # 业务逻辑层
    jobs/              # 定时任务（新鲜度检查、有效期预警）
  migrations/          # 数据库迁移
  tests/
lark-bot/              # 飞书机器人服务
  handlers/            # 事件处理（消息、审批、卡片回调）
  cards/               # 消息卡片模板 JSON
  webhooks/
shared/                # 前后端共享
  types.ts             # 物品、角色、权限、API 请求/响应类型定义
  constants.ts         # 分类枚举、权限等级、状态码
```

## 角色与权限

系统有 8 种角色，三级权限（查看/编辑/管理）：

| 角色 | 查看范围 | 编辑权限 | 特殊限制 |
|------|----------|----------|----------|
| 实验室检测人员 | 全厂区（管控品需授权） | 实验室区域 | 易制毒品仅看到领用入口 |
| 仓储/物料管理 | 全厂区 | 所有库区 | 无 |
| 品控/质检 | 全厂区 | 品控工具借还 | 无 |
| 犬舍管理/饲养员 | 犬舍+成品区+库房 | 犬舍区域 | 按犬只编号过滤 |
| 行政/后勤 | 办公区+公共区域 | 行政物品 | 无 |
| 工程/设备维护 | 全厂区 | 设备及备件 | 无 |
| 管理层/厂长 | 全厂区（含管控品） | 全部 | 审计日志查看 |
| 新员工（培训期） | 全厂区（管控品除外） | 无 | 仅查看+引导模式 |

## API 规范

- RESTful 风格，JSON 请求/响应
- 路径格式: `/api/资源名` （复数形式）
- 认证: JWT Token，通过飞书网页 OAuth 获取
- 错误响应: `{ "error": { "code": "ERROR_CODE", "message": "描述" } }`
- 分页: `?page=1&limit=20`，响应包含 `{ data: [], total: number, page: number }`

## 代码规范

- ESLint + Prettier 自动格式化
- Commit message: `类型(模块): 描述`
  - 类型: feat / fix / style / refactor / test / chore / docs
  - 示例: `feat(search): 添加拼音模糊匹配`
- 分支: `feature/功能名` → PR 到 `develop` → 定期合并到 `main`
- PR 合并需要至少 1 人 Code Review + CI 通过

## 开发阶段

- **P1 (4-6周)**: MVP — 搜索、地图、物品管理、扫码、飞书OAuth登录、引导、离线缓存
- **P2 (6-8周)**: 协同 — 数据新鲜度、众包纠错、流转记录、飞书Bot、群聊查询
- **P3 (4-6周)**: 合规 — 管控物品、审计日志、有效期预警、驾驶舱、审批流
