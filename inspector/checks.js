// checks.js — Inspector 巡检脚本 v1
// 纯确定性，不调 LLM。Karpathy: "The eval function is sacred."
// 用法: node checks.js [--json]  默认输出JSON到stdout + 追加log.jsonl

var fs = require('fs');
var path = require('path');
var os = require('os');
var child_process = require('child_process');

var AGENTBOARD_HOME = path.join(os.homedir(), '.agentboard');
var SCHEDULER_HOME = path.join(os.homedir(), '.scheduler');
var GOLDEN_PATH = path.join(__dirname, 'golden-checks.json');
var LOG_PATH = path.join(__dirname, '_runtime', 'inspection-log.jsonl');
var ESCALATION_PATH = path.join(__dirname, '_runtime', 'escalation-queue.json');

// ── 加载检查项定义 ──
var golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));

// ── 检查 1: Manifest Schema ──
function checkManifestSchema() {
  var manifestSchema;
  try { manifestSchema = require(path.join(AGENTBOARD_HOME, 'lib', 'manifest-schema.js')); }
  catch (e) { return { pass: false, detail: '无法加载 manifest-schema.js: ' + e.message }; }
  var r = manifestSchema.auditAll();
  if (r.errors === 0) return { pass: true, detail: r.total + ' 个工具全部通过' };
  var fails = r.issues.slice(0, 5).map(function(i) { return i.id + ': ' + i.errors[0]; }).join('; ');
  return { pass: false, detail: r.errors + ' 个错误, ' + r.warnings + ' 个警告. 前5: ' + fails };
}

// ── 检查 2: 运行时漂移 ──
function checkRuntimeDrift() {
  var manifestSchema;
  try { manifestSchema = require(path.join(AGENTBOARD_HOME, 'lib', 'manifest-schema.js')); }
  catch (e) { return { pass: false, detail: '无法加载 manifest-schema.js: ' + e.message }; }

  var ports = new Set();
  try {
    var out = child_process.execSync('netstat -ano', { timeout: 5000, encoding: 'utf8', windowsHide: true });
    var re = /\s+TCP\s+\S+:(\d+)\s+.*LISTENING/gi;
    var m;
    while ((m = re.exec(out)) !== null) { ports.add(parseInt(m[1], 10)); }
  } catch (_) { return { pass: false, detail: 'netstat 执行失败' }; }

  var r = manifestSchema.auditRuntime(null, ports);
  if (r.errors === 0 && r.warnings === 0) return { pass: true, detail: r.total + ' 个工具无漂移' };
  var drift = r.issues.slice(0, 5).map(function(i) { return i.id + ': ' + (i.errors[0] || i.warnings[0]); }).join('; ');
  return { pass: r.errors === 0, detail: r.errors + ' 错误 ' + r.warnings + ' 警告. ' + drift };
}

// ── 检查 3: Cron 今日触发 ──
function checkCronTriggered() {
  var statePath = path.join(SCHEDULER_HOME, 'scheduler-state.json');
  if (!fs.existsSync(statePath)) return { pass: false, detail: 'scheduler-state.json 不存在' };
  var state;
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (e) { return { pass: false, detail: 'scheduler-state.json 解析失败' }; }
  var tasks = state.tasks || state;
  var today = new Date().toISOString().slice(0, 10);
  var missed = [];
  var total = 0;
  var triggered = 0;
  Object.keys(tasks).forEach(function(id) {
    var t = tasks[id];
    total++;
    if (t.lastRun && t.lastRun.slice(0, 10) === today) triggered++;
    else missed.push(t.id || id);
  });
  if (missed.length === 0) return { pass: true, detail: triggered + '/' + total + ' 任务今日已触发' };
  return { pass: false, detail: missed.length + '/' + total + ' 未触发: ' + missed.join(', ') };
}

// ── 检查 4: Cron 产出非空 ──
function checkCronOutput() {
  var statePath = path.join(SCHEDULER_HOME, 'scheduler-state.json');
  if (!fs.existsSync(statePath)) return { pass: false, detail: 'scheduler-state.json 不存在' };
  var state;
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (e) { return { pass: false, detail: '解析失败' }; }
  var tasks = state.tasks || state;
  var empty = [];
  Object.keys(tasks).forEach(function(id) {
    var t = tasks[id];
    if (t.lastStatus === 'success' && !t.lastOutput) empty.push(t.id || id);
  });
  if (empty.length === 0) return { pass: true, detail: '无空产出' };
  return { pass: false, detail: empty.length + ' 个成功任务无产出: ' + empty.join(', ') };
}

// ── 检查 5: 备份完成 ──
function checkBackup() {
  var logPath = path.join(SCHEDULER_HOME, 'backup.log');
  if (!fs.existsSync(logPath)) return { pass: false, detail: 'backup.log 不存在' };
  var log = fs.readFileSync(logPath, 'utf8');
  var lines = log.trim().split('\n');
  var last = lines[lines.length - 1] || '';
  var today = new Date().toISOString().slice(0, 10);
  if (last.indexOf(today) >= 0 && /success|ok|完成/i.test(last)) return { pass: true, detail: '今日备份成功' };
  return { pass: false, detail: '最近备份行: ' + last.slice(0, 120) };
}

// ── 检查 6: 磁盘空间 ──
function checkDisk() {
  var drives = ['C:', 'D:', 'F:'];
  var low = [];
  var detail = [];
  drives.forEach(function(d) {
    try {
      var out = child_process.execSync('wmic logicaldisk where "DeviceID=\'' + d + '\'" get FreeSpace,Size /format:csv', { timeout: 5000, encoding: 'utf8', windowsHide: true });
      var lines = out.trim().split('\n');
      if (lines.length < 2) { detail.push(d + ': 不可读'); return; }
      var vals = lines[1].split(',');
      var freeGB = Math.round(parseInt(vals[vals.length - 2], 10) / 1073741824);
      detail.push(d + ': ' + freeGB + 'GB free');
      if (freeGB < 10) low.push(d);
    } catch (_) { detail.push(d + ': 查询失败'); }
  });
  if (low.length === 0) return { pass: true, detail: detail.join(', ') };
  return { pass: false, detail: '空间不足: ' + low.join(', ') + '. ' + detail.join(', ') };
}

// ── 运行 ──
var runnerMap = {
  manifest_schema: checkManifestSchema,
  runtime_drift: checkRuntimeDrift,
  cron_triggered: checkCronTriggered,
  cron_output: checkCronOutput,
  backup_complete: checkBackup,
  disk_usage: checkDisk
};

var timestamp = new Date().toISOString();
var results = { timestamp: timestamp, version: golden.version, ok: true, checks: [] };

golden.checks.forEach(function(c) {
  var fn = runnerMap[c.id];
  var r;
  if (!fn) {
    r = { pass: false, detail: '无检查实现: ' + c.id };
  } else {
    try { r = fn(); } catch (e) { r = { pass: false, detail: e.message }; }
  }
  var entry = { id: c.id, label: c.label, severity: c.severity, pass: r.pass, detail: r.detail };
  results.checks.push(entry);
  if (!r.pass && c.severity === 'error') results.ok = false;
});

// ── 输出 ──
console.log(JSON.stringify(results, null, 2));

// ── 追加日志 ──
var logDir = path.dirname(LOG_PATH);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
fs.appendFileSync(LOG_PATH, JSON.stringify(results) + '\n', 'utf8');

// ── 处理呈报队列 ──
if (results.ok) {
  // 全过，清理呈报
  fs.writeFileSync(ESCALATION_PATH, '[]', 'utf8');
} else {
  // 有错误，追加呈报
  var failed = results.checks.filter(function(c) { return !c.pass; });
  var esc = [];
  try { esc = JSON.parse(fs.readFileSync(ESCALATION_PATH, 'utf8')); } catch (_) {}
  esc.push({ timestamp: timestamp, failed: failed });
  fs.writeFileSync(ESCALATION_PATH, JSON.stringify(esc, null, 2), 'utf8');
}
