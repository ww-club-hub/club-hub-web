import { getUserFromReq } from "./firebase";
import { router } from "./trpc";
import { Env } from "./types";
import { fetchRequestHandler, FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import profile from "./api/user/profile";
import userInterests from "./api/user/interests";
import createSchool from "./api/school/create";
import joinSchool from "./api/school/join";
import searchSchools from "./api/school/search";
import clubMembers from "./api/club/members";
import clubOfficers from "./api/club/officers";

const appRouter = router({
  user: router({
    profile,
    interests: userInterests
  }),
  school: router({
    create: createSchool,
    search: searchSchools,
    join: joinSchool
  }),
  members: router({
    members: clubMembers,
    officers: clubOfficers
  })
});

export default {
  async fetch(req, env): Promise<Response> {
    return fetchRequestHandler({
      endpoint: "/api",
      req,
      router: appRouter,
      createContext: async ({ req, resHeaders }: FetchCreateContextFnOptions) => {
        const user = await getUserFromReq(env, caches.default, req);
        return { req, resHeaders, env, user };
      }
    });
  }
} satisfies ExportedHandler<Env>;

export type AppRouter = typeof appRouter;
