# Reading App Flutter -> React Native 重构主文档

> 文档目标：把当前 `reading_app/` 的真实实现，拆解成可持续推进的 RN 重构路线图。  
> 文档原则：**代码与后续实现文档优先**，`dev_*.md` 仅作为早期设计参考。

---

## 1. 项目现状与范围

### 1.1 源项目（Flutter）
- 路径：`reading_app/`
- 架构主线：`GetX`（页面状态/路由） + 封装 `Dio`（网络）+ `sqflite` + `SharedPreferences`
- 核心故事数据：
  - 主数据：`reading_app/lib/mock/我心归处是良人/我心归处是良人_story_merged.json`
  - 原始数据：`reading_app/lib/mock/我心归处是良人/我心归处是良人_story.json`
- 当前主模块：推荐、广场、邂逅抽卡、我的、角色详情、故事详情、阅读器、分支剧情图、角色聊天

### 1.2 目标项目（React Native）
- 路径：`reading-app-rn/`
- 当前状态：Expo Router 初始化模板（尚未进入业务重构）
- 目标：逐步对齐 Flutter Demo 核心功能，不追求一次性全量交付

### 1.3 本阶段完成状态
- [x] 完成 Flutter 现状基线梳理（以代码为准）
- [x] 完成插件替换与模块映射方案
- [x] 完成分步骤重构计划文档（本文档）
- [ ] 开始 RN 代码重构（下一阶段）

---

## 2. Flutter 真实实现基线（重构依据）

## 2.1 页面与路由
- 路由中心：`reading_app/lib/router/route.dart`
- 主 Tabs：推荐 / 广场 / 邂逅 / 我的（`tabs_view.dart` + `tabs_controller.dart`）
- 详情流：故事详情 -> 阅读器；角色详情 -> 角色聊天

## 2.2 核心数据链路
- 故事详情、阅读器从 merged JSON 加载故事（优先 merged，降级原始 JSON）
- 阅读进度持久化：`reading_progress` 表（含 `current_node_id`、`choice_history`、`visited_node_ids`、`progress_percentage`）
- 阅读器设置持久化：`ReaderSettings` + SP
- 聊天消息持久化：`chat_messages` 表

## 2.3 已落地关键能力（迁移必保）
- 推荐：主视频 -> 临近结束决策按钮 -> 分支视频 -> 重开
- 广场：焦点轮播、分类、故事瀑布流、继续阅读卡片
- 邂逅：单抽/十连抽 + 结果态 + 角色跳转
- 我的：浏览记录、我的收藏、我的角色 + 前往邂逅
- 故事详情：角色区、分支图、评论区、阅读入口（纯享/互动）
- 阅读器：连续节点阅读、选择点、分支回滚、设置面板、高光图收录与设背景、进度保存
- 分支图：基于 `branch_graph` 数据动态构建
- 聊天：角色上下文 + AI 回复 + 本地历史

---

## 3. Flutter -> RN 架构映射（必须统一）

> 说明：RN 无法直接使用 GetX。这里使用“职责等价映射”，保证迁移后可维护。

| Flutter | RN 目标 |
|---|---|
| `GetPage + Get.toNamed` | `expo-router` 路由组织（`app/`） |
| `GetxController` | Feature Store + Hooks（建议 Zustand） |
| `Binding` | 路由文件内注入 + `providers/` 组合注入 |
| `Obx/GetBuilder` | `useStore(selector)` + `React.memo` |
| `Dio HttpClient` | `axios` 封装 `httpClient.ts`（拦截器/超时/错误映射） |
| `sqflite` | `expo-sqlite`（首选）或 `react-native-quick-sqlite`（非 Expo 托管） |
| `SharedPreferences` | `@react-native-async-storage/async-storage` |

### 3.1 建议 RN 目录骨架
```txt
reading-app-rn/
  app/                  # expo-router 页面
  src/
    features/
      recommend/
      square/
      encounter/
      me/
      story-detail/
      reader/
      character/
      chat/
    data/
      story/
    network/
      httpClient.ts
      api/
    storage/
      db/
      kv/
    i18n/
    shared/
      components/
      theme/
      utils/
```

---

## 4. 插件/能力替换清单（成熟稳定优先）

| Flutter 依赖/能力 | 使用处 | RN 替换建议 | 备注 |
|---|---|---|---|
| `get` | 页面状态与路由 | `expo-router` + `zustand` | 最关键基础替换 |
| `dio` | `core/network/http_client.dart` | `axios` | 建议做统一错误码层 |
| `sqflite` | 阅读进度/聊天等 | `expo-sqlite` | Expo 官方方案 |
| `shared_preferences` | 阅读设置 | `AsyncStorage` | 与设置 store 联动 |
| `video_player` | 推荐页视频 | `expo-video`（优先）或 `expo-av` | Expo 生态成熟 |
| `carousel_slider` | 广场轮播 | `react-native-reanimated-carousel` | 性能和维护较好 |
| `card_swiper` | 邂逅卡片轮播 | `react-native-deck-swiper`（快）/ 自定义 Reanimated | 看设计还原度 |
| `flutter_staggered_grid_view` | 瀑布流 | `@shopify/flash-list` + 双列布局 | 高性能列表 |
| `graphview` + 自绘分支图 | 分支图 demo/历史 | `react-native-svg` + `react-native-gesture-handler` + `reanimated` | 现有 Flutter 已主用自绘，RN 建议自研 |
| `flutter_chat_ui/core` | 聊天页 | `@flyerhq/react-native-chat-ui` 或 GiftedChat | 推荐先用 FlyerHQ 体系 |
| `flutter_svg` | SVG 资源 | `react-native-svg` + `react-native-svg-transformer` | 常规方案 |
| `intl` / `flutter_localizations` | 双语 | `i18next` + `react-i18next` + `expo-localization` | 必须从 Day1 接入 |

---

## 5. 模块映射（Flutter 文件 -> RN Feature）

## 5.1 推荐（视频首页）
- Flutter 参考：
  - `pages/recommend/recommend_controller.dart`
  - `pages/recommend/recommend_view.dart`
- RN Feature：`src/features/recommend`
- 关键迁移点：
  - 视频状态机（main/block/restart）
  - Tab 切换暂停恢复
  - 临近结束显示决策按钮

## 5.2 广场
- Flutter 参考：
  - `pages/square/square_controller.dart`
  - `pages/square/square_view.dart`
- RN Feature：`src/features/square`
- 关键迁移点：
  - 分类筛选
  - 焦点轮播
  - 继续阅读卡片（来自 `reading_progress`）

## 5.3 邂逅抽卡
- Flutter 参考：
  - `pages/encounter/encounter_controller.dart`
  - `pages/encounter/encounter_view.dart`
- RN Feature：`src/features/encounter`
- 关键迁移点：
  - main/singleResult/tenResult 三状态
  - 从结果跳角色详情/聊天

## 5.4 我的
- Flutter 参考：
  - `pages/me/me_controller.dart`
  - `pages/me/me_view.dart`
- RN Feature：`src/features/me`
- 关键迁移点：
  - 三标签内容（浏览记录/收藏/角色）
  - 更多邂逅引导

## 5.5 角色详情与聊天
- Flutter 参考：
  - `pages/character_detail/*`
  - `pages/character_chat/*`
  - `core/ai/qwen_ai_service.dart`
- RN Feature：
  - `src/features/character`
  - `src/features/chat`
- 关键迁移点：
  - 角色数据融合（真实角色+默认补全）
  - 聊天历史落库
  - AI 上下文截断（最近 N 条）

## 5.6 故事详情
- Flutter 参考：
  - `pages/story_detail/*`
  - `utils/story_branch_builder.dart`
- RN Feature：`src/features/story-detail`
- 关键迁移点：
  - 分支图展示区 + 进度条
  - 纯享/互动阅读入口参数化

## 5.7 阅读器（核心）
- Flutter 参考：
  - `pages/reader/reader_controller.dart`
  - `pages/reader/reader_view.dart`
  - `model/reader/reader_settings.dart`
  - `pages/reader/widgets/*`
- RN Feature：`src/features/reader`
- 关键迁移点：
  - 连续节点渲染与选择点推进
  - mainlineOnly 模式
  - 进度保存/恢复（含 scroll）
  - 设置面板、亮度蒙层、背景图
  - 高光图“收下/设背景”
  - 分支回滚

---

## 6. 双语方案（必须第一阶段接入）

### 6.1 现状
- Flutter 虽有 `l10n` 生成文件，但业务页面大量文本仍为硬编码中文。

### 6.2 RN 约束（后续开发必须遵守）
- 所有 UI 文本禁止硬编码在组件中，统一走 `t('key')`
- 新增文案必须同时提供 `zh-CN` 与 `en-US`
- 模块级命名空间：
  - `recommend.*`
  - `square.*`
  - `encounter.*`
  - `me.*`
  - `storyDetail.*`
  - `reader.*`
  - `character.*`
  - `chat.*`
  - `common.*`

---

## 7. 分阶段重构计划（可执行）

> 状态定义：`todo` / `doing` / `done` / `blocked`

## Phase 0 - 迁移基建（当前）
- 状态：`done`
- 输出：
  - 本文档
  - 技术栈与映射决策

## Phase 1 - 工程骨架与基础设施
- 状态：`done`
- 步骤：
  1. 建立 `src/` 分层目录
  2. 接入 `zustand`、`axios`、`i18next`、`expo-sqlite`、`AsyncStorage`
  3. 建立 `httpClient`（鉴权、超时、错误归一）
  4. 建立 DB 初始化与迁移脚本（`chat_messages`、`reading_progress`）
  5. 建立路由骨架（tabs + detail + reader + chat）
- 验收：
  - App 可启动
  - 任意页面可读写本地 DB
  - 中英文切换有效

## Phase 2 - 核心数据层迁移（故事 JSON）
- 状态：`done`
- 步骤：
  1. 复制并托管 `story_merged.json` 到 RN 资源目录
  2. 建立 Story 类型定义与解析器（对齐 `StoryWithNodes`）
  3. 建立分支图 `branch_graph` 解析器
  4. 建立阅读进度 Repository（含选择历史）
- 验收：
  - 可正确解析故事、节点、角色、分支图
  - 进度读写与 Flutter 字段兼容

## Phase 3 - Tabs 四大页面首版
- 状态：`done`
- 步骤：
  1. 推荐页视频状态机
  2. 广场页轮播+分类+故事列表+继续阅读
  3. 邂逅页三状态流程
  4. 我的页三标签
- 验收：
  - 交互流程可走通
  - 从列表到详情跳转完整

## Phase 4 - 故事详情与角色详情
- 状态：`done`
- 步骤：
  1. 故事详情头图/标签/评论区
  2. 角色横向卡片（解锁/未解锁态）
  3. 角色详情与作品列表
  4. 两种阅读入口（纯享/互动）
- 验收：
  - Story -> Character -> Chat / Reader 路径可走通

## Phase 5 - 阅读器核心能力
- 状态：`doing`
- 步骤：
  1. 连续节点渲染（虚拟列表）
  2. 选择点渲染与跳转
  3. 进度保存/恢复
  4. 设置面板（字号、行距、边距、背景、亮度、mainlineOnly）
  5. 高光图收录与设背景
  6. 分支图面板与回滚
- 验收：
  - 完成一次完整阅读链路（含分支选择与回退）

## Phase 6 - 聊天与 AI 接入
- 状态：`todo`
- 步骤：
  1. 聊天 UI 与消息状态（sending/sent/error）
  2. 聊天历史持久化
  3. AI API 接入（可先 Mock，再接真实）
- 验收：
  - 可稳定连续对话，重进可恢复历史

## Phase 7 - 性能与回归
- 状态：`todo`
- 步骤：
  1. 列表性能优化（FlashList）
  2. 渲染/重绘分析（Reader/Branch/Chat）
  3. 全链路回归与崩溃兜底
- 验收：
  - 关键页面无明显掉帧
  - 核心路径回归通过

---

## 8. 风险清单与应对

- 分支图交互复杂（缩放/点击/定位）  
  - 应对：先做静态版，再迭代手势与定位
- 阅读器内容量大导致重渲染  
  - 应对：虚拟列表 + 富文本切分缓存
- 聊天组件二次定制成本  
  - 应对：优先选可控 UI 库，保留 fallback 自研
- Flutter 历史数据与 RN 数据格式不一致  
  - 应对：在 Repository 层做兼容转换
- 双语治理失控（硬编码回流）  
  - 应对：PR 检查规则 + 文案 key 规范

---

## 9. 任务跟踪板（持续更新）

| 编号 | 任务 | 状态 | 备注 |
|---|---|---|---|
| T-001 | 完成 Flutter 基线审计 | done | 本文档已落地 |
| T-002 | 建立 RN 基础设施（state/network/db/i18n） | done | Phase 1 已完成（含网络错误模型与Repository层） |
| T-003 | 故事 JSON 数据层迁移 | done | 已完成 JSON 托管 + Story/branch_graph 解析器 + 页面接入验证 |
| T-004 | Tabs 四模块首版 | done | 推荐状态机 + 广场分类/继续阅读 + 邂逅三态 + 我的三标签 |
| T-005 | 故事详情 + 角色详情 | done | 已完成故事评论区、角色作品列表、互动/纯享阅读入口参数化 |
| T-006 | 阅读器核心功能 | doing | 已完成连续渲染/选择跳转/进度恢复与回写/设置面板（滑轨/主题联动）持久化、亮度蒙层、高光图点击弹层+收录设背景（含本地资源迁移）、分支图面板自绘与回滚规则对齐、角色弹层（底部一体化容器+横向角色卡+解锁态+点击规则）对齐；待补开场动画遮罩层迁移 |
| T-007 | 聊天与 AI | todo | Phase 6 |
| T-008 | 性能与回归 | todo | Phase 7 |

---

## 10. 下一会话接力指引

下次直接按以下方式继续：
1. 先读本文件：`reading-app-rn/docs/rn_rebuild_master_plan.md`
2. 从 `Phase 1 / T-002` 开始执行，不跳阶段
3. 每完成一个子任务，更新：
   - 任务状态表
   - 风险与问题记录
   - 已实现文件清单
4. 所有新增 UI 文本必须同步中英两套文案
5. 所有请求必须走统一 `httpClient`

---

## 附：关键 Flutter 参考文件

- 路由与主入口：
  - `reading_app/lib/main.dart`
  - `reading_app/lib/router/route.dart`
  - `reading_app/lib/utils/app_navigator.dart`
- 主要模块：
  - `reading_app/lib/pages/recommend/*`
  - `reading_app/lib/pages/square/*`
  - `reading_app/lib/pages/encounter/*`
  - `reading_app/lib/pages/me/*`
  - `reading_app/lib/pages/story_detail/*`
  - `reading_app/lib/pages/reader/*`
  - `reading_app/lib/pages/character_detail/*`
  - `reading_app/lib/pages/character_chat/*`
- 数据与工具：
  - `reading_app/lib/mock/我心归处是良人/我心归处是良人_story_merged.json`
  - `reading_app/lib/model/story_read/*`
  - `reading_app/lib/utils/story_branch_builder.dart`
  - `reading_app/lib/utils/story_importer.dart`
  - `reading_app/lib/utils/story_node_merger.dart`

