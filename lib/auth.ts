const AUTH_COOKIE_NAME = "bombers_fc_auth";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(digest);
}

export function getConfiguredPassword() {
  return process.env.BOMBERS_FC_PASSWORD ?? "";
}

function getAuthSecret() {
  return process.env.BOMBERS_FC_AUTH_SECRET ?? process.env.BOMBERS_FC_PASSWORD ?? "";
}

export function isAuthEnabled() {
  return Boolean(getConfiguredPassword());
}

export async function createAuthToken(password: string) {
  return sha256(`${password}:${getAuthSecret()}`);
}

export async function getExpectedAuthToken() {
  const configuredPassword = getConfiguredPassword();
  if (!configuredPassword) return null;
  return createAuthToken(configuredPassword);
}

export async function isValidAuthToken(token: string | undefined) {
  const expectedToken = await getExpectedAuthToken();
  if (!expectedToken) return true;
  if (!token) return false;
  return token === expectedToken;
}

export { AUTH_COOKIE_NAME };
