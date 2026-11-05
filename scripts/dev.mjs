#!/usr/bin/env node
/**
 * Khởi động toàn bộ dự án ở local bằng 1 lệnh:  npm run dev
 *
 *  1. Tạo file env nếu chưa có (backend/.env, frontend/.env.local)
 *  2. Kiểm tra kết nối MySQL
 *  3. Cài dependencies nếu chưa cài
 *  4. Tạo DB (nếu chưa có) + chạy migration + seed dữ liệu mẫu (chỉ khi DB trống)
 *  5. Chạy song song backend (NestJS, watch) và frontend (Next.js dev)
 *
 * Tuỳ chọn (truyền sau "--"):
 *   npm run dev -- --db-port=5433                  đổi port MySQL
 *   npm run dev -- --db-url=mysql://root:matkhau@localhost:3306/grocery
 *   npm run dev -- --skip-install --skip-db
 * Các tuỳ chọn --db-* được ghi lại vào backend/.env cho các lần chạy sau.
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = join(ROOT, 'backend');
const WEB_DIR = join(ROOT, 'frontend');
const API_ENV = join(API_DIR, '.env');
const WEB_ENV = join(WEB_DIR, '.env.local');
const isWin = process.platform === 'win32';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);

const c = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = c(32), red = c(31), yellow = c(33), cyan = c(36), magenta = c(35), bold = c(1), gray = c(90);
const step = (msg) => console.log(`\n${bold(cyan('▶'))} ${bold(msg)}`);
const ok = (msg) => console.log(`  ${green('✔')} ${msg}`);
const die = (msg) => {
  console.error(`\n${red('✖')} ${msg}\n`);
  process.exit(1);
};

function run(cmd, cwd, env = {}) {
  const r = spawnSync(cmd, { cwd, shell: true, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) die(`Lệnh thất bại: ${cmd}  (thư mục ${cwd})`);
}

/** Đọc / ghi 1 biến trong file .env (giữ nguyên các dòng khác) */
function readEnv(file) {
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
function setEnv(file, key, value) {
  let s = readFileSync(file, 'utf8');
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  s = re.test(s) ? s.replace(re, line) : `${s.trimEnd()}\n${line}\n`;
  writeFileSync(file, s);
}

function canConnect(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port, timeout });
    sock.once('connect', () => (sock.destroy(), resolve(true)));
    sock.once('timeout', () => (sock.destroy(), resolve(false)));
    sock.once('error', () => resolve(false));
  });
}

// ───────────────────────────── 0. Node ─────────────────────────────
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) die(`Cần Node.js >= 20 (đang dùng ${process.versions.node})`);

// ───────────────────────────── 1. Env ─────────────────────────────
step('Cấu hình môi trường');
for (const [file, example] of [[API_ENV, join(API_DIR, '.env.example')], [WEB_ENV, join(WEB_DIR, '.env.example')]]) {
  if (!existsSync(file)) {
    copyFileSync(example, file);
    ok(`Tạo ${file.replace(ROOT + '/', '').replace(ROOT + '\\', '')} từ .env.example`);
  }
}
if (args['db-url']) {
  setEnv(API_ENV, 'DATABASE_URL', args['db-url']);
}
if (args['db-port']) {
  const u = new URL(readEnv(API_ENV).DATABASE_URL);
  u.port = String(args['db-port']);
  setEnv(API_ENV, 'DATABASE_URL', u.toString());
}
const env = readEnv(API_ENV);
if (!env.DATABASE_URL) die('backend/.env thiếu DATABASE_URL');
const db = new URL(env.DATABASE_URL);
const API_PORT = Number(env.PORT) || 4000;
const WEB_PORT = 3000;
ok(`Database: ${db.protocol}//${db.username}:****@${db.hostname}:${db.port || 3306}${db.pathname}`);

// ───────────────────────────── 2. DB ─────────────────────────────
step('Kiểm tra MySQL');
if (!(await canConnect(db.hostname, Number(db.port) || 3306))) {
  die(
    `Không kết nối được MySQL tại ${db.hostname}:${db.port || 3306}.\n` +
      `  • Kiểm tra MySQL đã chạy chưa (hoặc: docker compose up -d)\n` +
      `  • Nếu DB của bạn ở port khác:  npm run dev -- --db-port=<PORT>\n` +
      `  • Hoặc sửa DATABASE_URL trong backend/.env (user, mật khẩu, port, tên DB)`,
  );
}
ok('MySQL đang mở');

for (const p of [API_PORT, WEB_PORT]) {
  if (await canConnect('127.0.0.1', p, 800)) die(`Port ${p} đang bị chương trình khác chiếm. Hãy tắt nó rồi chạy lại.`);
}

// ───────────────────────────── 3. Install ─────────────────────────────
if (!args['skip-install']) {
  step('Cài dependencies');
  for (const dir of [API_DIR, WEB_DIR]) {
    const name = dir === API_DIR ? 'backend' : 'frontend';
    if (existsSync(join(dir, 'node_modules', '.package-lock.json'))) ok(`${name}: đã cài`);
    else {
      console.log(gray(`  npm install (${name})...`));
      run('npm install --no-audit --no-fund', dir);
      ok(`${name}: cài xong`);
    }
  }
}

// ───────────────────────────── 4. Migrate + seed ─────────────────────────────
if (!args['skip-db']) {
  step('Database: migrate + seed');
  // migrate deploy tự tạo database nếu chưa tồn tại
  run('npx prisma migrate deploy', API_DIR);
  run('npx prisma generate', API_DIR);
  run('npx prisma db seed', API_DIR); // tự bỏ qua nếu DB đã có dữ liệu
  ok('Database sẵn sàng');
}

// ───────────────────────────── 5. Chạy song song ─────────────────────────────
step('Khởi động backend + frontend  ' + gray('(Ctrl+C để dừng)'));
const procs = [];
let shuttingDown = false;

function start(name, color, cmd, cwd) {
  const p = spawn(cmd, { cwd, shell: true, env: { ...process.env, FORCE_COLOR: '1' }, detached: !isWin });
  const prefix = color(`[${name}]`.padEnd(6));
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const l of lines) out.write(`${prefix} ${l}\n`);
    });
  };
  pipe(p.stdout, process.stdout);
  pipe(p.stderr, process.stderr);
  p.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(red(`\n${name} đã dừng (code ${code}). Dừng toàn bộ.`));
      shutdown(code ?? 1);
    }
  });
  procs.push(p);
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const p of procs) {
    try {
      if (isWin) spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F']);
      else process.kill(-p.pid, 'SIGTERM'); // kill cả nhóm tiến trình con
    } catch {}
  }
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('api', magenta, 'npm run start:dev', API_DIR);
start('web', cyan, `npx next dev -p ${WEB_PORT}`, WEB_DIR);

// Báo khi cả 2 đã sẵn sàng
(async () => {
  const wait = async (url) => {
    for (let i = 0; i < 180 && !shuttingDown; i++) {
      try {
        if ((await fetch(url)).status < 500) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }
    return false;
  };
  const [a, w] = await Promise.all([wait(`http://localhost:${API_PORT}/api/health`), wait(`http://localhost:${WEB_PORT}`)]);
  if (a && w && !shuttingDown) {
    console.log(
      `\n${bold(green('✅ Dự án đã chạy!'))}\n` +
        `   🛒 Cửa hàng : ${bold(`http://localhost:${WEB_PORT}`)}\n` +
        `   🛠  Quản trị : ${bold(`http://localhost:${WEB_PORT}/admin`)}   ${gray('(admin@grocery.local / 123456)')}\n` +
        `   🔌 API      : ${bold(`http://localhost:${API_PORT}/api`)}\n` +
        `   👤 Khách    : ${gray('customer@grocery.local / 123456')}\n`,
    );
  } else if (!shuttingDown) console.log(yellow('\n⚠ Chưa thấy server phản hồi sau 3 phút, xem log phía trên.'));
})();
