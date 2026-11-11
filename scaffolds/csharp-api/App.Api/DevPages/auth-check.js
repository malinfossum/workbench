// The manual browser check from the auth skill, one button per step. Each status line gets "<step>: pass" or
// "<step>: fail <key>" and nothing else; secrets go only into #secrets.
import { addPasskey, signInWithPasskey } from '/passkeys.js';

const $ = (id) => document.getElementById(id);
const email = () => $('email').value.trim();
const password = () => $('password').value;
const AUTH_KEY = /^[a-z0-9_]+(\.[A-Za-z]+)*$/; // "auth.error.wrongCode", "not_found", "status_404": a key, never free text
const busy = new Set();

// The line names its step, so a reader of the status lines never needs anything else on the page.
function report(step, ok, key) {
  $(`step-${step}`).textContent = `${step}: ${ok ? 'pass' : `fail ${AUTH_KEY.test(key ?? '') ? key : 'unexpected'}`}`;
}

function showSecret(label, lines) {
  $('secrets').textContent += `${label}\n${lines.join('\n')}\n\n`;
}

async function send(method, path, body, options = {}) {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // 204, a redirect or an empty body
  }
  return { ok: res.ok, status: res.status, type: res.type, data };
}

const post = (path, body, options) => send('POST', path, body, options);
const keyOf = (r) => r.data?.error ?? `status_${r.status}`;
const hasCodes = (codes) => Array.isArray(codes) && codes.length > 0;

// One run per button at a time: a second click while the first is in flight does nothing,
// so "Start TOTP" can't mint a second key behind the one already on screen.
function step(name, run) {
  $(`run-${name}`).addEventListener('click', async () => {
    if (busy.has(name)) return;
    busy.add(name);
    $(`step-${name}`).textContent = `${name}: running`;
    try {
      await run();
    } catch {
      report(name, false, 'unexpected');
    } finally {
      busy.delete(name);
    }
  });
}

step('sign-up', async () => {
  const r = await post('/auth/sign-up', { email: email(), password: password() });
  report('sign-up', r.status === 202, keyOf(r));
});

step('confirm', async () => {
  const input = $('confirm-link');
  const params = new URLSearchParams(new URL(input.value).hash.slice(1));
  input.value = ''; // the token leaves the page as soon as it is used
  const r = await post('/auth/confirm-email', { userId: params.get('uid'), token: params.get('token') });
  report('confirm', r.ok, keyOf(r));
});

// A good sign-in answers 302 (LocalRedirect to "/"). Followed, it would end on a 404 and read as a failure, so the
// redirect is not followed: an opaque redirect is the pass. The browser stores the session cookie either way.
step('sign-in', async () => {
  const r = await post('/auth/sign-in', { email: email(), password: password() }, { redirect: 'manual' });
  report('sign-in', r.type === 'opaqueredirect', keyOf(r));
});

// The first factor brings ten recovery codes, shown once.
step('passkey-add', async () => {
  const result = await addPasskey('Auth check');
  if (hasCodes(result.recoveryCodes)) showSecret('Recovery codes (passkey)', result.recoveryCodes);
  report('passkey-add', result.ok === true && hasCodes(result.recoveryCodes), result.error ?? 'no_codes');
});

step('sign-out-1', async () => {
  const r = await post('/auth/sign-out');
  report('sign-out-1', r.status === 204, keyOf(r));
});

step('passkey-sign-in', async () => {
  const result = await signInWithPasskey();
  report('passkey-sign-in', result.ok === true, result.error);
});

step('passkey-remove', async () => {
  const list = await send('GET', '/account/passkeys');
  if (!list.ok || !Array.isArray(list.data) || list.data.length !== 1) {
    return report('passkey-remove', false, list.ok ? 'unexpected' : keyOf(list));
  }
  const removed = await send('DELETE', `/account/passkey/${encodeURIComponent(list.data[0].id)}`);
  const after = await send('GET', '/account/passkeys');
  report('passkey-remove', removed.status === 204 && after.ok && after.data?.length === 0, keyOf(removed));
});

step('totp-start', async () => {
  const r = await post('/account/mfa/enrol', { code: null });
  if (r.ok) showSecret('TOTP key (only the newest one works)', [r.data.key, r.data.uri]);
  report('totp-start', r.ok && typeof r.data?.key === 'string', keyOf(r));
});

// With the passkey gone, TOTP is the only factor, so turning it on brings fresh codes.
step('totp', async () => {
  const input = $('totp-code');
  const r = await post('/account/mfa/enrol', { code: input.value.trim() });
  input.value = ''; // the code leaves the page as soon as it is used
  if (hasCodes(r.data?.recoveryCodes)) showSecret('Recovery codes (TOTP)', r.data.recoveryCodes);
  report('totp', r.ok && hasCodes(r.data?.recoveryCodes), r.ok ? 'no_codes' : keyOf(r));
});

// Once TOTP is on, asking again is refused with auth.error.wrongCode (R:1005) and issues nothing. Any other answer
// (401, 429, 503) fails the step, so an expired session can't pass it.
step('codes-once', async () => {
  const r = await post('/account/mfa/enrol', { code: null });
  report('codes-once', r.status === 400 && r.data?.error === 'auth.error.wrongCode' && !hasCodes(r.data?.recoveryCodes), keyOf(r));
});

step('sign-out-2', async () => {
  const r = await post('/auth/sign-out');
  report('sign-out-2', r.status === 204, keyOf(r));
});
