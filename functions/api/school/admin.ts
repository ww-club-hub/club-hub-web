import { z } from "zod";
import { authedJsonRequest, authedProcedure } from "../../utils";
import { AUTH_SCOPE, FIRESTORE_SCOPE, getFirestoreUrl, makeFirestoreField, makeServiceAccountToken, updateUserRoles, getIdentityToolkitUrl } from "../../firebase";
import { UserClaims } from "../../types";
import { TRPCError } from "@trpc/server";

const AdminModReq = z.object({
  adminEmail: z.string()
});

export const removeAdmin = authedProcedure
  .input(AdminModReq)
  .mutation(async ({ ctx, input }) => {
    // verify permissions  
    if (ctx.user.role !== "owner") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be a school owner in order to modify school admins"
      });
    }
    
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    const userResult = await authedJsonRequest<{
      users: {
        localId: string,
        email: string,
        customAttributes: string,
      }[]
    }>({
      email: input.adminEmail
    }, authToken, `${getIdentityToolkitUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/accounts:lookup`);

    if (userResult.users.length >= 1) {
      const user = userResult.users[0];
      const attrs = (JSON.parse(user.customAttributes) ?? null) as UserClaims | null;
      if (attrs?.school === ctx.user.school) {
        await updateUserRoles(ctx.env, authToken, user.localId, attrs, {
          role: ""
        });
        
        // add to officer list
        await authedJsonRequest(
          {
            writes: [{
              transform: {
                document: `projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents/schools/${ctx.user.school}`,
                fieldTransforms: [{
                  fieldPath: "admins",
                  removeAllFromArray: makeFirestoreField([input.adminEmail]).arrayValue
                }]
              }
            }]
          },
          firestoreToken,
          `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents:batchWrite`
        );
      }
    }

    return {
      success: true
    };
  });

export const transferOwnership = authedProcedure
  .input(AdminModReq)
  .mutation(async ({ ctx, input }) => {
    // verify permissions  
    if (ctx.user.role !== "owner") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be a school owner in order to modify school admins"
      });
    }
    
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    const userResult = await authedJsonRequest<{
      users: {
        localId: string,
        email: string,
        customAttributes: string,
      }[]
    }>({
      email: input.adminEmail
    }, authToken, `${getIdentityToolkitUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/accounts:lookup`);

    if (userResult.users.length >= 1) {
      const user = userResult.users[0];
      const attrs = (JSON.parse(user.customAttributes) ?? null) as UserClaims | null;
      if (attrs?.school === ctx.user.school) {
        // update roles
        await updateUserRoles(ctx.env, authToken, user.localId, attrs, {
          role: "owner"
        });

        await updateUserRoles(ctx.env, authToken, ctx.user.user_id, ctx.user, {
          role: "admin"
        });
        
        // update doc
        await authedJsonRequest(
          {
            writes: [{
              updateMask: {
                fieldPaths: [
                  "admins", "owner"
                ]
              },
              update: {
                name: `projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents/schools/${ctx.user.school}`,
                ...makeFirestoreField({
                  // make them an admin
                  owner: input.adminEmail
                }).mapValue
              },
              
              updateTransforms: [{
                fieldPath: "admins",
                // remove the old admin from the admin array
                removeAllFromArray: makeFirestoreField([input.adminEmail]).arrayValue,
                // add the old owner to the admin array,
                appendMissingElements: makeFirestoreField([ctx.user.email]).arrayValue
              }]
            }]
          },
          firestoreToken,
          `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents:batchWrite`
        );
      }
    }

    return {
      success: true
    };
  });

export const addAdmin = authedProcedure
  .input(AdminModReq)
  .mutation(async ({ ctx, input }) => {
    // verify permissions  
    if (ctx.user.role !== "owner") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be a school owner in order to modify school admins"
      });
    }
    
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    const userResult = await authedJsonRequest<{
      users: {
        localId: string,
        email: string,
        customAttributes: string,
      }[]
    }>({
      email: input.adminEmail
    }, authToken, `${getIdentityToolkitUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/accounts:lookup`);

    if (userResult.users.length >= 1) {
      const user = userResult.users[0];
      const attrs = (JSON.parse(user.customAttributes) ?? null) as UserClaims | null;
      if (attrs?.school === ctx.user.school) {
        await updateUserRoles(ctx.env, authToken, user.localId, attrs, {
          role: "admin"
        });
        
        // add to officer list
        await authedJsonRequest(
          {
            writes: [{
              transform: {
                document: `projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents/schools/${ctx.user.school}`,
                fieldTransforms: [{
                  fieldPath: "admins",
                  appendMissingElements: makeFirestoreField([input.adminEmail]).arrayValue
                }]
              }
            }]
          },
          firestoreToken,
          `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents:batchWrite`
        );
      }
    }

    return {
      success: true
    };
  });

