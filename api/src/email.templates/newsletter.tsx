import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties, ReactElement } from "react";

export type NewsletterSection = {
  title: string;
  description: string;
  url?: string;
};

export type NewsletterEmailProps = {
  title: string;
  intro: string;
  sections?: NewsletterSection[];
  ctaLabel?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
  previewText?: string;
};

export function getNewsletterSubject(data: NewsletterEmailProps): string {
  return data.title;
}

export function NewsletterEmail({
  title,
  intro,
  sections = [],
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
  previewText,
}: NewsletterEmailProps): ReactElement {
  return (
    <Html>
      <Head />
      <Preview>{previewText ?? intro.slice(0, 90)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{title}</Heading>
          <Text style={styles.paragraph}>{intro}</Text>

          {sections.map((section) => (
            <Section key={section.title} style={styles.section}>
              <Heading as="h2" style={styles.sectionTitle}>
                {section.title}
              </Heading>
              <Text style={styles.sectionDescription}>{section.description}</Text>
              {section.url ? (
                <Row>
                  <Column>
                    <a href={section.url} style={styles.link}>
                      Read more →
                    </a>
                  </Column>
                </Row>
              ) : null}
            </Section>
          ))}

          {ctaLabel && ctaUrl ? (
            <Section style={styles.ctaSection}>
              <Button href={ctaUrl} style={styles.button}>
                {ctaLabel}
              </Button>
            </Section>
          ) : null}

          {unsubscribeUrl ? (
            <Text style={styles.footer}>
              Prefer fewer updates?{" "}
              <a href={unsubscribeUrl} style={styles.link}>
                Unsubscribe
              </a>
              .
            </Text>
          ) : null}
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
    maxWidth: "600px",
  },
  heading: {
    fontSize: "28px",
    fontWeight: 700,
    marginBottom: "16px",
  },
  paragraph: {
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "24px",
  },
  section: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "24px",
    marginTop: "24px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: 600,
    marginBottom: "12px",
  },
  sectionDescription: {
    fontSize: "15px",
    lineHeight: "22px",
    color: "#4a5568",
  },
  ctaSection: {
    textAlign: "center",
    marginTop: "32px",
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
    marginTop: "24px",
  },
  link: {
    color: "#2b6cb0",
    textDecoration: "underline",
  },
};

export default NewsletterEmail;
