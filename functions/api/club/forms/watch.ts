import { z } from "zod";
import { authedProcedure } from "../../../utils";

const WatchFormReq = z.object({
  clubId: z.string(),
  formId: z.string(),
  code: z.string()
});

export default authedProcedure
  .input(WatchFormReq)
  .mutation(async ({ ctx, input }) => {

  });
