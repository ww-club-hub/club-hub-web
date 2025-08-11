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
import authorizeGoogle from "./api/user/google/authorize";
import getGoogleToken from "./api/user/google/getToken";
import revokeGoogleToken from "./api/user/google/revoke";
import memberAttendanceStatistics from "./api/club/attendance/member-statistics";
import clubAttendanceStatistics from "./api/club/attendance/club-statistics";
import takeAttendance from "./api/club/attendance/take";
import queryAttendance from "./api/club/attendance/query";
import handleFormPush from "./api/club/forms/push";
import { WorkerEntrypoint } from "cloudflare:workers";

const appRouter = router({
  user: router({
    profile,
    gradYear: userGradYear,
    interests: userInterests,
    google: router({
      authorize: authorizeGoogle,
      getToken: getGoogleToken,
      revokeToken: revokeGoogleToken
    })
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
    officers: clubOfficers,
    attendance: router({
      memberStatistics: memberAttendanceStatistics,
      clubStatistics: clubAttendanceStatistics,
      take: takeAttendance,
      query: queryAttendance
    })
  })
});

async function handlePublicRoutes(req: Request, env: Env): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname === "/api/club/forms/push") {
    return await handleFormPush(req, env);
  }
  // handle with TRPC
  return null;
}

export default class extends WorkerEntrypoint<Env> {
  async fetch(req: Request<unknown, CfProperties<unknown>>): Promise<Response> {
    // Other routes
    let res = await handlePublicRoutes(req, this.env);

    // TRPC
    if (res == null)
      res = await fetchRequestHandler({
        endpoint: "/api",
        req,
        router: appRouter,
        createContext: async ({ req, resHeaders }: FetchCreateContextFnOptions) => {
          const user = await getUserFromReq(this.env, req);
          return { req, resHeaders, env: this.env, user };
        }
      });

    return res;
  }
};

export type AppRouter = typeof appRouter;
