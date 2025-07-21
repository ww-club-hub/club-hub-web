import { api } from "./api";

async function getProfile(email: string) {
  return await api.user.profile.query({ email });
}

const PROFILE_CACHE_KEY = "userProfileCache";

export async function getCachedProfile(email: string) {
  // Get cache from sessionStorage
  const cacheRaw = sessionStorage.getItem(PROFILE_CACHE_KEY);
  let cache: Record<string, {
    displayName: string,
    photoUrl: string
  }> = {};
  if (cacheRaw) {
    try {
      cache = JSON.parse(cacheRaw);
    } catch {
      cache = {};
    }
  }

  // Return cached profile if exists
  if (cache[email]) {
    const profile =  cache[email];
    if (!profile.photoUrl) profile.photoUrl = "/icons/icon.svg";
    return profile;
  }

  // Fetch profile and cache it
  const profile = await getProfile(email);
  cache[email] = profile;
  sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));

  if (!profile.photoUrl) profile.photoUrl = "/icons/icon.svg";
  return profile;
}
