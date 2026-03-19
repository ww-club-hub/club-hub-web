import { z } from "zod";
import { FIRESTORE_SCOPE, makeFirestoreDocPath, makeFirestoreField, makeServiceAccountToken, parseFirestoreObject } from "../../../firebase";
import { RequestError, authedJsonRequest, officerProcedure } from "../../../utils";
import { FirestoreRestDocument, OfficerPermission, UserData } from "../../../types";
import { revokeOauthToken } from "../../../google-oauth";

const ClubGoogleReq = z.object({
  clubId: z.string()
});

export default officerProcedure(OfficerPermission.Forms | OfficerPermission.Messages)
  .input(ClubGoogleReq)
  .mutation(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    // Google auth info is stored within clubs_private
    const docPath = `/schools/${ctx.user.school}/clubs_private/${input.clubId}/`;

    try {
      // fetch refresh token
      const tokenConfig = await authedJsonRequest<FirestoreRestDocument>(
        null,
        firestoreToken,
        makeFirestoreDocPath(ctx.env, `${docPath}?mask.fieldPaths=google`),
        "GET"
      ).then(r => r.name ? parseFirestoreObject(r.fields ?? {}) as unknown as Pick<UserData, "google"> : null);

      if (!tokenConfig?.google) {
        // club hasn't authorized
        return {
          success: false,
        };
      }

      await revokeOauthToken(tokenConfig.google.refreshToken);
    } catch (err) {
      if (err instanceof RequestError) {
        // club hasn't authorized
        return {
          success: false
        };
      } else {
        throw err;
      }
    }

    // remove db config
    await authedJsonRequest(
      makeFirestoreField({
        // remove google field
      }).mapValue,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `${docPath}?updateMask.fieldPaths=google`),
      "PATCH"
    );

    return {
      success: true
    };
  });
