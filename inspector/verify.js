// inspector/verify.js — 交叉验证被审计项目
// 用法: node verify.js [项目路径]
// 默认随机选一个已审计项目。
// 零依赖，Node.js 内置模块。

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WORKSPACE = 'D:\\Claude code_workspace';
const MAX_HEALTH_AGE_HOURS = 48; // health.json 超过此时间视为过期
const MIN_OUTPUT_FILES = 1;      // 产出目录至少要有文件

function findAuditedProjects() {
    const dirs = readdirSync(WORKSPACE, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.match(/^\d{4}-\d{2}-\d{2}-/))
        .map(d => join(WORKSPACE, d.name));

    return dirs.filter(dir => existsSync(join(dir, 'LOOP_AUDIT.md')));
}

function loadHealthJson(projectDir) {
    const path = join(projectDir, 'notebook', 'health.json');
    if (!existsSync(path)) return null;
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
        return null;
    }
}

function checkHealthFreshness(health) {
    if (!health.updated) return { ok: false, reason: 'health.json 缺少 updated 字段' };
    const age = (Date.now() - new Date(health.updated).getTime()) / (1000 * 60 * 60);
    if (age > MAX_HEALTH_AGE_HOURS) {
        return { ok: false, reason: `health.json 已过期 (${age.toFixed(1)}h > ${MAX_HEALTH_AGE_HOURS}h)` };
    }
    return { ok: true, age };
}

function checkOutputFiles(projectDir, health) {
    const dataDir = join(projectDir, 'data');
    if (!existsSync(dataDir)) return { ok: true, note: '无 data/ 目录' };

    const files = readdirSync(dataDir).filter(f => f !== '.gitkeep');
    if (files.length < MIN_OUTPUT_FILES && health.today && health.today.jobs_completed > 0) {
        return { ok: false, reason: `health.json 显示 jobs_completed=${health.today.jobs_completed}，但 data/ 目录为空` };
    }

    // 检查最新文件时间
    let newestAge = null;
    for (const f of files) {
        const age = (Date.now() - statSync(join(dataDir, f)).mtimeMs) / (1000 * 60 * 60);
        if (newestAge === null || age < newestAge) newestAge = age;
    }

    if (newestAge !== null && health.today && health.today.jobs_completed > 0 && newestAge > MAX_HEALTH_AGE_HOURS) {
        return { ok: false, reason: `data/ 最新文件已过期 (${newestAge.toFixed(1)}h)，但 health 显示 jobs_completed=${health.today.jobs_completed}` };
    }

    return { ok: true };
}

function checkAuditAge(projectDir) {
    const auditPath = join(projectDir, 'LOOP_AUDIT.md');
    if (!existsSync(auditPath)) return { ok: false, reason: 'LOOP_AUDIT.md 不存在' };
    const age = (Date.now() - statSync(auditPath).mtimeMs) / (1000 * 60 * 60 * 24);
    if (age > 30) {
        return { ok: false, reason: `LOOP_AUDIT.md 超过 30 天未更新 (${age.toFixed(0)}d)` };
    }
    return { ok: true, age };
}

// --- main ---

const targetDir = process.argv[2];
const projects = findAuditedProjects();

if (projects.length === 0) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'cross-check', detail: { error: '没有找到已审计的项目' } }));
    process.exit(0);
}

const selected = targetDir ? resolve(targetDir) : projects[Math.floor(Math.random() * projects.length)];
const projectName = selected.split('\\').pop();
console.error(`[verify] 抽查项目: ${projectName}`);

const health = loadHealthJson(selected);
if (!health) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'cross-check', detail: { project: projectName, error: 'health.json 无法读取' } }));
    process.exit(1);
}

const issues = [];

const freshness = checkHealthFreshness(health);
if (!freshness.ok) issues.push(freshness.reason);

const outputs = checkOutputFiles(selected, health);
if (!outputs.ok) issues.push(outputs.reason);

const audit = checkAuditAge(selected);
if (!audit.ok) issues.push(audit.reason);

const result = {
    ts: new Date().toISOString(),
    event: 'cross-check',
    detail: {
        project: projectName,
        health_score: health.audit_score,
        health_age_h: freshness.age ? freshness.age.toFixed(1) : null,
        audit_age_d: audit.age ? audit.age.toFixed(0) : null,
        issues,
        passed: issues.length === 0
    }
};

console.log(JSON.stringify(result));

process.exit(issues.length === 0 ? 0 : 1);
