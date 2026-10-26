# BMusic 代码分析与改进建议

## 一、项目概述

BMusic 是一个基于 **Electron + Vue 3 + Vite** 的多平台背景音乐播放器，支持 Bilibili 和网易云音乐。架构上采用 Electron 三进程模型（Main / Preload / Renderer），renderer 使用 Vue 3 Composition API + vue-router，数据持久化使用 SQLite（账户）+ JSON 文件（歌单）+ localStorage（设置/历史）。

---

## 二、架构分析

### 2.1 整体架构图

```
Main Process (src/main/)
├── index.ts          — 窗口创建、托盘、单实例锁
├── ipcAPI.ts         — IPC 入口（聚合导入）
├── ipcapis/          — 各模块 IPC handler
│   ├── ipcPlayListsApi.ts    — 歌单 CRUD（JSON 文件）
│   ├── ipcBilibiliApi.ts     — B站 API 代理
│   ├── emoMusicApi.ts        — 网易云 API 代理
│   ├── ipcAccountSettings.ts — 账户/登录管理
│   ├── ipcSettings.ts        — 系统设置/快捷键
│   └── ipcDesktopLyrics.ts   — 桌面歌词窗口
└── db/sqlite.ts      — SQLite 账户数据库

Preload (src/preload/)
├── index.ts          — 暴露 electron API（contextIsolation=false）
└── players/BilibiliMusicPlayer/
    ├── BilibiliMusicPlayer.ts — B站播放器 preload 脚本
    ├── BilibiliMusicSearch.ts — B站搜索 preload 脚本
    └── Control.ts             — B站播放器 DOM 操控

Renderer (src/renderer/src/)
├── main.ts / App.vue — 入口、MediaSession、快捷键
├── router/           — vue-router 路由
├── mod/              — 功能模块（playing, playingList, content, nav 等）
├── storage/          — 持久化（playList, history, lyrics）
├── store/            — Pinia store（仅 playlistStore）
├── ipcApi/           — renderer 侧 IPC 封装
└── components/       — 通用 UI 组件
```

---

## 三、发现的问题与改进建议

### 🔴 严重问题（安全/稳定性）

#### 1. `contextIsolation: false` + `webSecurity: false` — 安全风险极高

**文件**: `src/main/index.ts:88-89`

```ts
contextIsolation: false,
webSecurity: false,
```

这两个配置组合意味着：
- 渲染进程可直接访问 Node.js API（`require`, `fs`, `child_process` 等）
- 关闭了同源策略，任何注入到 webview 的内容都可以执行任意 Node.js 代码
- B站视频页面如果有 XSS 漏洞，攻击者可获得本机完整文件系统访问权限

**建议**: 
- 开启 `contextIsolation: true`，通过 `contextBridge.exposeInMainWorld` 暴露安全的 API
- 保持 `webSecurity: true`，CORS 问题通过 main 进程代理解决
- 对 webview 使用独立的 session 并限制权限

#### 2. 歌单数据使用相对路径 `"./PlayLists"` — 数据丢失风险

**文件**: `src/main/ipcapis/ipcPlayListsApi.ts:8`

```ts
const playListPath = "./PlayLists";
```

相对路径取决于 `process.cwd()`，在打包后可能指向系统目录（如 Windows 的 `C:\Windows\System32`），导致：
- 歌单数据写入不可预期的位置
- 不同启动方式下数据不一致
- 升级/重装后数据丢失

**建议**: 使用 `app.getPath('userData')` 作为基础路径：
```ts
import { app } from 'electron';
const playListPath = join(app.getPath('userData'), 'PlayLists');
```

#### 3. 调试代码暴露全局对象

**文件**: `src/renderer/src/storage/playListStorage.ts:276`

```ts
// @ts-ignore TODO: 调试方便，到时候删除 fix this
window.playListStorage = playListStorage;
```

生产环境暴露内部数据操作接口，配合 `contextIsolation: false`，攻击面更大。

**建议**: 删除或用 `import.meta.env.DEV` 条件守护。

---

### 🟡 架构问题

#### 4. IPC 通道名称无类型约束 — 易出错且难重构

main 和 renderer 之间通过字符串匹配 IPC 通道名：

```ts
// main 端
ipcMain.handle('ipcBilibiliApi__getUserInfo', async () => {...})

// renderer 端
electron.ipcRenderer.invoke('ipcBilibiliApi__getUserInfo')
```

没有共享的类型定义或常量，新增/修改 IPC 接口时容易出现拼写错误、参数类型不匹配，且无法得到编译器检查。

**建议**: 
- 创建 `src/shared/ipc-channels.ts` 定义所有通道名常量和类型
- 或使用 `electron-trpc` / 自定义类型安全的 IPC 封装

#### 5. 状态管理分散 — 三套并行方案

项目同时使用了三种状态管理方式：
- **reactive/ref 模块级单例**：`playing.ts`, `playingList.ts`, `content.ts`, `popUp.ts`
- **Pinia store**：`playlistStore.ts`（仅用于临时播放列表）
- **localStorage**：主题、快捷键、自动播放、播放进度等

Pinia 仅定义了一个 store 且只有一个字段，其余核心状态全部散落在各模块文件中。这导致：
- 状态依赖关系不透明（`playingList.ts` 直接 watch `musicPlayer` 的内部 ref）
- 无法使用 Vue DevTools 统一调试
- 模块间耦合隐蔽

**建议**: 
- 将 `musicPlayer`、`playList`、`historyStorage` 等核心状态迁移到 Pinia store
- 或者如果团队更偏好模块化 reactive，则移除 Pinia 依赖，保持一致性
- 统一 localStorage 读写到一个 `settingsStore` 中

#### 6. 路由与遗留的 `content.ts` 并存

`src/renderer/src/router/index.ts` 定义了完整的 vue-router 路由，但 `src/renderer/src/mod/content/content.ts` 仍使用手动 `shallowRef` 切换组件的旧方案。两套导航机制并存，可能导致状态不同步。

**建议**: 统一使用 vue-router 管理所有页面切换，移除 `content.ts` 中的手动组件切换逻辑。

#### 7. 持久化策略不一致

| 数据 | 存储方式 | 位置 |
|------|---------|------|
| 账户 | SQLite | `userData/bmusic_accounts.db` |
| 歌单 | JSON 文件 | `./PlayLists/`（相对路径！） |
| 播放历史 | localStorage | 浏览器沙箱 |
| 歌词设置 | localStorage | 浏览器沙箱 |
| 播放列表/进度 | localStorage | 浏览器沙箱 |
| 窗口位置 | JSON 文件 | `userData/window-bounds.json` |

localStorage 容量有限（通常 5-10MB），存储大量播放历史或大歌单列表时可能溢出并静默失败。

**建议**: 
- 将歌单、播放历史等数据统一迁移到 SQLite
- 或至少用 `electron-store` 替代 localStorage，获得更大存储空间和更好的错误处理

---

### 🟡 代码质量问题

#### 8. B站控制脚本依赖 DOM 选择器 — 极度脆弱

**文件**: `src/preload/players/BilibiliMusicPlayer/Control.ts`

大量使用 CSS 选择器直接操控 B站播放器 DOM：

```ts
document.querySelector('.bpx-player-ctrl-time-label')
document.querySelector('.bpx-player-ctrl-btn.bpx-player-ctrl-play')
document.querySelector('.video-like.video-toolbar-left-item')
```

B站前端频繁更新，一旦 class name 变化整个播放器就会失效。

**建议**: 
- 添加 null 检查和 fallback 逻辑，在找不到元素时优雅降级
- 考虑使用 B站官方 API 获取播放信息，减少对 DOM 的依赖
- 添加版本检测或元素探测机制，在 UI 变化时给用户提示

#### 9. 字幕获取通过注入 `<script>` 标签 — 不安全

**文件**: `src/preload/players/BilibiliMusicPlayer/Control.ts:449-503`

通过 `document.createElement('script')` 注入代码到 B站页面，然后通过隐藏 DOM 元素传递数据。这种方式：
- 绕过了 CSP 保护
- 代码维护困难（纯字符串拼接的 JS）
- 数据传递不可靠

**建议**: 在 preload 脚本中直接使用 `fetch` 调用 B站 API（preload 可以绕过 CORS），或通过 main 进程代理 API 调用。

#### 10. `any` 类型滥用

多处使用 `any` 类型，丧失了 TypeScript 的价值：

```ts
// emoMusicApi.ts
export async function personalized(params?: any) { ... }
export async function recommend_songs(params?: any) { ... }

// sqlite.ts
let Database: any = null;
let db: any = null;
```

**建议**: 
- 为网易云 API 定义请求/响应接口
- 为 SQLite 操作创建类型安全的封装层
- 设置 `tsconfig.json` 中 `noImplicitAny: true`

#### 11. 拼写错误影响代码可读性

| 文件 | 错误 | 正确 |
|------|------|------|
| `playing.ts:49` | `"buttom"` | `"bottom"` |
| `playing.ts:62` | `isShwoNusicName` | `isShowMusicName` |
| `playing.ts:58` | `'fixe'` | `'fixed'` |
| `playListStorage.ts:102` | `deleteed` | `deleted` |
| `playListStorage.ts:103` | `musicListInconUrl` | `musicListIconUrl` |

**建议**: 全项目统一修正，考虑启用 `cspell` 拼写检查。

---

### 🟡 性能与用户体验

#### 12. Cookie 变化时全量序列化所有 Cookie

**文件**: `src/main/index.ts:173-184`

```ts
session.defaultSession.cookies.on('changed', () => {
    // debounce 1s
    const cookies = await session.defaultSession.cookies.get({});
    const cookieJson = JSON.stringify(cookies);
    updateActiveAccountCookies(cookieJson);
});
```

每次任何 cookie 变化都会获取**所有** cookie 并序列化写入 SQLite。浏览 B站时 cookie 变化频繁，这会造成不必要的 I/O。

**建议**: 
- 只保存相关域名的 cookie（`.bilibili.com`, `.music.163.com`）
- 增大 debounce 间隔（3-5s）
- 或仅在关闭窗口/切换账户时保存

#### 13. 歌单列表每次操作都整体重新加载

**文件**: `src/renderer/src/storage/playListStorage.ts`

`savePlayList`、`deletePlayList`、`renamePlayList` 等操作后都调用 `loadPlayList()` 重新获取完整列表：

```ts
async savePlayList(name, musicList) {
    await ipcPlayListsApi.savePlaylistData(name, JSON.stringify(musicList));
    if (!existed) {
        playLists.value = await loadPlayList(); // 全量重新加载
    }
}
```

**建议**: 在本地维护列表状态，只在必要时与后端同步，避免不必要的 IPC + 文件 I/O。

#### 14. `playingList.ts` 在模块加载时立即执行副作用

```ts
// 在文件顶层就开始读取 localStorage、设置 watcher、注册 IPC listener
if (localStorage.getItem('bmusic-remember-progress') !== 'false') {
    const savedListStr = localStorage.getItem('bmusic-saved-playlist');
    ...
}
```

模块级副作用让代码难以测试，且导入顺序依赖隐蔽。

**建议**: 将初始化逻辑封装到显式的 `init()` 函数中，在 `App.vue` 的 `onMounted` 中调用。

#### 15. 硬编码强制禁用自动播放

**文件**: `src/renderer/src/mod/playingList/playingList.ts:50`

```ts
// Force disable auto-play as requested by the user
localStorage.setItem('bmusic-auto-play', 'false');
if (localStorage.getItem('bmusic-auto-play') !== 'true') {
    setTimeout(() => { musicPlayer.requestPause(); }, 100);
}
```

先设置为 false 再检查是否为 true，这段逻辑永远为真，等于强制暂停。如果是临时修复应该用更清晰的方式表达。

**建议**: 如果确实要禁用自动播放，简化为 `musicPlayer.requestPause()`；如果是可配置的，恢复正常的设置检查逻辑。

---

### 🟢 优化建议

#### 16. 缺少错误边界和用户提示

API 调用（B站、网易云）失败时，大多只有 `console.error`，没有用户可见的反馈。

**建议**: 
- 利用已有的 `notifications` 系统，在 API 失败时弹出用户友好的错误提示
- 添加重试机制

#### 17. 缺少单元测试

项目完全没有测试文件。

**建议**: 
- 至少为核心逻辑（`compareMusic`、`playList.next/prev`、`historyStorage`）添加单元测试
- 使用 Vitest（已集成 Vite 生态）

#### 18. 缺少 ESLint 配置

项目只有 Prettier 格式化，没有 ESLint 静态检查。

**建议**: 添加 `@typescript-eslint` + `eslint-plugin-vue` 配置。

#### 19. 路由懒加载不完整

`src/renderer/src/router/index.ts` 中所有路由组件都是同步导入：

```ts
import Recommend from '../mod/content/contents/Recommend.vue'
import SearchContents from '../mod/content/contents/SearchContents.vue'
// ...全部同步导入
```

**建议**: 除首页 `Recommend` 外，其余路由使用 `() => import(...)` 懒加载。

#### 20. `electron-builder.yml` 中的占位配置

```yaml
appId: com.electron.app        # 应改为 com.bmusic.app
publish:
  url: https://example.com/auto-updates  # 占位 URL
```

**建议**: 更新为正式的 appId 和自动更新地址。

---

## 四、改进优先级路线图

| 优先级 | 改进项 | 影响 | 工作量 |
|--------|--------|------|--------|
| P0 | 修复 `contextIsolation`/`webSecurity` | 安全 | 大（需重构 preload） |
| P0 | 歌单路径改用绝对路径 | 数据安全 | 小 |
| P1 | 统一 IPC 类型定义 | 可维护性 | 中 |
| P1 | 统一状态管理方案 | 架构一致性 | 中 |
| P1 | 修复拼写错误 | 代码质量 | 小 |
| P1 | 移除调试代码 | 安全 | 小 |
| P2 | Cookie 保存优化 | 性能 | 小 |
| P2 | 消除 `any` 类型 | 类型安全 | 中 |
| P2 | 添加 ESLint | 代码质量 | 小 |
| P2 | B站控制脚本容错 | 稳定性 | 中 |
| P3 | 路由懒加载 | 性能 | 小 |
| P3 | 添加单元测试 | 质量保证 | 中 |
| P3 | 统一持久化方案 | 架构 | 大 |

---

## 五、总结

BMusic 的功能实现丰富（多平台播放、桌面歌词、账户系统、SMTC 集成等），代码组织有一定的模块化意识。主要问题集中在：

1. **安全性**：`contextIsolation: false` + `webSecurity: false` 是最大的安全隐患，应优先解决
2. **数据可靠性**：歌单存储使用相对路径、localStorage 存储大量数据，都有数据丢失风险
3. **架构一致性**：状态管理、路由、持久化方案各有多套并行，增加了维护复杂度
4. **脆弱性**：B站播放器控制完全依赖 DOM 选择器，面对上游变化非常脆弱

建议优先修复安全问题和数据路径问题，然后逐步统一架构方案，最后补充测试和工具链配置。
