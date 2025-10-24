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

export type PasswordResetEmailProps = {
  customerName: string;
  resetUrl: string;
  expiresInMinutes: number;
  supportEmail?: string;
};

export function getPasswordResetSubject(): string {
  return "Reset your Smelly Water Club password";
}

export function PasswordResetEmail({
  customerName,
  resetUrl,
  expiresInMinutes,
  supportEmail,
}: PasswordResetEmailProps): ReactElement {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Password reset requested</Heading>
          <Text style={styles.paragraph}>
            Hi {customerName}, we received a request to reset your Smelly Water Club password. Click
            the button below to choose a new password.
          </Text>
          <Section style={styles.ctaSection}>
            <Button href={resetUrl} style={styles.button}>
              Reset password
            </Button>
          </Section>
          <Text style={styles.paragraph}>
            For security, this link will expire in {expiresInMinutes} minutes. If you did not request
            a reset, you can safely ignore this email.
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
    maxWidth: "520px",
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

export default PasswordResetEmail;
