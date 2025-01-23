import { getUserFromReq } from "./firebase";
import { Env } from "./types";
import { fetchRequestHandler, FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export default {
  async fetch(req, env): Promise<Response> {
    return fetchRequestHandler({
      endpoint: "/api",
      req,
      router,
      createContext: async ({ req, resHeaders }: FetchCreateContextFnOptions) => {
        const user = await getUserFromReq(env, caches.default, req);
        return { req, resHeaders, env, user };
      }
    });
  }
} satisfies ExportedHandler<Env>;
