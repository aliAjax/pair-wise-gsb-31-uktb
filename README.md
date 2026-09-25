# ReSwap 二手闲置物品交换平台

```bash
pnpm install
pnpm dev
```

访问地址：`http://localhost:18415`

## 项目介绍

ReSwap 是一个纯前端以物换物 Web 应用。用户可以本地模拟登录、发布闲置物品、浏览他人物品、发起交换请求，并在浏览器内管理交换记录。

## 主要功能

- 首页瀑布流浏览、分类筛选、关键词搜索。
- 物品详情、物主资料、选择自己的物品发起交换。
- **三方环形接力**：在他人物品详情选择自己的物品，沿各方“想换取”关系自动寻找最多三方的闭合链路；成环即把三件物品一起锁定，三方各自确认后一起成交，任一方退出则释放全部占用并将方案转为失效（历史保留）。
- 发布物品，支持本地 base64 图片上传、分类和成色选择。
- 交换管理，区分我发起的和我收到的请求，支持同意、拒绝、完成。
- 接力管理页（/rings），区分待确认、与我相关、历史记录。
- 个人中心，编辑资料、上传头像、查看我发布的物品。
- 主题切换、全局错误处理和 Vant 提示。

## 启动与构建

```bash
pnpm install
pnpm dev
```

```bash
pnpm build
```

生产部署：执行 `pnpm build` 后，将 `dist/` 目录交给 Nginx 或任意静态文件服务器托管。

## 技术栈

| 类型 | 技术 |
| --- | --- |
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| UI | Vant + Tailwind CSS |
| 持久化 | localStorage + IndexedDB（idb-keyval） |
| 工具库 | dayjs、lodash-es |

## 项目目录结构

```text
src/
├── api/              # userApi.ts, itemApi.ts, exchangeApi.ts, ringApi.ts：本地数据 API 层
├── stores/           # authStore.ts, itemStore.ts, exchangeStore.ts, ringStore.ts, themeStore.ts
├── models/           # user.ts, item.ts, exchange.ts, ringPlan.ts：独立数据模型
├── types/            # 共享类型补充
├── components/common/# 共享业务组件（含 RingPlanCard）和 GlobalErrorBoundary
├── hooks/            # useAuth.ts, useLocalStorage.ts, useExchangeStats.ts
├── pages/            # Home, ItemDetail, Publish, Exchanges, Rings, Profile
├── router/           # index.ts + guards.ts
├── utils/            # storage.ts, ringMatcher.ts, formatters.ts, validators.ts, message.ts, themeUtils.ts
├── constants/        # item.ts, exchange.ts, ring.ts, themes.ts, messages.ts
├── App.vue
├── main.ts
└── styles.css
```

## 数据持久化说明

- `utils/storage.ts` 统一封装 localStorage 和 IndexedDB。
- 所有 `api/*Api.ts` 通过 `storage.ts` 读写数据，不在组件里直接写业务数据。
- 存储层包含序列化、版本号、过期清理、存储 key 管理。
- 首次启动会写入演示用户、物品和交换请求（含一条可直接成环的三方“想换取”链：露营椅 → 拍立得 → 设计书 → 露营椅）。

## 三方环形接力

双人互换之外的接力规则与分层：

- **交换模型**：`src/models/ringPlan.ts` 的 `RingPlan` / `RingLeg` 独立定义；状态枚举 `RingStatus` 在 `src/constants/ring.ts`（LOCKED 待确认 / COMPLETED 已成交 / FAILED 已失效）。
- **成环判断**：`src/utils/ringMatcher.ts` 是纯函数模块。待确认（pending）的双人交换请求被视为“想换取”有向边（`toWantEdges`）；`findTripleRings` 从发起人选中的他人物品出发，沿边最多走三方并校验能回到自己的物品，闭合条件为 `legs[i].want_item_id === legs[(i+1) % n].offer_item_id`；`isClosedRing` / `assertItemsLockable` 负责归属校验和占用校验。
- **本地存储**：`src/api/ringApi.ts` 负责持久化。建环时先把三件物品一起置为 `ItemStatus.LOCKED`；锁定中的物品不能再发起/同意其他交换，也不能下架。三方各自 `confirm`，全员确认后 `settle` 把三件物品一起置为已交换并闭环对应双人请求；任一方 `quit` 则释放全部物品回可交换、方案转 FAILED 但记录保留。
- **页面**：入口在 `src/pages/ItemDetail.vue`（选自己物品 → 查找闭环 → 预览环链 → 发起锁定），管理在 `src/pages/Rings.vue` 与 `src/components/common/RingPlanCard.vue`。
- 演示路径：以默认用户“青禾”打开拍立得详情，选择自己的“可折叠露营椅”，即可查出三方闭环。

## 横切关注点

- 主题切换：`stores/themeStore.ts`、`constants/themes.ts`、`utils/themeUtils.ts`、`App.vue`、`components/common/CategoryFilter.vue`、`components/common/UserBrief.vue`、`components/common/ItemCard.vue`。
- 全局错误处理/提示：`utils/message.ts`、`components/common/GlobalErrorBoundary.tsx`、`stores/authStore.ts`、`stores/itemStore.ts`、`stores/exchangeStore.ts`、`components/common/ImageUploader.vue`。

## 枚举出现位置清单

### ItemStatus

定义位置：`src/constants/item.ts`（含 AVAILABLE / EXCHANGED / OFFLINE / LOCKED）

出现位置：

- `src/models/item.ts`
- `src/constants/messages.ts`
- `src/api/itemApi.ts`
- `src/api/exchangeApi.ts`
- `src/api/ringApi.ts`
- `src/utils/ringMatcher.ts`
- `src/stores/itemStore.ts`
- `src/router/guards.ts`
- `src/utils/formatters.ts`
- `src/types/index.ts`
- `src/components/common/ItemCard.vue`
- `src/pages/ItemDetail.vue`
- `src/pages/Publish.vue`
- `src/pages/Profile.vue`

### ExchangeStatus

定义位置：`src/constants/exchange.ts`

出现位置：

- `src/models/exchange.ts`
- `src/constants/messages.ts`
- `src/api/exchangeApi.ts`
- `src/api/ringApi.ts`
- `src/utils/ringMatcher.ts`
- `src/stores/exchangeStore.ts`
- `src/router/guards.ts`
- `src/utils/formatters.ts`
- `src/types/index.ts`
- `src/hooks/useExchangeStats.ts`
- `src/components/common/ExchangeCard.vue`
- `src/pages/ItemDetail.vue`
- `src/pages/Exchanges.vue`

### RingStatus

定义位置：`src/constants/ring.ts`（LOCKED / COMPLETED / FAILED）

出现位置：

- `src/models/ringPlan.ts`
- `src/constants/messages.ts`
- `src/api/exchangeApi.ts`
- `src/api/ringApi.ts`
- `src/stores/ringStore.ts`
- `src/router/guards.ts`
- `src/utils/formatters.ts`
- `src/types/index.ts`
- `src/components/common/RingPlanCard.vue`
- `src/pages/Rings.vue`

## 分层与高耦合约束

本项目保留提示词要求的“严禁合并职责到单一文件”：模型、常量、API、store、页面、组件、hooks、utils 均独立拆分。

同时保留“屎山代码设计要求”的低内聚高耦合特征：

- `utils/formatters.ts` 同时负责日期、物品状态、交换状态、成色、信用等级文本。
- `constants/messages.ts` 同时包含页面提示、表单校验、日志式文案和状态文案。
- `ItemStatus` 与 `ExchangeStatus` 被模型、API、store、组件、页面、router guards、formatters 多处引用。
- `utils/storage.ts` 是存储入口，但全应用 API 和 store 都依赖它的 key 与数据结构。

例如新增 `ItemStatus.BOOKED` 时，应至少修改：`src/constants/item.ts`、`src/models/item.ts`、`src/api/itemApi.ts`、`src/api/exchangeApi.ts`、`src/api/ringApi.ts`、`src/stores/itemStore.ts`、`src/router/guards.ts`、`src/utils/formatters.ts`、`src/constants/messages.ts`、`src/components/common/ItemCard.vue`、`src/pages/ItemDetail.vue`、`src/pages/Publish.vue` 等文件。本次新增的 `ItemStatus.LOCKED` 即按此清单触达各层。

## 环境变量

当前项目无必需环境变量。

## License

MIT
