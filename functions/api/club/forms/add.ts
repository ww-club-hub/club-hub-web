import { z } from "zod";
import { authedProcedure } from "../../../utils";

const AddFormReq = z.object({
  clubId: z.string(),
  form: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string()
  })
});

export default authedProcedure
  .input(AddFormReq)
  .mutation(async ({ ctx, input }) => {
    const watchId = `watch-${input.form.id.replace("_", "-")}`;

    const response = await authedJs
  });
