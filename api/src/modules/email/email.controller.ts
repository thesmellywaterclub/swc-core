import type { Request } from "express";

import { sendEmail } from "../../services/email/email.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendEmailSchema } from "./email.schemas";

export const sendTransactionalEmailHandler = asyncHandler(async (req: Request, res) => {
  const payload = sendEmailSchema.parse(req.body);
  const result = await sendEmail(payload);

  res.status(202).json({
    data: {
      id: result.id,
      to: payload.to,
      type: payload.type,
    },
  });
});
