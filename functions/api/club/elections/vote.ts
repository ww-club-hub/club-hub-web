import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ClubElectionApplicationStatus, Reference, type AggregationQueryResponse } from "../../../types";
import { authedJsonRequest, authedProcedure } from "../../../utils";
import { FIRESTORE_SCOPE, makeFirestoreDocPath, makeFirestoreField, makeServiceAccountToken, parseAggregationCount } from "../../../firebase";
import {
  ensureAttendanceRequirement,
  ensureVotingWindowOpen,
  ensureMemberAccess,
  getElectionSettings,
} from "./helpers";

const SubmitElectionVoteReq = z.object({
  clubId: z.string(),
  // votes: position name -> array of candidate emails for that position
  votes: z.record(z.string(), z.array(z.email())),
});

export default authedProcedure
  .input(SubmitElectionVoteReq)
  .mutation(async ({ ctx, input }) => {
    ensureMemberAccess(ctx.user, input.clubId);
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const school = ctx.user.school;
    const email = ctx.user.email;

    const settings = await getElectionSettings(ctx.env, firestoreToken, school, input.clubId);
    ensureVotingWindowOpen(settings);

    await ensureAttendanceRequirement(
      ctx.env,
      firestoreToken,
      school,
      input.clubId,
      email,
      "memberPercentage",
      "voting"
    );
    
    // Validate that at least one vote is submitted
    const uniqueVotes = new Set(Object.values(input.votes).flat());
    if (uniqueVotes.size === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You must submit at least one vote",
      });
    }
    
    if (!settings.voting.allowSelf && uniqueVotes.has(email)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Voting for yourself is not allowed",
      });
    }

    const candidateSet = new Set<string>();

    // Validate per-position vote limits and allowSelf
    for (const allPositionVotes of Object.values(input.votes)) {
      const positionVotes = new Set(allPositionVotes);
      
      // Validate no candidate appears in multiple positions
      for (const candidateEmail of positionVotes) {
        if (candidateSet.has(candidateEmail)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `You cannot vote for the same person (${candidateEmail}) in multiple positions`,
          });
        }
        candidateSet.add(candidateEmail);
      }
      
      if (positionVotes.size > settings.voting.numVotes) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You can vote for at most ${settings.voting.numVotes} candidate(s) per position`,
        });
      }
    }
    
    // Validate all votes are for approved candidates
    const voteDocRefs = [...uniqueVotes].map(voteEmail => new Reference(makeFirestoreDocPath(
      ctx.env,
      `/schools/${school}/clubs/${input.clubId}/elections/${voteEmail}`,
      false
    )));
    
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

    if (approvedVotesCount !== uniqueVotes.size) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more selected candidates are invalid or not approved",
      });
    }

    // Store votes in Firestore _votes document
    // Field names with special characters (dots in email) need to be escaped
    const fieldPath = `votes.\`${email}\``;
    const votesDocPath = new URL(makeFirestoreDocPath(
      ctx.env,
      `/schools/${school}/clubs/${input.clubId}/elections/_votes`
    ));
    votesDocPath.searchParams.set("updateMask.fieldPaths", fieldPath);

    const votesData = {
      votes: {
        [email]: input.votes
      }
    };

    // Use PATCH to merge the voter's votes into the existing document
    await authedJsonRequest(
      makeFirestoreField(votesData).mapValue,
      firestoreToken,
      votesDocPath.href,
      "PATCH"
    );

    return { success: true, votes: input.votes };
  });
