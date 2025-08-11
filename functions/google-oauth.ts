import { Env } from "./types";

/**
 * Fetches the Google OpenID configuration document, using the cache if available.
 */
async function getGoogleOpenIDConfiguration() {
  // Google OpenID discovery doc
  const url = "https://accounts.google.com/.well-known/openid-configuration";

  const cached = await caches.default.match(url);
  if (cached) return await cached.json<{
    issuer: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    revocation_endpoint: string;
  }>();
  const res = await fetch(url);
  await caches.default.put(url, res.clone());
  return await res.json<{
    issuer: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    revocation_endpoint: string;
  }>();
}

/**
 * Exchange user OAuth sign in token for access token
 */
export async function exchangeOauthToken(env: Env, oauthToken: string) {
  const config = await getGoogleOpenIDConfiguration();

  const body = new URLSearchParams();
  body.set("client_id", env.OAUTH_CLIENT_ID);
  body.set("client_secret", env.OAUTH_CLIENT_SECRET);
  body.set("code", oauthToken);
  body.set("grant_type", "authorization_code");
  // https://stackoverflow.com/a/55222567
  body.set("redirect_uri", "postmessage");

  const res = await fetch(config.token_endpoint, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }).then(async r => {
    if (r.ok) {
      return await r.json<{
        access_token: string,
        expires_in: number,
        refresh_token: string,
        scope: string,
      }>();
    } else {
      throw new Error(await r.text());
    }
  });

  return res;
}

export async function refreshAccessToken(env: Env, refreshToken: string) {
  const body = new URLSearchParams();

  body.set("client_id", env.OAUTH_CLIENT_ID);
  body.set("client_secret", env.OAUTH_CLIENT_SECRET);
  body.set("refresh_token", refreshToken);
  body.set("grant_type", "refresh_token");

  const config = await getGoogleOpenIDConfiguration();

  const res = await fetch(config.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  }).then(r => r.ok ? r.json<{
    access_token: string,
    expires_in: number,
    scope: string,
  }>() : null)

  return res;
}

/**
 * Fetches OpenID user info
 */
export async function fetchGoogleUserInfo(accessToken: string) {
  const config = await getGoogleOpenIDConfiguration();

  const res = await fetch(config.userinfo_endpoint, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  }).then(r => r.ok ? r.json<{
    email: string;
    email_verified: boolean;
  }>() : null)

  return res;
}

/**
 * Revokes the given OAuth refresh token.
 */
export async function revokeOauthToken(token: string) {
  const config = await getGoogleOpenIDConfiguration();

  await fetch(`${config.revocation_endpoint}?token=${token}`, {
    method: "POST",
  });
}
