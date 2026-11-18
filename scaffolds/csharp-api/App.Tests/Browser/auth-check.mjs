// The browser check from the README, run without hands: Playwright's Chromium with an emulated passkey
// authenticator clicks the eleven steps on /dev/auth-check/ in order and prints the eleven status lines.
//
//   node App.Tests/Browser/auth-check.mjs [folder whose node_modules holds playwright-core]
//
// It starts the API itself (Development, http profile) and stops it afterwards. The passphrase, the
// confirmation link, the TOTP key and the recovery codes stay inside this process: only status lines and
// counts are printed, and errors are named, never quoted, because Playwright's messages echo typed values.
// The authenticator is emulated, so the Windows Hello dialog and real hardware keys are not covered.
import { execFileSync, spawn } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.resolve(HERE, '..', '..', 'App.Api');
const ORIGIN = 'http://localhost:5005'; // the http profile in Properties/launchSettings.json
const PAGE = `${ORIGIN}/dev/auth-check/`;
const STEPS = [
  'sign-up', 'confirm', 'sign-in', 'passkey-add', 'sign-out-1', 'passkey-sign-in',
  'passkey-remove', 'totp-start', 'totp', 'codes-once', 'sign-out-2',
];
const STATUS_LINE = /^[a-z0-9-]+: (pass|fail [A-Za-z0-9_.]+)$/;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const named = (name) => Object.assign(new Error(name), { name });
const nameOf = (err) => String(err?.name ?? 'Error').replace(/[^A-Za-z0-9_]/g, '');

// playwright-core from this project when it has one, else from the folder given as the first argument.
function loadChromium() {
  const from = process.argv[2] ? path.join(path.resolve(process.argv[2]), 'noop.js') : import.meta.url;
  try {
    return createRequire(from)('playwright-core').chromium;
  } catch {
    throw named('PlaywrightCoreNotFound');
  }
}

async function isUp() {
  try {
    return (await fetch(PAGE)).status === 200;
  } catch {
    return false;
  }
}

function startServer() {
  const child = spawn('dotnet', ['run', '--launch-profile', 'http'], {
    cwd: API_DIR,
    env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1' },
    stdio: 'ignore', // server logs are never read here
    detached: process.platform !== 'win32', // its own process group, so the stop reaches the app under dotnet run
    windowsHide: true,
  });
  child.once('error', () => { child.spawnFailed = true; }); // dotnet is not on PATH: reported below as a setup error
  return child;
}

function stopServer(child) {
  if (!child || !child.pid || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGTERM');
  } catch {
    // already gone
  }
}

// The link line of the newest confirm mail written after `since`.
async function confirmLink(since) {
  const dir = path.join(API_DIR, '.dev-mail');
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let names = [];
    try {
      names = (await readdir(dir)).filter((name) => /-confirm-[0-9a-f]{6}\.txt$/.test(name));
    } catch {
      // the folder appears with the first mail
    }
    const fresh = [];
    for (const name of names) {
      const info = await stat(path.join(dir, name));
      if (info.mtimeMs >= since) fresh.push({ name, at: info.mtimeMs });
    }
    if (fresh.length > 0) {
      fresh.sort((a, b) => b.at - a.at);
      const text = await readFile(path.join(dir, fresh[0].name), 'utf8');
      const link = text.split('\n').map((line) => line.trim()).find((line) => /^https?:\/\/\S+$/.test(line));
      if (link) return link;
    }
    await sleep(100);
  }
  throw named('NoConfirmMail');
}

function base32Decode(text) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of text.replace(/[\s=-]/g, '').toUpperCase()) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw named('BadTotpKey');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

// RFC 6238 as Identity's authenticator provider reads it: HMAC-SHA1, 30 second step, six digits.
function totp(key, now = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const mac = createHmac('sha1', key).update(counter).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

// The page appends "label\nkey\nuri\n\n" blocks to #secrets, and only the newest TOTP key works.
async function newestTotpKey(page) {
  const blocks = (await page.textContent('#secrets')).split('\n\n').filter((block) => block.startsWith('TOTP key'));
  const lines = blocks.at(-1)?.split('\n') ?? [];
  if (lines.length < 2) throw named('NoTotpKey');
  return base32Decode(lines[1]);
}

const results = [];
const notes = [];
let server = null;
let browser = null;
let exitCode = 1;

process.once('SIGINT', () => {
  stopServer(server);
  process.exit(130);
});

try {
  const chromium = loadChromium();
  if (!existsSync(path.join(API_DIR, 'app.db'))) throw named('NoDatabase_run_dotnet_ef_database_update_first');
  if (await isUp()) throw named('Port5005AlreadyServing');

  server = startServer();
  const deadline = Date.now() + 180_000; // a cold dotnet run builds first
  while (!(await isUp())) {
    if (server.spawnFailed) throw named('DotnetNotFound');
    if (server.exitCode !== null) throw named(`ServerExited_${server.exitCode}`);
    if (Date.now() > deadline) throw named('ServerStartTimeout');
    await sleep(500);
  }

  browser = await chromium.launch({ channel: 'chromium', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  await page.goto(PAGE);
  notes.push(`browser: Chromium ${browser.version()} (Playwright, headless), emulated authenticator`);

  // A new address each run, so a rerun never meets an account that already exists.
  await page.fill('#email', `check-${Date.now().toString(36)}@example.test`);
  await page.fill('#password', randomBytes(24).toString('base64url')); // 32 characters, made here, never printed

  let signUpAt = Date.now();
  for (const name of STEPS) {
    try {
      if (name === 'sign-up') signUpAt = Date.now() - 1000;
      if (name === 'confirm') await page.fill('#confirm-link', await confirmLink(signUpAt));
      if (name === 'totp') await page.fill('#totp-code', totp(await newestTotpKey(page)));

      await page.click(`#run-${name}`);
      await page.waitForFunction(
        (step) => {
          const text = document.getElementById(`step-${step}`).textContent;
          return text !== '' && !text.endsWith(': running');
        },
        name,
        { timeout: 30_000 },
      );
      const line = (await page.textContent(`#step-${name}`)).trim();
      results.push(STATUS_LINE.test(line) ? line : `${name}: unreadable`);

      if (name === 'passkey-add') {
        const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
        notes.push(`passkeys on the emulated authenticator after passkey-add: ${credentials.length}`);
      }
    } catch (err) {
      results.push(`${name}: script-error ${nameOf(err)}`);
    }
  }

  const passed = results.filter((line) => line.endsWith(': pass')).length;
  exitCode = passed === STEPS.length ? 0 : 1;
  notes.push(`result: ${passed}/${STEPS.length} pass`);
} catch (err) {
  notes.push(`setup-error ${nameOf(err)}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  stopServer(server);
}

for (const line of [...results, ...notes]) console.log(line);
process.exit(exitCode);
