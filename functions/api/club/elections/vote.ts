import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ClubElectionApplicationStatus, Reference, type AggregationQueryResponse } from "../../../types";
import { authedJsonRequest, authedProcedure } from "../../../utils";
import { FIRESTORE_SCOPE, makeFirestoreDocPath, makeFirestoreField, makeServiceAccountToken, parseAggregationCount } from "../../../firebase";
import {
  ensureAttendanceRequirement,
  ensureElectionWindowOpen,
  ensureMemberAccess,
  getElectionSettings,
} from "./helpers";

const voteStore = new Map<string, Map<string, string[]>>();

const SubmitElectionVoteReq = z.object({
  clubId: z.string(),
  votes: z.array(z.email()),
});

function getVoteMap(schoolId: string, clubId: string) {
  const key = `${schoolId}:${clubId}`;
  if (!voteStore.has(key)) {
    voteStore.set(key, new Map<string, string[]>());
  }
  return voteStore.get(key)!;
}

export default authedProcedure
  .input(SubmitElectionVoteReq)
  .mutation(async ({ ctx, input }) => {
    ensureMemberAccess(ctx.user, input.clubId);
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const school = ctx.user.school;
    const email = ctx.user.email;

    const settings = await getElectionSettings(ctx.env, firestoreToken, school, input.clubId);
    ensureElectionWindowOpen(settings);

    await ensureAttendanceRequirement(
      ctx.env,
      firestoreToken,
      school,
      input.clubId,
      email,
      "memberPercentage",
      "voting"
    );
    
    // remove duplicates
    const uniqueVotes = [...new Set(input.votes)];
    if (uniqueVotes.length > settings.voting.numVotes) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `You can vote for at most ${settings.voting.numVotes} candidate(s)`,
      });
    }
    if (!settings.voting.allowSelf && uniqueVotes.includes(email)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Voting for yourself is not allowed",
      });
    }

    if (uniqueVotes.length > 0) {
      // list all doc references for voting
      const voteDocRefs = uniqueVotes.map(voteEmail => new Reference(makeFirestoreDocPath(
        ctx.env,
        `/schools/${school}/clubs/${input.clubId}/elections/${voteEmail}`,
        false
      )));
      
      // Count how many valid votes they have (votes for an approved user)
      const approvedVoteCountQuery = await authedJsonRequest<AggregationQueryResponse>(
        {
          structuredAggregationQuery: {
            aggregations: [{
              count: {},
              alias: "numApprovedVotes"
            }],
            structuredQuery: {
              from: [{
                collectionId: "elections"
              }],
              where: {
                compositeFilter: {
                  op: "AND",
                  filters: [
                    {
                      fieldFilter: {
                        field: { fieldPath: "status" },
                        op: "EQUAL",
                        value: makeFirestoreField(ClubElectionApplicationStatus.Approved)
                      }
                    },
                    {
                      fieldFilter: {
                        field: { fieldPath: "__name__" },
                        op: "IN",
                        value: makeFirestoreField(voteDocRefs)
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        firestoreToken,
        makeFirestoreDocPath(ctx.env, `/schools/${school}/clubs/${input.clubId}:runAggregationQuery`)
      );

      const approvedVotesCount = parseAggregationCount(approvedVoteCountQuery, "numApprovedVotes");

      if (approvedVotesCount !== uniqueVotes.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more selected candidates are invalid or not approved",
        });
      }
    }

    const voteMap = getVoteMap(school, input.clubId);
    voteMap.set(email, uniqueVotes);

    return { success: true, votes: uniqueVotes };
  });
