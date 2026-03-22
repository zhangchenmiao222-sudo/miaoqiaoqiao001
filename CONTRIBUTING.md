# 贡献指南

## 开发环境设置

```bash
# 1. Clone 仓库
git clone <repo-url>
cd smart-asset-locator

# 2. 安装依赖
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# 3. 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env 填入实际配置

# 4. 启动开发服务
npm run dev
# 前端: http://localhost:3000
# 后端: http://localhost:3001
```

## 分支规范

```
main        ← 生产分支，保护分支，不直接推送
develop     ← 开发主分支，PR 合并目标
feature/xxx ← 功能分支，从 develop 创建
fix/xxx     ← 修复分支，从 develop 创建
hotfix/xxx  ← 紧急修复，从 main 创建
```

### 工作流程

1. 从 `develop` 创建功能分支：`git checkout -b feature/搜索优化 develop`
2. 开发并提交（遵循 commit 规范）
3. 推送分支并创建 Pull Request → `develop`
4. 至少 1 人 Code Review 通过后合并
5. 定期由负责人将 `develop` 合并到 `main` 发布

## Commit 规范

格式：`类型(模块): 描述`

```
feat(search): 添加拼音模糊匹配
fix(auth): 修复 Token 过期未跳转登录页
style(home): 调整首页卡片间距
refactor(api): 统一错误响应格式
test(items): 添加物品搜索单元测试
chore(deps): 升级 vant 到 4.9.0
docs(readme): 更新部署说明
```

## 代码规范

- 提交前运行 `npm run lint` 确保通过
- TypeScript 严格模式，避免 `any`
- Vue 组件使用 `<script setup lang="ts">` 语法
- API 类型变更必须同步更新 `shared/types.ts`

## Code Review 要点

- 功能是否符合需求
- 代码是否清晰可维护
- 是否有安全隐患（XSS、注入等）
- 是否影响其他模块
- 是否有对应测试
