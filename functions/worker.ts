import { getUserFromReq } from "./firebase";
import { router } from "./trpc";
import { Env } from "./types";
import { fetchRequestHandler, FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import profile from "./api/user/profile";
import userGradYear from "./api/user/gradYear";
import userInterests from "./api/user/interests";
import createSchool from "./api/school/create";
import joinSchool from "./api/school/join";
import searchSchools from "./api/school/search";
import clubMembers from "./api/club/members";
import clubOfficers from "./api/club/officers";
import { removeAdmin, addAdmin, transferOwnership } from "./api/school/admin";

const appRouter = router({
  user: router({
    profile,
    gradYear: userGradYear,
    interests: userInterests
  }),
  school: router({
    create: createSchool,
    search: searchSchools,
    join: joinSchool,
    admin: router({
      remove: removeAdmin,
      add: addAdmin,
      transferOwnership
    })
  }),
  club: router({
    members: clubMembers,
    officers: clubOfficers
  })
});

export default {
  async fetch(req, env): Promise<Response> {
    const origin = req.headers.get("Origin");
    
    if (req.method === "OPTIONS" && env.USE_EMULATOR) {
      // handle cors preflight
      const headers = new Headers();
      if (origin === "http://localhost:5173") {
        headers.append("Access-Control-Allow-Origin", origin);
        headers.append("Access-Control-Allow-Headers", "authorization,content-type");
      }
      return new Response(null, {
        status: 204,
        headers
      });
    }
    const res = await fetchRequestHandler({
      endpoint: "/api",
      req,
      router: appRouter,
      createContext: async ({ req, resHeaders }: FetchCreateContextFnOptions) => {
        const user = await getUserFromReq(env, caches.default, req);
        return { req, resHeaders, env, user };
      }
    });

    // non-preflight cors
    if (env.USE_EMULATOR && origin === "http://localhost:5173")
      res.headers.append("Access-Control-Allow-Origin", origin);

    return res;
  }
} satisfies ExportedHandler<Env>;

export type AppRouter = typeof appRouter;
