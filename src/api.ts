import { TRPCClientError, createTRPCProxyClient, httpBatchLink } from "@trpc/client";
// import our backend types
import type { AppRouter } from "../functions/worker";
import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";

const apiOrigin = BACKEND_EMULATOR;

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      // use miniflare when in development
      url: `${apiOrigin}/api`,

      async headers() {
        if (!auth.currentUser) return {};
        // add firebase id token
        const idToken = await getIdToken(auth.currentUser, false);
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
