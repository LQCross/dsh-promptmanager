// 自检：抽取 client.js 的 data-layer 块，用内存存储验证导出/导入逻辑。
// 运行：node D:\CODEENV\dsh-plugins\prompt-manager\selftest.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, 'client.js'), 'utf8');

const begin = source.indexOf('/* ===== data-layer:begin ===== */');
const end = source.indexOf('/* ===== data-layer:end ===== */');
assert.ok(begin > 0 && end > begin, 'data-layer markers missing');

const block = source.slice(begin, end);
const shim = `
let seq = 0;
function newId() { seq += 1; return 'gen' + seq; }
${block}
return { buildExportDocument, normalizeImportItem, parseImportText, planImport, persistList, EXPORT_FORMAT, EXPORT_VERSION };
`;
const api = new Function(shim)();

const NOW = 1762500000000;
let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log('ok -', name);
}

const sample = [
  { id: 'a', title: 'A', content: 'alpha', tags: ['x'], favorite: true, updatedAt: 1 },
  { id: 'b', title: 'B', content: 'beta', tags: [], favorite: false, updatedAt: 2 },
];

check('导出信封字段齐全且顺序稳定', () => {
  const doc = api.buildExportDocument(sample, NOW);
  assert.equal(doc.format, 'dsh.prompt-manager.export');
  assert.equal(doc.formatVersion, 1);
  assert.equal(doc.count, 2);
  assert.equal(doc.plugin.name, '@local/prompt-manager');
  assert.deepEqual(Object.keys(doc.items[0]).sort(), [
    'content', 'favorite', 'id', 'tags', 'title', 'updatedAt',
  ]);
  assert.equal(doc.exportedAt, new Date(NOW).toISOString());
});

check('导出→导入完整往返，字段逐字节一致', () => {
  const text = JSON.stringify(api.buildExportDocument(sample, NOW));
  const parsed = api.parseImportText(text, NOW);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.duplicates, 0);
  assert.deepEqual(parsed.items, sample);
});

check('裸数组也接受', () => {
  const parsed = api.parseImportText(JSON.stringify(sample), NOW);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.items, sample);
});

check('合并：新增置顶、同 id 用文件覆盖、本机其它保留', () => {
  const local = [
    { id: 'a', title: 'local A', content: 'old', tags: [], favorite: false, updatedAt: 1 },
    { id: 'z', title: 'Z', content: 'keep', tags: [], favorite: false, updatedAt: 9 },
  ];
  const incoming = [
    { id: 'a', title: 'file A', content: 'new', tags: ['t'], favorite: true, updatedAt: 5 },
    { id: 'c', title: 'C', content: 'gamma', tags: [], favorite: false, updatedAt: 6 },
  ];
  const plan = api.planImport(local, incoming, 'merge');
  assert.deepEqual(plan.next.map((p) => p.id), ['c', 'a', 'z']);
  assert.equal(plan.next[1].content, 'new');
  assert.equal(plan.added, 1);
  assert.equal(plan.overwritten, 1);
  assert.equal(plan.removed, 0);
});

check('替换：结果等于文件内容，报告移除数', () => {
  const local = [{ id: 'z', title: 'Z', content: 'keep', tags: [], favorite: false, updatedAt: 9 }];
  const plan = api.planImport(local, sample, 'replace');
  assert.deepEqual(plan.next.map((p) => p.id), ['a', 'b']);
  assert.equal(plan.removed, 1);
  assert.equal(plan.added, 2);
});

check('文件内重复 id 只保留最后一条并计数', () => {
  const text = JSON.stringify([
    { id: 'a', content: 'first' },
    { id: 'a', content: 'second' },
  ]);
  const parsed = api.parseImportText(text, NOW);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].content, 'second');
  assert.equal(parsed.duplicates, 1);
});

check('缺失字段按既有语义补齐，不改变含义', () => {
  const parsed = api.parseImportText(JSON.stringify([{ content: 'only' }]), NOW);
  assert.equal(parsed.ok, true);
  const item = parsed.items[0];
  assert.equal(item.title, '');
  assert.deepEqual(item.tags, []);
  assert.equal(item.favorite, false);
  assert.equal(item.updatedAt, NOW);
  assert.match(item.id, /^gen\d+$/);
});

check('title 超长截到 120，tags 非字符串元素丢弃', () => {
  const parsed = api.parseImportText(
    JSON.stringify([{ content: 'c', title: 'x'.repeat(200), tags: ['ok', 5, '', '  '] }]),
    NOW,
  );
  assert.equal(parsed.items[0].title.length, 120);
  assert.deepEqual(parsed.items[0].tags, ['ok']);
});

check('非法 JSON 整体拒绝', () => {
  assert.deepEqual(api.parseImportText('{oops', NOW), { ok: false, code: 'notJson' });
});

check('空 content 整体拒绝并给出行号', () => {
  const text = JSON.stringify([{ id: 'a', content: 'ok' }, { id: 'b', content: '   ' }]);
  const parsed = api.parseImportText(text, NOW);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.code, 'item');
  assert.equal(parsed.index, 1);
  assert.equal(parsed.reason, 'content');
});

check('非对象条目整体拒绝', () => {
  const parsed = api.parseImportText(JSON.stringify(['nope']), NOW);
  assert.equal(parsed.code, 'item');
  assert.equal(parsed.reason, 'notObject');
});

check('format / formatVersion / items 校验', () => {
  assert.equal(api.parseImportText(JSON.stringify({ format: 'other', items: [] }), NOW).code, 'format');
  assert.equal(
    api.parseImportText(JSON.stringify({ format: api.EXPORT_FORMAT, formatVersion: 2, items: [] }), NOW).code,
    'version',
  );
  assert.equal(api.parseImportText(JSON.stringify({ format: api.EXPORT_FORMAT }), NOW).code, 'items');
  assert.equal(api.parseImportText(JSON.stringify(42), NOW).code, 'shape');
});

check('写入成功落盘', () => {
  const store = memoryStore();
  const result = api.persistList(store, 'k', sample);
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(store.read('k')), sample);
});

check('写入失败回滚到原值', () => {
  const store = memoryStore(JSON.stringify(sample));
  store.failOnWrite = true;
  const result = api.persistList(store, 'k', [{ id: 'x', content: 'y' }]);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'write');
  assert.deepEqual(JSON.parse(store.read('k')), sample, '原值必须完整保留');
});

function memoryStore(initial) {
  const map = new Map();
  if (initial !== undefined) map.set('k', initial);
  return {
    failOnWrite: false,
    read(key) { return map.has(key) ? map.get(key) : null; },
    write(key, text) {
      if (this.failOnWrite) throw new Error('QuotaExceededError');
      map.set(key, text);
    },
    remove(key) { map.delete(key); },
  };
}


/* ---- 界面半：写存储失败必须上报，不得谎报「已保存」 ---- */

function loadClient(storage) {
  let captured = null;
  globalThis.window = {
    __ModuleLoader__: { load: (reg) => { captured = reg; } },
    localStorage: storage,
    addEventListener() {},
    removeEventListener() {},
    setTimeout: (fn, ms) => setTimeout(fn, ms ?? 0),
    clearTimeout: (id) => clearTimeout(id),
    innerWidth: 1200,
    innerHeight: 800,
  };
  globalThis.document = {
    body: { appendChild() {}, removeChild() {} },
    head: { appendChild() {} },
    createElement: () => ({ style: {}, dataset: {}, setAttribute() {}, appendChild() {}, remove() {}, click() {} }),
    getElementById: () => null,
    addEventListener() {},
    removeEventListener() {},
  };

  const slots = [];
  let cursor = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    Fragment: 'Fragment',
    useState(init) {
      const at = cursor++;
      if (!(at in slots)) slots[at] = typeof init === 'function' ? init() : init;
      return [slots[at], (value) => {
        slots[at] = typeof value === 'function' ? value(slots[at]) : value;
      }];
    },
    useEffect() {},
    useLayoutEffect() {},
    useRef: (value) => ({ current: value }),
  };
  const require = (spec) => {
    if (spec === 'react') return react;
    if (spec === 'react-dom') {
      return { createPortal: (node, container) => ({ type: 'portal', node, container }) };
    }
    throw new Error('unexpected require ' + spec);
  };

  new Function('window', 'document', source)(globalThis.window, globalThis.document);
  assert.ok(captured !== null, 'client module never registered');

  const registrations = [];
  captured.factory(require).apply({
    effect(fn) { fn(); return () => {}; },
    locale: { bind: (ns) => (key) => key, register: () => () => {} },
    slots: {
      inject(key, fn) { fn(); },
      register(options, component) {
        registrations.push({ options, component });
        return () => {};
      },
    },
    get: () => undefined,
  });

  const page = registrations.find((row) => row.options.name === 'settings.section');
  assert.ok(page !== undefined, 'settings.section not registered');
  return (props) => {
    cursor = 0;
    return page.component(props);
  };
}

function walkTree(node, visit) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((child) => walkTree(child, visit)); return; }
  visit(node);
  (node.children ?? []).forEach((child) => walkTree(child, visit));
  if (node.type === 'portal') walkTree(node.node, visit);
}

check('写存储失败时报错并保留编辑器，成功才关闭', () => {
  const store = {
    map: new Map(),
    failWrite: false,
    getItem(key) { return this.map.has(key) ? this.map.get(key) : null; },
    setItem(key, value) {
      if (this.failWrite) throw new Error('QuotaExceededError');
      this.map.set(key, String(value));
    },
    removeItem(key) { this.map.delete(key); },
  };
  const renderPage = loadClient(store);
  const t = (key) => key;
  const find = (predicate) => {
    let hit = null;
    walkTree(renderPage({ t }), (node) => {
      if (hit === null && predicate(node)) hit = node;
    });
    return hit;
  };
  const outcome = () => {
    const row = find((node) => node.props?.role === 'status');
    return row === null ? null : row.children?.[0] ?? null;
  };
  const editorOpen = () => find((node) => typeof node.props?.onSave === 'function') !== null;
  const onSave = () => {
    const editor = find((node) => typeof node.props?.onSave === 'function');
    assert.ok(editor !== null, 'editor never mounted');
    return editor.props.onSave;
  };

  const create = find((node) => node.type === 'button' && node.children?.[0] === 'create');
  assert.ok(create !== null, 'create button missing');
  create.props.onClick();

  store.failWrite = true;
  onSave()({ id: '', title: 'T', content: 'C', tags: [] });
  assert.equal(outcome(), 'errWrite', '写入失败必须显示 errWrite');
  assert.equal(editorOpen(), true, '写入失败不得关闭编辑器（会丢用户输入）');
  assert.equal(store.map.has('dsh.prompt-manager.v1'), false, '写入失败不得落盘');

  store.failWrite = false;
  onSave()({ id: '', title: 'T', content: 'C', tags: [] });
  assert.equal(editorOpen(), false, '写入成功应关闭编辑器');
  assert.equal(JSON.parse(store.map.get('dsh.prompt-manager.v1'))[0].content, 'C');
});

console.log('\n' + passed + ' checks passed');
