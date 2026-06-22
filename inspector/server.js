// server.js — Inspector HTTP 服务 :3101
// 最小 Express，3 条路由。Karpathy: "A dashboard is not an eval."

var express = require('express');
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

var INSPECTOR_DIR = __dirname;
var LOG_PATH = path.join(INSPECTOR_DIR, '_runtime', 'inspection-log.jsonl');
var ESCALATION_PATH = path.join(INSPECTOR_DIR, '_runtime', 'escalation-queue.json');
var GOLDEN_PATH = path.join(INSPECTOR_DIR, 'golden-checks.json');

var app = express();
app.use(express.json());

// ── 面板 ──
app.get('/', function(req, res) {
  var html = fs.readFileSync(path.join(INSPECTOR_DIR, 'panel.html'), 'utf8');
  // 注入初始数据
  var data = getLatestData();
  html = html.replace('<!--INSPECTOR_DATA-->', '<script>window.__inspector=' + JSON.stringify(data) + '</script>');
  res.type('html').send(html);
});

// ── API: 当前状态 ──
app.get('/api/state', function(req, res) {
  res.json(getLatestData());
});

// ── 触发巡检 ──
app.post('/api/run', function(req, res) {
  try {
    var out = child_process.execSync('node "' + path.join(INSPECTOR_DIR, 'checks.js') + '"', {
      timeout: 30000, encoding: 'utf8', windowsHide: true, cwd: INSPECTOR_DIR
    });
    var result = JSON.parse(out.trim().split('\n').pop());
    res.json({ ok: true, result: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

function getLatestData() {
  var golden = {};
  try { golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8')); } catch (_) {}

  var logs = [];
  try {
    var raw = fs.readFileSync(LOG_PATH, 'utf8').trim();
    if (raw) logs = raw.split('\n').map(function(l) { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
  } catch (_) {}

  var latest = logs.length > 0 ? logs[logs.length - 1] : null;

  var escalation = [];
  try { escalation = JSON.parse(fs.readFileSync(ESCALATION_PATH, 'utf8')); } catch (_) {}

  return {
    golden: golden,
    latest: latest,
    history: logs.slice(-20),
    escalation: escalation,
    healthy: latest ? latest.ok : null
  };
}

var PORT = process.env.PORT || 3101;
app.listen(PORT, function() {
  console.log('[inspector] http://localhost:' + PORT);
});
