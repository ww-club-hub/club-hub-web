import { initTRPC } from "@trpc/server";
import { Context } from "./types";

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error, path }) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      console.error(`An error occurred while handling \`${path}\`:\n${error.stack}`);
    }

    return {
      ...shape,
      data: {
        ...shape.data,
      },
      message:
        error.code === 'INTERNAL_SERVER_ERROR' ? "Internal server error" : shape.message
    };
  }
});
export const router = t.router;
export const publicProcedure = t.procedure;
