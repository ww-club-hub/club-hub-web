import { ref, computed, type Ref, reactive } from "vue";
import { getClaims } from "@/utils";
import { OfficerPermission } from "@/schema";
import api from "@/api";
import { auth } from "@/firebase";

/**
 * Internal cache for per-club stores.
 */
const stores: Record<string, ReturnType<typeof createGoogleAccountStore>> = {};

/**
 * Returns a memoized Google account store for a given clubId.
 */
export function useGoogleAccountStore(clubId: string) {
  if (!stores[clubId]) {
    stores[clubId] = createGoogleAccountStore(clubId);
  }
  return stores[clubId];
}

/**
 * Creates a new Google account store for a specific club.
 */
function createGoogleAccountStore(clubId: string) {
  // Separate refs for each property
  const accessToken = ref<string | null>(null);
  const expiresAt = ref<number | null>(null);
  const email = ref<string | null>(null);
  const scope = reactive<Set<String>>(new Set());

  /**
   * Checks if the current user has permission to manage Google integration for this club.
   * Only officers with "forms" or "messages" permission can proceed.
   */
  async function hasGoogleIntegrationPermission(): Promise<boolean> {
    const claims = await getClaims(auth);
    if (!claims) return false;
    const officerBitmask = claims.officerOf?.[clubId] ?? 0;
    return (
      (officerBitmask & OfficerPermission.Forms) > 0 ||
      (officerBitmask & OfficerPermission.Messages) > 0
    );
  }

  /**
   * Checks if Google authorization is needed for this club for the given scopes.
   * Returns true if not authorized, token is expired, or missing scopes.
   * Throws if the officer lacks required permissions.
   */
  async function needsGoogleAuthorization(requestedScopes: string[]): Promise<boolean> {
    if (!(await hasGoogleIntegrationPermission())) {
      throw new Error("Insufficient permissions for Google integration.");
    }
    
    // If we already have a valid token and all requested scopes are present, return early
    if (
      accessToken.value &&
      expiresAt.value &&
      expiresAt.value > Date.now() &&
      requestedScopes.every(s => scope.has(s))
    ) {
      return false;
    }
    
    // Attempt to refresh token
    const result = await api.club.google.getToken.mutate({ clubId, scopes: requestedScopes });
    // Cannot refresh
    if (result.authorizationNeeded || !result.success) return true;
    
    // Update  with new token
    accessToken.value = result.accessToken;
    expiresAt.value = result.expiresAt;
    email.value = result.email;
    scope.clear();
    if (result.scope) {
      for (const s of result.scope.split(" ")) {
        scope.add(s);
      }
    }
    
    return false;
  }

  /**
   * Initiates Google OAuth flow and exchanges code for access token.
   * Updates the store state on success.
   * Throws on error.
   * NOTE: The UI should handle the actual OAuth popup and code exchange.
   */
  async function authorize(oauthCode: string): Promise<void> {
    if (!(await hasGoogleIntegrationPermission())) {
      throw new Error("Insufficient permissions for Google integration.");
    }
    // Exchange code for tokens via backend
    const result = await api.club.google.authorize.mutate({ clubId, token: oauthCode });
    accessToken.value = result.accessToken;
    expiresAt.value = result.expiresAt;
    email.value = result.email;
    scope.clear();
    if (result.scope) {
      for (const s of result.scope.split(" ")) {
        scope.add(s);
      }
    }
  }

  /**
   * Revokes the Google account link for this club and clears the store state.
   * Throws on error.
   */
  async function revoke(): Promise<void> {
    if (!(await hasGoogleIntegrationPermission())) {
      throw new Error("Insufficient permissions for Google integration.");
    }
    await api.club.google.revokeToken.mutate({ clubId });
    accessToken.value = null;
    expiresAt.value = null;
    email.value = null;
    scope.clear();
  }

  return {
    accessToken,
    expiresAt,
    email,
    scope,
    needsGoogleAuthorization,
    authorize,
    revoke,
    hasGoogleIntegrationPermission,
  };
}
