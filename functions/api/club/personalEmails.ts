import { z } from "zod";
import { AUTH_SCOPE, makeServiceAccountToken, lookupUser, getUserAttributes, FIRESTORE_SCOPE, makeFirestoreDocPath, parseFirestoreObject } from "../../firebase";
import { officerProcedure, authedJsonRequest } from "../../utils";
import { OfficerPermission } from "../../types";

export default officerProcedure(OfficerPermission.Members)
  .query(async ({ ctx, input }) => {
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    
    // Get club private doc to fetch members list
    const clubPrivateDoc = await authedJsonRequest(
      null,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs_private/${input.clubId}`),
      "GET"
    ) as any;

    const clubPrivate = parseFirestoreObject(clubPrivateDoc.fields);
    const members = (clubPrivate.members || []) as string[];

    // Fetch personal emails for each member
    const personalEmails: string[] = [];
    
    for (const memberEmail of members) {
      try {
        const userDetails = await lookupUser(memberEmail, authToken, ctx.env);
        if (userDetails) {
          const attrs = getUserAttributes(userDetails);
          if (attrs?.personalEmail) {
            personalEmails.push(attrs.personalEmail);
          }
        }
      } catch (error) {
        // Skip members that don't exist or have errors
        console.warn(`Failed to fetch personal email for ${memberEmail}:`, error);
      }
    }

    return {
      emails: personalEmails
    };
  });
