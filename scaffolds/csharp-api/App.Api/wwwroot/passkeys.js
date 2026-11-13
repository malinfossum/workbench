// Passkey ceremonies. The server builds the options; the browser only parses them and posts the result back.
const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

const cancelled = (err, fallback) => (err?.name === 'NotAllowedError' ? 'auth.error.passkeyCancelled' : fallback);

// The server's key when it sent one, else the status decides. A 429 is always "too many attempts".
async function failureOf(res, fallback) {
  if (res.status === 429) return 'auth.error.tooManyAttempts';
  try {
    const body = await res.json();
    if (body?.error === 'second_factor_required') return 'auth.error.secondFactorRequired'; // the second-factor gate's 403
    if (typeof body?.error === 'string' && body.error.startsWith('auth.')) return body.error;
  } catch {
    // not JSON: the status decides
  }
  return res.status === 401 ? 'auth.error.sessionExpired' : fallback;
}

export async function addPasskey(name) {
  try {
    const res = await post('/account/passkey/creation-options');
    if (!res.ok) return { error: await failureOf(res, 'auth.error.passkeyUnknown'), reauth: res.status === 401 }; // keep the form, sign in, come back
    const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(await res.json());
    const credential = await navigator.credentials.create({ publicKey });
    const saved = await post('/account/passkey', { name, credential: JSON.stringify(credential.toJSON()) });
    if (!saved.ok) return { error: await failureOf(saved, 'auth.error.passkeyUnknown') };
    const body = saved.status === 200 ? await saved.json() : {};
    return { ok: true, recoveryCodes: body.recoveryCodes }; // only with the first factor: show them once
  } catch (err) {
    return { error: cancelled(err, 'auth.error.passkeyUnknown') };
  }
}

// conditional: true runs from page load, so the browser offers passkeys in the field marked autocomplete="username webauthn".
// Conditional UI only before the password step: the passkey state shares Identity's two-factor cookie.
export async function signInWithPasskey({ conditional = false } = {}) {
  try {
    const res = await post('/auth/passkey/request-options');
    if (!res.ok) return { error: await failureOf(res, 'auth.error.unavailable') };
    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(await res.json());
    const credential = await navigator.credentials.get({ publicKey, mediation: conditional ? 'conditional' : 'optional' });
    const signedIn = await post('/auth/passkey/sign-in', { credential: JSON.stringify(credential.toJSON()) });
    return signedIn.ok ? { ok: true } : { error: await failureOf(signedIn, 'auth.error.passkeyUnknown') };
  } catch (err) {
    return { error: cancelled(err, 'auth.error.noPasskeyHere') };
  }
}
