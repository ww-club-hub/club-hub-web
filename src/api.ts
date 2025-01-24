import { TRPCClientError, createTRPCProxyClient, httpBatchLink } from "@trpc/client";
// import our backend types
import type { AppRouter } from "../functions/worker";
import { auth } from "./firebase";
import { getIdTokenResult } from "firebase/auth";

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      // use miniflare when in development
      url: import.meta.env.DEV ? "http://localhost:8788" : location.origin,

      async headers() {
        if (!auth.currentUser) return {};
        // add firebase id token
        const idToken = await getIdTokenResult(auth.currentUser, false);
        return {
          Authorization: `Bearer ${idToken}`
        };
      }
    })
  ]
});

export function isTRPCClientError(
  cause: unknown,
): cause is TRPCClientError<AppRouter> {
  return cause instanceof TRPCClientError;
}

export default api;
