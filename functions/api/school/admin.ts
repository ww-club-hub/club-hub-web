import { z } from "zod";
import { authedJsonRequest, authedProcedure } from "../../utils";
import { AUTH_SCOPE, FIRESTORE_SCOPE, getFirestoreUrl, makeFirestoreField, makeServiceAccountToken, updateUserRoles, getIdentityToolkitUrl, getUserAttributes, lookupUser } from "../../firebase";
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

    // get the referenced user
    const user = await lookupUser(input.adminEmail, authToken, ctx.env);

    if (user) {
      const attrs = getUserAttributes(user);
      // TODO: checking for this (school match) each time is really unsustainable
      // we need a better interface for fetching users "as" another user which will throw if they're from another school
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

        return {
          success: true
        };
      }
    }

    // user not found or not from school
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "user not found"
    });
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

    // get the referenced user
    const user = await lookupUser(input.adminEmail, authToken, ctx.env);

    if (user) {
      const attrs = getUserAttributes(user);
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

        return {
          success: true
        };
      }
    }

    // either this user doesn't exist or they aren't from the specified school
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "user not found"
    });
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

    // get the referenced user
    const user = await lookupUser(input.adminEmail, authToken, ctx.env);

    if (user) {
      const attrs = getUserAttributes(user);
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

        return {
          success: true
        };
      }
    }

    // either this user doesn't exist or they aren't from the specified school
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "user not found"
    });
  });

