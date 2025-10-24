import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties, ReactElement } from "react";

export type EmailVerificationOtpProps = {
  customerName: string;
  otpCode: string;
  expiresInMinutes: number;
  verificationUrl?: string;
  supportEmail?: string;
};

export function getEmailVerificationOtpSubject(_: EmailVerificationOtpProps): string {
  return "Verify your Smelly Water Club email";
}

export function EmailVerificationOtp({
  customerName,
  otpCode,
  expiresInMinutes,
  verificationUrl,
  supportEmail,
}: EmailVerificationOtpProps): ReactElement {
  return (
    <Html>
      <Head />
      <Preview>Your verification code for Smelly Water Club</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Confirm your email address</Heading>
          <Text style={styles.paragraph}>
            Hi {customerName}, use the verification code below to finish setting up your account.
          </Text>

          <Section style={styles.codeSection}>
            <Text style={styles.codeLabel}>Verification code</Text>
            <Text style={styles.code}>{otpCode}</Text>
          </Section>

          {verificationUrl ? (
            <Section style={styles.ctaSection}>
              <Button href={verificationUrl} style={styles.button}>
                Verify email
              </Button>
            </Section>
          ) : null}

          <Text style={styles.paragraph}>
            This code will expire in {expiresInMinutes} minutes. If you didn't request this, you can
            safely ignore this email.
          </Text>

          <Text style={styles.footer}>
            Need help?{" "}
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} style={styles.link}>
                Contact support
              </a>
            ) : (
              "Reply to this email"
            )}
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, CSSProperties> = {
  body: {
    backgroundColor: "#f7fafc",
    color: "#1a202c",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: "32px 0",
  },
  container: {
    margin: "0 auto",
    padding: "32px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    maxWidth: "480px",
  },
  heading: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "12px",
  },
  paragraph: {
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "20px",
  },
  codeSection: {
    backgroundColor: "#edf2f7",
    borderRadius: "8px",
    padding: "24px",
    textAlign: "center",
    marginBottom: "24px",
  },
  codeLabel: {
    fontSize: "14px",
    color: "#4a5568",
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    marginBottom: "12px",
  },
  code: {
    fontSize: "32px",
    fontWeight: 700,
    letterSpacing: "8px",
  },
  ctaSection: {
    textAlign: "center",
    marginBottom: "24px",
  },
  button: {
    backgroundColor: "#1a202c",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: 600,
    padding: "12px 24px",
    textDecoration: "none",
  },
  footer: {
    fontSize: "13px",
    color: "#718096",
    textAlign: "center",
  },
  link: {
    color: "#2b6cb0",
    textDecoration: "underline",
  },
};

export default EmailVerificationOtp;
