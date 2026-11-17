/**
 * Prompt Manager — browser half.
 *
 * Two seats on the shipped Harness UI:
 *   1. `settings.section`      → 提示词库管理页（新建 / 编辑 / 删除 / 置顶 / 搜索 / 复制）
 *   2. `conversation.input.left` → 输入框工具行里的书本按钮，弹出选择器，
 *      用官方的 InputActions（captureInsertion + insertText）把提示词插进草稿。
 *
 * 数据存在浏览器 localStorage，键名 dsh.prompt-manager.v1。
 */
window.__ModuleLoader__.load({
  id: '@local/prompt-manager',
  factory(require) {
    const React = require('react');
    const { createPortal } = require('react-dom');
    const h = React.createElement;

    const NS = 'prompt-manager';
    const STORAGE_KEY = 'dsh.prompt-manager.v1';
    const STYLE_ID = 'prompt-manager-style';

    /* ------------------------------------------------------------------ */
    /* 文案                                                                */
    /* ------------------------------------------------------------------ */

    const zh = {
      nav: '提示词',
      heading: '提示词库',
      subtitle: '保存常用提示词；在输入框工具行点书本图标即可插入草稿，插入后还能继续编辑。',
      search: '搜索提示词…',
      create: '新建',
      save: '保存',
      cancel: '取消',
      edit: '编辑',
      remove: '删除',
      confirmRemove: '确认删除',
      copy: '复制',
      copied: '已复制到剪贴板',
      copyFailed: '复制失败',
      saved: '已保存',
      empty: '还没有提示词，点「新建」添加第一条。',
      noMatch: '没有匹配的提示词。',
      count: '共 {count} 条',
      untitled: '未命名提示词',
      titlePlaceholder: '名称，例如「代码审查」',
      contentPlaceholder: '提示词内容，插入到输入框后可直接编辑再发送',
      tagsPlaceholder: '标签，用逗号分隔（可留空）',
      favorite: '置顶',
      unfavorite: '取消置顶',
      titleRequired: '请填写名称',
      contentRequired: '请填写内容',
      inserted: '已插入输入框',
      insertFallback: '插入失败，已复制到剪贴板',
      trigger: '提示词库',
      pickerEmpty: '提示词库是空的：设置 → 提示词 里新建。',
      export: '导出',
      import: '导入',
      exported: '已导出 {count} 条提示词',
      importTotal: '文件内 {count} 条',
      importDedup: '文件内重复 id 已合并 {count} 条',
      modeMerge: '合并（保留本机）',
      modeReplace: '替换（清空本机）',
      importMergePlan: '将新增 {added} 条，覆盖同 id 的 {overwritten} 条；本机其它条目保持不变。',
      importReplacePlan: '将用文件内 {count} 条替换本机全部 {removed} 条，未导出的本机条目会丢失。',
      confirmImport: '确认导入',
      confirmReplace: '再次点击以确认替换',
      importDone: '导入完成：新增 {added} 条，覆盖 {overwritten} 条',
      importDoneReplace: '替换完成：现共 {count} 条',
      errRead: '读取文件失败，请重试',
      errNotJson: '文件不是合法 JSON，未做任何改动',
      errShape: '文件内容既不是提示词数组，也不是本插件的导出文件，未做任何改动',
      errFormat: '不是本插件的导出文件（format 字段不匹配），未做任何改动',
      errVersion: '导出文件版本为 {version}，当前插件只支持版本 1，未做任何改动',
      errItems: '导出文件缺少 items 数组，未做任何改动',
      errItem: '第 {index} 条数据无效',
      errItemContent: '缺少内容（content 为空或不是文本）',
      errItemObject: '不是对象',
      errWrite: '写入浏览器存储失败（可能空间不足或被禁用），已回滚，未做任何改动',
      folderHint: '右键：在文件资源管理器中打开本会话的工作目录',
      openedFolder: '已在文件管理器中打开工作目录',
      errNoDirectory: '本会话没有工作目录，无法打开',
      errOpenFolder: '打开失败：宿主没有可用的文件管理器，或该路径不被接受',
    };

    const en = {
      nav: 'Prompts',
      heading: 'Prompt library',
      subtitle: 'Save reusable prompts; click the book icon in the composer toolbar to insert one into the draft.',
      search: 'Search prompts…',
      create: 'New',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      remove: 'Delete',
      confirmRemove: 'Confirm',
      copy: 'Copy',
      copied: 'Copied to clipboard',
      copyFailed: 'Copy failed',
      saved: 'Saved',
      empty: 'No prompts yet. Click "New" to add the first one.',
      noMatch: 'No matching prompt.',
      count: '{count} prompt(s)',
      untitled: 'Untitled prompt',
      titlePlaceholder: 'Name, for example "Code review"',
      contentPlaceholder: 'Prompt text; it lands in the composer and stays editable',
      tagsPlaceholder: 'Tags, comma separated (optional)',
      favorite: 'Pin',
      unfavorite: 'Unpin',
      titleRequired: 'A name is required',
      contentRequired: 'Prompt text is required',
      inserted: 'Inserted into the composer',
      insertFallback: 'Insert failed; copied to clipboard instead',
      trigger: 'Prompt library',
      pickerEmpty: 'The library is empty. Create one in Settings → Prompts.',
      export: 'Export',
      import: 'Import',
      exported: 'Exported {count} prompt(s)',
      importTotal: '{count} in file',
      importDedup: 'Merged {count} duplicate id(s) in file',
      modeMerge: 'Merge (keep local)',
      modeReplace: 'Replace (clear local)',
      importMergePlan: 'Adds {added}, overwrites {overwritten} with the same id; other local prompts stay.',
      importReplacePlan: 'Replaces all {removed} local prompt(s) with the {count} from the file; unexported local prompts are lost.',
      confirmImport: 'Import',
      confirmReplace: 'Click again to confirm replace',
      importDone: 'Import done: {added} added, {overwritten} overwritten',
      importDoneReplace: 'Replace done: {count} prompt(s) now',
      errRead: 'Could not read the file; try again',
      errNotJson: 'The file is not valid JSON; nothing changed',
      errShape: 'The file is neither a prompt array nor an export of this plugin; nothing changed',
      errFormat: 'Not an export of this plugin (format mismatch); nothing changed',
      errVersion: 'The file uses format version {version}; this plugin supports version 1 only; nothing changed',
      errItems: 'The export has no items array; nothing changed',
      errItem: 'Entry {index} is invalid',
      errItemContent: 'missing content (empty or not text)',
      errItemObject: 'not an object',
      errWrite: 'Could not write browser storage (quota or disabled); rolled back, nothing changed',
      folderHint: 'Right-click: open this session working directory in the file manager',
      openedFolder: 'Opened the working directory in the file manager',
      errNoDirectory: 'This session has no working directory',
      errOpenFolder: 'Could not open it: no file manager on the host, or it refused the path',
    };

    /* ------------------------------------------------------------------ */
    /* 存储                                                                */
    /* ------------------------------------------------------------------ */

    const listeners = new Set();
    let cache = null;

    function newId() {
      return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    /** 读存储的容错：逐条走导入同一套规范化，坏条目丢弃。 */
    function sanitize(value) {
      if (!Array.isArray(value)) return [];
      const out = [];
      for (const item of value) {
        const result = normalizeImportItem(item, Date.now());
        if (result.ok === true) out.push(result.value);
      }
      return out;
    }

    function read() {
      if (cache !== null) return cache;
      let raw = null;
      try {
        raw = window.localStorage.getItem(STORAGE_KEY);
      } catch (error) {
        raw = null;
      }
      let parsed = null;
      if (raw !== null) {
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          parsed = null;
        }
      }
      cache = sanitize(parsed);
      return cache;
    }

    function notify() {
      for (const listener of Array.from(listeners)) {
        try {
          listener();
        } catch (error) {
          /* one bad subscriber must not block the rest */
        }
      }
    }

    /** 真正落盘；失败按存储重读并返回 false，调用方必须报错，不得谎报成功。 */
    function write(next) {
      const persisted = persistList(browserStorage(), STORAGE_KEY, next);
      if (persisted.ok !== true) {
        reloadFromStorage();
        return false;
      }
      cache = next;
      notify();
      return true;
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }

    function reloadFromStorage() {
      cache = null;
      notify();
    }

    function usePrompts() {
      const [, bump] = React.useState(0);
      React.useEffect(
        () => subscribe(() => bump((value) => value + 1)),
        [],
      );
      return read();
    }

    function upsert(record) {
      const list = read();
      const next = list.slice();
      const index = next.findIndex((item) => item.id === record.id);
      const value = {
        id: record.id,
        title: record.title,
        content: record.content,
        tags: record.tags,
        favorite: index >= 0 ? next[index].favorite : false,
        updatedAt: Date.now(),
      };
      if (index >= 0) next[index] = value;
      else next.unshift(value);
      return write(next);
    }

    function removePrompt(id) {
      return write(read().filter((item) => item.id !== id));
    }

    function toggleFavorite(id) {
      return write(
        read().map((item) =>
          item.id === id ? { ...item, favorite: item.favorite !== true } : item,
        ),
      );
    }

    function ordered(list) {
      return list.slice().sort((left, right) => {
        const pinned = (right.favorite === true ? 1 : 0) - (left.favorite === true ? 1 : 0);
        if (pinned !== 0) return pinned;
        return right.updatedAt - left.updatedAt;
      });
    }

    function matches(prompt, query) {
      const needle = query.trim().toLowerCase();
      if (needle === '') return true;
      if (prompt.title.toLowerCase().includes(needle)) return true;
      if (prompt.content.toLowerCase().includes(needle)) return true;
      return prompt.tags.some((tag) => tag.toLowerCase().includes(needle));
    }

    /* ------------------------------------------------------------------ */
    /* 数据导出 / 导入：纯逻辑，不碰 DOM，可单测                            */
    /* ------------------------------------------------------------------ */

    /* ===== data-layer:begin ===== */
    const EXPORT_FORMAT = 'dsh.prompt-manager.export';
    const EXPORT_VERSION = 1;
    const PLUGIN_PACKAGE = '@local/prompt-manager';
    const PLUGIN_RELEASE = '1.2.0'; /* 与 package.json 的 version 同步 */

    /** 导出信封；list 必须已是规范化后的提示词数组。 */
    function buildExportDocument(list, now) {
      return {
        format: EXPORT_FORMAT,
        formatVersion: EXPORT_VERSION,
        exportedAt: new Date(now).toISOString(),
        plugin: { name: PLUGIN_PACKAGE, version: PLUGIN_RELEASE },
        count: list.length,
        items: list.map(function (prompt) {
          return {
            id: prompt.id,
            title: prompt.title,
            content: prompt.content,
            tags: prompt.tags.slice(),
            favorite: prompt.favorite === true,
            updatedAt: prompt.updatedAt,
          };
        }),
      };
    }

    /**
     * 单条校验：content 缺失/空 → 无效（调用方整体拒绝）；
     * 其余字段按既有 sanitize 语义容错补齐，不改字段含义。
     */
    function normalizeImportItem(raw, now) {
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        return { ok: false, reason: 'notObject' };
      }
      if (typeof raw.content !== 'string' || raw.content.trim() === '') {
        return { ok: false, reason: 'content' };
      }
      return {
        ok: true,
        value: {
          id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : newId(),
          title: typeof raw.title === 'string' ? raw.title.slice(0, 120) : '',
          content: raw.content,
          tags: Array.isArray(raw.tags)
            ? raw.tags.filter(function (tag) {
                return typeof tag === 'string' && tag.trim() !== '';
              })
            : [],
          favorite: raw.favorite === true,
          updatedAt:
            typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
              ? raw.updatedAt
              : now,
        },
      };
    }

    /**
     * 解析导入文本。成功返回 { ok:true, items, duplicates }，
     * 失败返回 { ok:false, code, index?, reason?, version? }。
     * 任一条无效即整体失败（调用方不写任何数据）。
     */
    function parseImportText(text, now) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        return { ok: false, code: 'notJson' };
      }

      let items;
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed !== null && typeof parsed === 'object') {
        if (parsed.format !== undefined && parsed.format !== EXPORT_FORMAT) {
          return { ok: false, code: 'format' };
        }
        if (parsed.formatVersion !== undefined && parsed.formatVersion !== EXPORT_VERSION) {
          return { ok: false, code: 'version', version: parsed.formatVersion };
        }
        if (!Array.isArray(parsed.items)) return { ok: false, code: 'items' };
        items = parsed.items;
      } else {
        return { ok: false, code: 'shape' };
      }

      const normalized = [];
      for (let index = 0; index < items.length; index += 1) {
        const result = normalizeImportItem(items[index], now);
        if (result.ok !== true) {
          return { ok: false, code: 'item', index, reason: result.reason };
        }
        normalized.push(result.value);
      }

      const byId = new Map();
      for (const item of normalized) byId.set(item.id, item);
      return {
        ok: true,
        items: Array.from(byId.values()),
        duplicates: normalized.length - byId.size,
      };
    }

    /**
     * 计算落盘结果。merge：本机顺序不变，同 id 用文件条目整体覆盖，
     * 新条目按文件顺序置顶。replace：文件条目即全部内容。
     */
    function planImport(current, incoming, mode) {
      const incomingById = new Map();
      for (const item of incoming) incomingById.set(item.id, item);

      if (mode === 'replace') {
        const next = Array.from(incomingById.values());
        return { next, added: next.length, overwritten: 0, removed: current.length };
      }

      const next = current.map(function (prompt) {
        return incomingById.has(prompt.id) ? incomingById.get(prompt.id) : prompt;
      });
      const existing = new Set(
        current.map(function (prompt) {
          return prompt.id;
        }),
      );
      const fresh = [];
      for (const item of incoming) {
        if (existing.has(item.id) === false) fresh.push(item);
      }
      return {
        next: fresh.concat(next),
        added: fresh.length,
        overwritten: incoming.length - fresh.length,
        removed: 0,
      };
    }

    /** 写入并保证可回滚：写失败时把原值写回，调用方据此保持内存态一致。 */
    function persistList(storage, key, next) {
      const previous = storage.read(key);
      let text;
      try {
        text = JSON.stringify(next);
      } catch (error) {
        return { ok: false, code: 'encode' };
      }
      try {
        storage.write(key, text);
      } catch (error) {
        try {
          if (previous === null) storage.remove(key);
          else storage.write(key, previous);
        } catch (rollbackError) {
          /* 回滚是尽力而为：内存态由调用方按存储重读恢复 */
        }
        return { ok: false, code: 'write', message: String((error && error.message) || error) };
      }
      return { ok: true };
    }
    /* ===== data-layer:end ===== */

    /** 浏览器存储适配器（单测用内存实现替身）。 */
    function browserStorage() {
      return {
        read(key) {
          try {
            return window.localStorage.getItem(key);
          } catch (error) {
            return null;
          }
        },
        write(key, text) {
          window.localStorage.setItem(key, text);
        },
        remove(key) {
          window.localStorage.removeItem(key);
        },
      };
    }

    /** 真正落盘；失败时回滚内存缓存并让 UI 按存储重读。 */
    function applyImport(mode, items) {
      const plan = planImport(read(), items, mode);
      const persisted = persistList(browserStorage(), STORAGE_KEY, plan.next);
      if (persisted.ok !== true) {
        reloadFromStorage();
        return { ok: false, code: persisted.code, message: persisted.message, plan };
      }
      cache = plan.next;
      notify();
      return { ok: true, plan };
    }

    function fileStamp(date) {
      const pad = (value) => (value < 10 ? '0' + value : String(value));
      return (
        String(date.getFullYear()) +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        '-' +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
      );
    }

    function downloadText(fileName, text) {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }

    /** 把解析失败码翻成一句人话（导入面板/提示共用）。 */
    function describeImportFailure(t, failure) {
      if (failure.code === 'item') {
        const reason =
          failure.reason === 'content' ? t('errItemContent') : t('errItemObject');
        return t('errItem', { index: failure.index + 1 }) + ' · ' + reason;
      }
      if (failure.code === 'version') {
        return t('errVersion', { version: String(failure.version) });
      }
      const byCode = {
        notJson: 'errNotJson',
        shape: 'errShape',
        format: 'errFormat',
        items: 'errItems',
      };
      return t(byCode[failure.code] || 'errShape');
    }

    /* ------------------------------------------------------------------ */
    /* 在文件管理器里打开会话工作目录                                      */
    /* ------------------------------------------------------------------ */

    /* 宿主 dsh-host-open-in-app 的目录打开路由；切片去掉前导斜杠，
       与发行版一致地按「相对当前文档」请求，桌面端换承载也不受影响。 */
    const OPEN_IN_APP_APPS_PATH = '/open-in-app/apps';
    const OPEN_IN_APP_APPS_ROUTE = OPEN_IN_APP_APPS_PATH.slice(1);
    const OPEN_IN_APP_OPEN_PATH = '/open-in-app/open';
    const OPEN_IN_APP_OPEN_ROUTE = OPEN_IN_APP_OPEN_PATH.slice(1);
    /* 目录应用里的各平台文件管理器；顺序即优先级。 */
    const FILE_MANAGER_APPS = ['explorer', 'finder', 'filemanager'];

    /** 会话工作目录：读客户端会话摘要的 cwd（与 ui-open-in-app 同一数据源）。 */
    function readSessionDirectory(ctx, sessionId) {
      if (typeof sessionId !== 'string' || sessionId === '') return '';
      try {
        const row = ctx.get('sessions')?.list?.getSnapshot?.()?.byId?.[sessionId];
        return typeof row?.cwd === 'string' ? row.cwd.trim() : '';
      } catch (error) {
        return '';
      }
    }

    /** 用宿主的目录打开路由在文件管理器里打开该目录。 */
    async function openInFileManager(path) {
      let apps = [];
      try {
        const response = await fetch(OPEN_IN_APP_APPS_ROUTE, {
          headers: { accept: 'application/json' },
        });
        if (response.ok === true) {
          const payload = await response.json();
          if (Array.isArray(payload?.apps)) {
            apps = payload.apps.filter((id) => typeof id === 'string');
          }
        }
      } catch (error) {
        /* 目录应用不可用：下面统一报错，不暴露细节 */
      }
      const app = FILE_MANAGER_APPS.find((id) => apps.includes(id));
      if (app === undefined) return { code: 'unavailable' };
      try {
        const response = await fetch(OPEN_IN_APP_OPEN_ROUTE, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ app, path }),
        });
        return response.ok === true ? { code: 'opened' } : { code: 'refused' };
      } catch (error) {
        return { code: 'refused' };
      }
    }

    /* ------------------------------------------------------------------ */
    /* 小工具                                                              */
    /* ------------------------------------------------------------------ */

    function preview(text) {
      const flat = text.replace(/\s+/g, ' ').trim();
      return flat.length > 240 ? flat.slice(0, 240) + '…' : flat;
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        /* fall through to the legacy path */
      }
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok === true;
      } catch (error) {
        return false;
      }
    }

    function useNotice() {
      const [notice, setNotice] = React.useState('');
      React.useEffect(() => {
        if (notice === '') return undefined;
        const timer = window.setTimeout(() => setNotice(''), 2400);
        return () => window.clearTimeout(timer);
      }, [notice]);
      return [notice, setNotice];
    }

    function insertIntoDraft(inputActions, text) {
      if (inputActions === undefined || inputActions === null) return false;
      try {
        const first = inputActions.captureInsertion();
        if (inputActions.insertText(text, first) === true) return true;
        const second = inputActions.captureInsertion();
        return inputActions.insertText(text, second) === true;
      } catch (error) {
        return false;
      }
    }

    /* ------------------------------------------------------------------ */
    /* 设置页                                                              */
    /* ------------------------------------------------------------------ */

    function PromptEditor({ t, draft, onSave, onCancel }) {
      const [title, setTitle] = React.useState(draft.title);
      const [content, setContent] = React.useState(draft.content);
      const [tags, setTags] = React.useState(draft.tags);
      const [error, setError] = React.useState('');

      const submit = (event) => {
        event.preventDefault();
        const nextTitle = title.trim();
        const nextContent = content.replace(/\r\n/g, '\n');
        if (nextTitle === '') {
          setError(t('titleRequired'));
          return;
        }
        if (nextContent.trim() === '') {
          setError(t('contentRequired'));
          return;
        }
        setError('');
        onSave({
          id: draft.id,
          title: nextTitle,
          content: nextContent,
          tags: tags
            .split(/[,，]/)
            .map((tag) => tag.trim())
            .filter((tag) => tag !== ''),
        });
      };

      return h(
        'form',
        { className: 'dspm-editor', onSubmit: submit },
        h('input', {
          className: 'dspm-input',
          type: 'text',
          value: title,
          autoFocus: true,
          placeholder: t('titlePlaceholder'),
          onChange: (event) => setTitle(event.target.value),
        }),
        h('textarea', {
          className: 'dspm-textarea',
          value: content,
          placeholder: t('contentPlaceholder'),
          onChange: (event) => setContent(event.target.value),
        }),
        h('input', {
          className: 'dspm-input',
          type: 'text',
          value: tags,
          placeholder: t('tagsPlaceholder'),
          onChange: (event) => setTags(event.target.value),
        }),
        error === '' ? null : h('div', { className: 'dspm-error' }, error),
        h(
          'div',
          { className: 'dspm-editorActions' },
          h(
            'button',
            { className: 'dspm-btn', type: 'button', onClick: onCancel },
            t('cancel'),
          ),
          h(
            'button',
            { className: 'dspm-btn dspm-btnPrimary', type: 'submit' },
            t('save'),
          ),
        ),
      );
    }

    function PromptSettingsPage(props) {
      const t = props.t;
      const prompts = usePrompts();
      const [query, setQuery] = React.useState('');
      const [draft, setDraft] = React.useState(null);
      const [confirmId, setConfirmId] = React.useState('');
      const [notice, setNotice] = useNotice();
      const fileRef = React.useRef(null);
      const [pending, setPending] = React.useState(null);
      const [armed, setArmed] = React.useState(false);
      const [outcome, setOutcome] = React.useState(null);

      React.useEffect(() => {
        if (confirmId === '') return undefined;
        const timer = window.setTimeout(() => setConfirmId(''), 4000);
        return () => window.clearTimeout(timer);
      }, [confirmId]);

      const visible = ordered(prompts).filter((prompt) => matches(prompt, query));

      const copy = async (prompt) => {
        const ok = await copyText(prompt.content);
        setNotice(ok ? t('copied') : t('copyFailed'));
      };

      const onExport = () => {
        const list = read();
        const payload = buildExportDocument(list, Date.now());
        downloadText(
          'prompt-manager-' + fileStamp(new Date()) + '.json',
          JSON.stringify(payload, null, 2),
        );
        setOutcome({ kind: 'ok', text: t('exported', { count: list.length }) });
      };

      const onFileChosen = async (event) => {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        setArmed(false);
        if (!file) return;
        let text;
        try {
          text = await file.text();
        } catch (error) {
          setPending(null);
          setOutcome({ kind: 'error', text: t('errRead') });
          return;
        }
        const parsed = parseImportText(text, Date.now());
        if (parsed.ok !== true) {
          setPending(null);
          setOutcome({ kind: 'error', text: describeImportFailure(t, parsed) });
          return;
        }
        setOutcome(null);
        setPending({
          fileName: file.name,
          items: parsed.items,
          duplicates: parsed.duplicates,
          mode: 'merge',
        });
      };

      const onConfirmImport = () => {
        if (pending === null) return;
        if (pending.mode === 'replace' && armed !== true) {
          setArmed(true);
          return;
        }
        const result = applyImport(pending.mode, pending.items);
        setArmed(false);
        if (result.ok !== true) {
          setOutcome({ kind: 'error', text: t('errWrite') });
          return;
        }
        setPending(null);
        setOutcome({
          kind: 'ok',
          text:
            pending.mode === 'replace'
              ? t('importDoneReplace', { count: result.plan.next.length })
              : t('importDone', {
                  added: result.plan.added,
                  overwritten: result.plan.overwritten,
                }),
        });
      };

      const importPlan =
        pending === null ? null : planImport(prompts, pending.items, pending.mode);

      const renderOutcome = () =>
        outcome === null
          ? null
          : h(
              'div',
              {
                className:
                  'dspm-outcome ' +
                  (outcome.kind === 'ok' ? 'dspm-outcomeOk' : 'dspm-outcomeError'),
                role: 'status',
              },
              outcome.text,
            );

      const renderImportPanel = () =>
        pending === null || importPlan === null
          ? null
          : h(
              'div',
              { className: 'dspm-import' },
              h(
                'div',
                { className: 'dspm-importHead' },
                h('span', { className: 'dspm-importFile' }, pending.fileName),
                h(
                  'span',
                  { className: 'dspm-count' },
                  t('importTotal', { count: pending.items.length }),
                ),
                pending.duplicates > 0
                  ? h(
                      'span',
                      { className: 'dspm-count' },
                      t('importDedup', { count: pending.duplicates }),
                    )
                  : null,
              ),
              h(
                'div',
                { className: 'dspm-importModes' },
                h(
                  'button',
                  {
                    type: 'button',
                    className:
                      'dspm-mode' + (pending.mode === 'merge' ? ' dspm-modeOn' : ''),
                    'aria-pressed': pending.mode === 'merge',
                    onClick: () => {
                      setPending({ ...pending, mode: 'merge' });
                      setArmed(false);
                    },
                  },
                  t('modeMerge'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className:
                      'dspm-mode' + (pending.mode === 'replace' ? ' dspm-modeOn' : ''),
                    'aria-pressed': pending.mode === 'replace',
                    onClick: () => {
                      setPending({ ...pending, mode: 'replace' });
                      setArmed(false);
                    },
                  },
                  t('modeReplace'),
                ),
              ),
              h(
                'div',
                { className: 'dspm-count' },
                pending.mode === 'replace'
                  ? t('importReplacePlan', {
                      count: importPlan.next.length,
                      removed: prompts.length,
                    })
                  : t('importMergePlan', {
                      added: importPlan.added,
                      overwritten: importPlan.overwritten,
                    }),
              ),
              h(
                'div',
                { className: 'dspm-importActions' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dspm-btn',
                    onClick: () => {
                      setPending(null);
                      setArmed(false);
                    },
                  },
                  t('cancel'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className:
                      'dspm-btn ' +
                      (pending.mode === 'replace' && armed !== true
                        ? 'dspm-btnDanger'
                        : 'dspm-btnPrimary'),
                    onClick: onConfirmImport,
                  },
                  armed === true ? t('confirmReplace') : t('confirmImport'),
                ),
              ),
            );

      return h(
        'div',
        { className: 'dspm-page' },
        h(
          'div',
          { className: 'dspm-head' },
          h('div', { className: 'dspm-heading' }, t('heading')),
          h('div', { className: 'dspm-subtitle' }, t('subtitle')),
        ),
        h(
          'div',
          { className: 'dspm-toolbar' },
          h('input', {
            className: 'dspm-input dspm-search',
            type: 'search',
            value: query,
            placeholder: t('search'),
            onChange: (event) => setQuery(event.target.value),
          }),
          h(
            'button',
            { className: 'dspm-btn', type: 'button', onClick: onExport },
            t('export'),
          ),
          h(
            'button',
            {
              className: 'dspm-btn',
              type: 'button',
              onClick: () => {
                if (fileRef.current !== null) fileRef.current.click();
              },
            },
            t('import'),
          ),
          h('input', {
            ref: fileRef,
            className: 'dspm-fileInput',
            type: 'file',
            accept: '.json,application/json',
            onChange: onFileChosen,
          }),
          h(
            'button',
            {
              className: 'dspm-btn dspm-btnPrimary',
              type: 'button',
              onClick: () => {
                setDraft({ id: '', title: '', content: '', tags: '' });
                setConfirmId('');
              },
            },
            t('create'),
          ),
        ),
        renderOutcome(),
        renderImportPanel(),
        draft === null
          ? null
          : h(PromptEditor, {
              t,
              draft,
              onCancel: () => setDraft(null),
              onSave: (value) => {
                const saved = upsert({
                  id: value.id === '' ? newId() : value.id,
                  title: value.title,
                  content: value.content,
                  tags: value.tags,
                });
                if (saved !== true) {
                  /* 关掉编辑器会丢用户刚敲的内容：留在原地让她重试 */
                  setOutcome({ kind: 'error', text: t('errWrite') });
                  return;
                }
                setDraft(null);
                setOutcome(null);
                setNotice(t('saved'));
              },
            }),
        notice === '' ? null : h('div', { className: 'dspm-inlineNotice' }, notice),
        h('div', { className: 'dspm-count' }, t('count', { count: visible.length })),
        visible.length === 0
          ? h(
              'div',
              { className: 'dspm-empty' },
              prompts.length === 0 ? t('empty') : t('noMatch'),
            )
          : h(
              'ul',
              { className: 'dspm-list' },
              visible.map((prompt) =>
                h(
                  'li',
                  { className: 'dspm-card', key: prompt.id },
                  h(
                    'div',
                    { className: 'dspm-cardHead' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className:
                          'dspm-star' + (prompt.favorite === true ? ' dspm-starOn' : ''),
                        title:
                          prompt.favorite === true ? t('unfavorite') : t('favorite'),
                        'aria-pressed': prompt.favorite === true,
                        onClick: () => {
                          const pinned = toggleFavorite(prompt.id) === true;
                          setOutcome(pinned ? null : { kind: 'error', text: t('errWrite') });
                        },
                      },
                      '★',
                    ),
                    h(
                      'div',
                      { className: 'dspm-cardTitle' },
                      prompt.title === '' ? t('untitled') : prompt.title,
                    ),
                    prompt.tags.map((tag, index) =>
                      h('span', { className: 'dspm-tag', key: tag + index }, tag),
                    ),
                    h(
                      'div',
                      { className: 'dspm-cardActions' },
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dspm-mini',
                          onClick: () => copy(prompt),
                        },
                        t('copy'),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dspm-mini',
                          onClick: () => {
                            setDraft({
                              id: prompt.id,
                              title: prompt.title,
                              content: prompt.content,
                              tags: prompt.tags.join(', '),
                            });
                            setConfirmId('');
                          },
                        },
                        t('edit'),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className:
                            'dspm-mini' +
                            (confirmId === prompt.id ? ' dspm-miniDanger' : ''),
                          onClick: () => {
                            if (confirmId === prompt.id) {
                              if (removePrompt(prompt.id) === true) {
                                setConfirmId('');
                                setOutcome(null);
                              } else setOutcome({ kind: 'error', text: t('errWrite') });
                            } else {
                              setConfirmId(prompt.id);
                            }
                          },
                        },
                        confirmId === prompt.id ? t('confirmRemove') : t('remove'),
                      ),
                    ),
                  ),
                  h('div', { className: 'dspm-cardBody' }, preview(prompt.content)),
                ),
              ),
            ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* 输入框工具行的选择器                                                */
    /* ------------------------------------------------------------------ */

    function BookIcon() {
      return h(
        'svg',
        {
          width: 16,
          height: 16,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          'aria-hidden': true,
        },
        h('path', { d: 'M3 2.5h6.2a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2z' }),
        h('path', { d: 'M11.2 13.5h1.8V5.2a2 2 0 0 0-2-2' }),
        h('path', { d: 'M5.4 5.6h3.4M5.4 8.1h3.4' }),
      );
    }

    function PromptQuick(props) {
      const t = props.t;
      const inputActions = props.inputActions;
      const openFolder = props.openFolder;
      const prompts = usePrompts();
      const [open, setOpen] = React.useState(false);
      const [query, setQuery] = React.useState('');
      const [anchor, setAnchor] = React.useState(null);
      const [notice, setNotice] = useNotice();
      const buttonRef = React.useRef(null);
      const panelRef = React.useRef(null);

      React.useLayoutEffect(() => {
        if (open !== true) return undefined;
        const measure = () => {
          const element = buttonRef.current;
          if (element === null) return;
          const rect = element.getBoundingClientRect();
          const width = 340;
          const left = Math.min(
            Math.max(8, rect.left),
            Math.max(8, window.innerWidth - width - 12),
          );
          setAnchor({ left, bottom: window.innerHeight - rect.top + 8 });
        };
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
          window.removeEventListener('resize', measure);
          window.removeEventListener('scroll', measure, true);
        };
      }, [open]);

      React.useEffect(() => {
        if (open !== true) return undefined;
        const onPointerDown = (event) => {
          const panel = panelRef.current;
          const button = buttonRef.current;
          if (panel !== null && panel.contains(event.target)) return;
          if (button !== null && button.contains(event.target)) return;
          setOpen(false);
        };
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return;
          setOpen(false);
          buttonRef.current?.focus();
        };
        document.addEventListener('mousedown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown, true);
        };
      }, [open]);

      const visible = ordered(prompts).filter((prompt) => matches(prompt, query));

      const usePrompt = (prompt) => {
        const inserted = insertIntoDraft(inputActions, prompt.content);
        setOpen(false);
        buttonRef.current?.focus();
        if (inserted === true) {
          setNotice(t('inserted'));
          return;
        }
        void copyText(prompt.content).then((ok) => {
          setNotice(ok ? t('insertFallback') : t('copyFailed'));
        });
      };

      /* 右键：在文件管理器里打开当前会话的工作目录。 */
      const openCurrentFolder = async () => {
        setOpen(false);
        const result =
          typeof openFolder === 'function'
            ? await openFolder(props.sessionId)
            : { code: 'unavailable' };
        if (result.code === 'opened') setNotice(t('openedFolder'));
        else if (result.code === 'no-directory') setNotice(t('errNoDirectory'));
        else setNotice(t('errOpenFolder'));
      };

      /* 宿主约定：输入框槽里的 fixed 弹层必须 portal 到 document.body。
         否则 composerSeat 的 will-change:transform 成为包含块，视口坐标全错。 */
      const portal = (node) => createPortal(node, document.body);

      const panelStyle =
        anchor === null
          ? { left: 8, bottom: 96 }
          : { left: anchor.left, bottom: anchor.bottom };

      return h(
        React.Fragment,
        null,
        h(
          'button',
          {
            ref: buttonRef,
            type: 'button',
            className: 'dspm-trigger',
            title: t('trigger') + '\n' + t('folderHint'),
            'aria-label': t('trigger'),
            'aria-haspopup': 'dialog',
            'aria-expanded': open === true,
            onClick: () => {
              setQuery('');
              setOpen((value) => value !== true);
            },
            onContextMenu: (event) => {
              event.preventDefault();
              void openCurrentFolder();
            },
          },
          h(BookIcon),
        ),
        open === true
          ? portal(
              h(
                'div',
                {
                  className: 'dspm-pop',
                  style: panelStyle,
                  ref: panelRef,
                  role: 'dialog',
                  'aria-label': t('trigger'),
                },
                h('input', {
                  className: 'dspm-input dspm-popSearch',
                  type: 'search',
                  value: query,
                  autoFocus: true,
                  placeholder: t('search'),
                  onChange: (event) => setQuery(event.target.value),
                }),
                visible.length === 0
                  ? h('div', { className: 'dspm-popEmpty' }, t('pickerEmpty'))
                  : h(
                      'div',
                      { className: 'dspm-popList' },
                      visible.map((prompt) =>
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dspm-popRow',
                            key: prompt.id,
                            onClick: () => usePrompt(prompt),
                          },
                          h(
                            'span',
                            { className: 'dspm-popTitle' },
                            prompt.title === '' ? t('untitled') : prompt.title,
                          ),
                          h('span', { className: 'dspm-popPreview' }, preview(prompt.content)),
                        ),
                      ),
                    ),
              ),
          )
          : null,
        notice === ''
          ? null
          : portal(h('div', { className: 'dspm-toast', style: panelStyle }, notice)),
      );
    }

    /* ------------------------------------------------------------------ */
    /* 样式（只用主题 token）                                              */
    /* ------------------------------------------------------------------ */

    const CSS = `
.dspm-page{display:flex;flex-direction:column;gap:12px;padding-top:8px;color:var(--dsw-alias-label-primary);}
.dspm-heading{font-size:16px;font-weight:500;line-height:24px;}
.dspm-subtitle{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;margin-top:4px;}
.dspm-toolbar{display:flex;align-items:center;gap:8px;}
.dspm-fileInput{display:none;}
.dspm-outcome{font-size:12px;line-height:18px;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);}
.dspm-outcomeOk{color:var(--dsw-alias-state-success-primary);}
.dspm-outcomeError{color:var(--dsw-alias-state-error-primary);}
.dspm-import{display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);}
.dspm-importHead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.dspm-importFile{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;line-height:18px;overflow-wrap:anywhere;}
.dspm-importModes{display:flex;gap:6px;}
.dspm-mode{box-sizing:border-box;height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:12px;line-height:16px;cursor:pointer;}
.dspm-modeOn{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);}
.dspm-importActions{display:flex;justify-content:flex-end;gap:8px;}
.dspm-btnDanger{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);}
.dspm-input{box-sizing:border-box;width:100%;height:32px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:14px;line-height:20px;outline:none;}
.dspm-input::placeholder{color:var(--dsw-alias-label-secondary);}
.dspm-input:focus{border-color:var(--dsw-alias-brand-primary);}
.dspm-search{flex:1;min-width:0;}
.dspm-textarea{box-sizing:border-box;width:100%;min-height:148px;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:13px;line-height:20px;resize:vertical;outline:none;}
.dspm-textarea:focus{border-color:var(--dsw-alias-brand-primary);}
.dspm-btn{box-sizing:border-box;height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:20px;cursor:pointer;flex:none;}
.dspm-btn:hover{background:var(--dsw-alias-bg-layer-2);}
.dspm-btnPrimary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);}
.dspm-btnPrimary:hover{background:var(--dsw-alias-brand-primary);opacity:.9;}
.dspm-mini{box-sizing:border-box;height:24px;padding:0 8px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:12px;line-height:16px;cursor:pointer;flex:none;}
.dspm-mini:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.dspm-miniDanger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);}
.dspm-count{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;}
.dspm-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.dspm-card{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;background:var(--dsw-alias-bg-layer-1);}
.dspm-cardHead{display:flex;align-items:center;gap:8px;}
.dspm-star{border:none;background:transparent;padding:0;font-size:14px;line-height:16px;cursor:pointer;color:var(--dsw-alias-label-secondary);flex:none;}
.dspm-starOn{color:var(--dsw-alias-brand-primary);}
.dspm-cardTitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px;}
.dspm-tag{flex:none;padding:0 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;}
.dspm-cardActions{display:flex;align-items:center;gap:2px;flex:none;}
.dspm-cardBody{margin-top:6px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:pre-wrap;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.dspm-empty{padding:24px 0;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;}
.dspm-editor{display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);}
.dspm-editorActions{display:flex;justify-content:flex-end;gap:8px;}
.dspm-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:16px;}
.dspm-inlineNotice{color:var(--dsw-alias-state-success-primary);font-size:12px;line-height:16px;}
.dspm-trigger{box-sizing:border-box;width:28px;height:28px;padding:0;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none;}
.dspm-trigger:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.dspm-trigger[aria-expanded="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.dspm-pop{position:fixed;z-index:1200;width:340px;max-width:calc(100vw - 24px);max-height:360px;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);box-shadow:var(--dsw-elevation-prominent,0 8px 28px rgba(0,0,0,.18));}
.dspm-popSearch{height:30px;font-size:13px;}
.dspm-popList{display:flex;flex-direction:column;gap:2px;overflow-y:auto;min-height:0;}
.dspm-popRow{display:flex;flex-direction:column;gap:2px;padding:8px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;text-align:left;cursor:pointer;}
.dspm-popRow:hover{background:var(--dsw-alias-bg-layer-2);}
.dspm-popTitle{font-size:13px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dspm-popPreview{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dspm-popEmpty{padding:12px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;}
.dspm-toast{position:fixed;z-index:1201;padding:4px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);font-size:12px;line-height:16px;box-shadow:var(--dsw-elevation-prominent,0 8px 28px rgba(0,0,0,.18));}
`;

    /* ------------------------------------------------------------------ */
    /* 装配                                                                */
    /* ------------------------------------------------------------------ */

    const inject = ['slots', 'locale'];

    function apply(ctx) {
      const t = ctx.locale.bind(NS);

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'prompt-manager: dictionaries');

      ctx.effect(() => {
        const existing = document.getElementById(STYLE_ID);
        if (existing !== null) existing.remove();
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.dataset.plugin = '@local/prompt-manager';
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => {
          style.remove();
        };
      }, 'prompt-manager: styles');

      ctx.effect(
        () => {
          const onStorage = (event) => {
            if (event.key === null || event.key === STORAGE_KEY) reloadFromStorage();
          };
          window.addEventListener('storage', onStorage);
          return () => window.removeEventListener('storage', onStorage);
        },
        'prompt-manager: cross-tab sync',
      );

      /* 右键书本按钮：把当前会话的工作目录交给宿主的目录打开路由。 */
      const openFolder = async (sessionId) => {
        const directory = readSessionDirectory(ctx, sessionId);
        if (directory === '') return { code: 'no-directory' };
        return openInFileManager(directory);
      };

      ctx.slots.inject('settings.section', () =>
        ctx.slots.register(
          {
            name: 'settings.section',
            id: 'prompt-manager',
            order: 25,
            label: () => t('nav'),
            locale: NS,
          },
          PromptSettingsPage,
        ),
      );

      ctx.slots.inject('conversation.input.left', () =>
        ctx.slots.register(
          {
            name: 'conversation.input.left',
            id: 'prompt-manager',
            order: 20,
            locale: NS,
            inject: () => ({ openFolder }),
          },
          PromptQuick,
        ),
      );
    }

    return { apply, inject };
  },
});
