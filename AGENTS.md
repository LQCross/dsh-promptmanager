# prompt-manager — DSH 插件

提示词库：设置页增删改查、JSON 导出/导入；输入框书本图标左键插草稿、右键开本会话工作目录。纯浏览器半，无构建。

## 命令

- `node --check client.js`
- `node selftest.mjs` — 15 断言（数据层 14 + 写失败上报 1），改数据层 / 存储路径必跑
- 安装 `plugin_manager install_bundle <repo 路径>`；卸载 `remove_bundle @local/prompt-manager`
- 改 `client.js` 刷新页面；改清单 / 补丁重启 DSH

## 目录

- `client.js` — 字典、store、设置页、输入框按钮、导出导入、右键开目录
- `index.js` — Host 半，仅 `apply(){}`
- `cordis.patch.yml` — Loader 行 `prompt-manager`
- `package.json` — bundle patch、`dsh.client`(web)、`engines.dsh`
- `locale/*.json` — Plugin Manager 的标题/简介
- `selftest.mjs` — 抽 data-layer 块断言（依赖 begin/end 标记）
- `prompt-manager-*.json` — 导出快照

## 调用链

- 装载 `__ModuleLoader__.load({id, factory})`，factory 只 `require('react')`/`require('react-dom')`（平台种子），返回 `{apply, inject:['slots','locale']}`
- `apply`：`locale.register(NS)` → 注入 `<style>` → storage 事件 → 两次 `slots.inject`
- 数据 `localStorage['dsh.prompt-manager.v1']` → `read/write/notify` → `usePrompts`
- 插入 `inputActions.captureInsertion()` + `insertText`，false 降级复制
- 右键 `sessions.list` 快照 `byId[id].cwd` → `GET open-in-app/apps` → `POST open-in-app/open`
- 导入 `parseImportText` → `planImport` → `persistList`（失败回滚）→ 成功才 notify

## 约定

- 纯 JS：无 JSX/TS/import，`const h = React.createElement`
- 文案走 `ctx.locale`，NS=`prompt-manager`，zh/en 同步
- 样式只用 `--dsw-alias-*`，类名 `dspm-` 前缀
- UTF-8 无 BOM、CRLF
- 版本同步：`package.json.version` ↔ `PLUGIN_RELEASE`
- 条目 `{id,title,content,tags,favorite,updatedAt}`；信封 `formatVersion:1`

## 扩展

- 设置项 → `PromptSettingsPage` + zh/en
- 入口 → `slots.inject(槽, () => slots.register({name,id,order,locale}, 组件))`
- 导入规则 → `normalizeImportItem`/`planImport` + selftest
- 右键 → `apply` 的 `openFolder` + `PromptQuick.onContextMenu`
- 导出字段 → `buildExportDocument` + 提升 `EXPORT_VERSION`

## 禁止

- 不 `require` Harness 客户端包，控件自写（平台种子 `react`/`react-dom` 除外）
- 不写别处 DOM、不向 body 追加 UI（下载 `<a>` 除外，`conversation.input.*` 的弹层必须 portal）
- 不动 data-layer 的 begin/end 标记
- 不新增 localStorage 键
- 不加 BOM、不加构建、Host 半无副作用
- 不改 `formatVersion:1` 语义；失败整体拒绝，不得部分导入
- 写存储失败必须上报（`write()` 返回 false → 弹 `errWrite`），不得谎报成功
