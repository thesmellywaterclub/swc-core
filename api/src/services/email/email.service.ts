import { render } from "@react-email/render";
import { Resend } from "resend";
import type { ReactElement } from "react";

import {
  OrderConfirmationEmail,
  type OrderConfirmationEmailProps,
  getOrderConfirmationSubject,
} from "../../email.templates/orderConfirmation";
import {
  PasswordResetEmail,
  type PasswordResetEmailProps,
  getPasswordResetSubject,
} from "../../email.templates/passwordReset";
import {
  NewsletterEmail,
  type NewsletterEmailProps,
  getNewsletterSubject,
} from "../../email.templates/newsletter";
import {
  EmailVerificationOtp,
  type EmailVerificationOtpProps,
  getEmailVerificationOtpSubject,
} from "../../email.templates/emailVerificationOtp";
import { env } from "../../env";
import { createHttpError } from "../../middlewares/error";
import { logger } from "../../logger";

type EmailType = "orderConfirmation" | "passwordReset" | "newsletter" | "emailVerificationOtp";

type EmailDataMap = {
  orderConfirmation: OrderConfirmationEmailProps;
  passwordReset: PasswordResetEmailProps;
  newsletter: NewsletterEmailProps;
  emailVerificationOtp: EmailVerificationOtpProps;
};

export type SendEmailPayload<TType extends EmailType = EmailType> = {
  to: string | string[];
  type: TType;
  data: EmailDataMap[TType];
};

type TemplateDescriptor<TData> = {
  subject: (data: TData) => string;
  render: (data: TData) => ReactElement;
};

const templateRegistry: { [K in EmailType]: TemplateDescriptor<EmailDataMap[K]> } = {
  orderConfirmation: {
    subject: getOrderConfirmationSubject,
    render: (data) => OrderConfirmationEmail(data),
  },
  passwordReset: {
    subject: getPasswordResetSubject,
    render: (data) => PasswordResetEmail(data),
  },
  newsletter: {
    subject: getNewsletterSubject,
    render: (data) => NewsletterEmail(data),
  },
  emailVerificationOtp: {
    subject: (data) => getEmailVerificationOtpSubject(data),
    render: (data) => EmailVerificationOtp(data),
  },
};

const resendClient = new Resend(env.resendApiKey);

type ResendResponse = Awaited<ReturnType<typeof resendClient.emails.send>>;
type SendEmailResult = NonNullable<ResendResponse["data"]>;

function formatRecipient(to: string | string[]): string {
  return Array.isArray(to) ? to.join(", ") : to;
}

export async function sendEmail<TType extends EmailType>(
  payload: SendEmailPayload<TType>,
): Promise<SendEmailResult> {
  const { to, type, data } = payload;
  const template = templateRegistry[type];

  if (!template) {
    throw createHttpError(400, `Unsupported email type: ${type}`);
  }

  try {
    const html = await render(template.render(data));
    const subject = template.subject(data);

    const { data: response, error: resendError } = await resendClient.emails.send({
      from: env.emailFrom,
      to,
      subject,
      html,
    });
    if (resendError) {
      throw resendError;
    }
    if (!response) {
      throw new Error("Resend returned an empty response");
    }
    logger.info("Email dispatched via Resend", {
      to: formatRecipient(to),
      type,
      id: response.id,
    });

    return response;
  } catch (error) {
    logger.error("Failed to send email via Resend", {
      error,
      type,
      to: formatRecipient(to),
    });

    throw createHttpError(
      502,
      "Unable to send email",
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}
