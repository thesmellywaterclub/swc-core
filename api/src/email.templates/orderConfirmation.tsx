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

export type OrderItem = {
  name: string;
  quantity: number;
  price: string;
};

export type OrderConfirmationEmailProps = {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: OrderItem[];
  subtotal: string;
  shipping: string;
  total: string;
  supportEmail?: string;
  viewOrderUrl?: string;
};

export function getOrderConfirmationSubject(data: OrderConfirmationEmailProps): string {
  return `Your Smelly Water Club order ${data.orderNumber} is confirmed`;
}

export function OrderConfirmationEmail({
  customerName,
  orderNumber,
  orderDate,
  items,
  subtotal,
  shipping,
  total,
  supportEmail,
  viewOrderUrl,
}: OrderConfirmationEmailProps): ReactElement {
  return (
    <Html>
      <Head />
      <Preview>{`SWC order ${orderNumber} confirmed`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Thanks for your order, {customerName}!</Heading>
          <Text style={styles.paragraph}>
            We have received your order and will notify you as soon as it ships.
          </Text>

          <Section style={styles.section}>
            <Text style={styles.subheading}>Order details</Text>
            <Text style={styles.meta}>
              <strong>Order number:</strong> {orderNumber}
              <br />
              <strong>Order date:</strong> {orderDate}
            </Text>
          </Section>

          <Section style={styles.section}>
            <Text style={styles.subheading}>Items</Text>
            {items.map((item) => (
              <Row key={`${item.name}-${item.quantity}`} style={styles.itemRow}>
                <Column style={styles.itemColumn}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>Qty {item.quantity}</Text>
                </Column>
                <Column align="right" style={styles.itemPriceColumn}>
                  <Text style={styles.itemPrice}>{item.price}</Text>
                </Column>
              </Row>
            ))}
            <Row style={styles.summaryRow}>
              <Column>
                <Text style={styles.summaryLabel}>Subtotal</Text>
              </Column>
              <Column align="right">
                <Text style={styles.summaryValue}>{subtotal}</Text>
              </Column>
            </Row>
            <Row style={styles.summaryRow}>
              <Column>
                <Text style={styles.summaryLabel}>Shipping</Text>
              </Column>
              <Column align="right">
                <Text style={styles.summaryValue}>{shipping}</Text>
              </Column>
            </Row>
            <Row style={styles.totalRow}>
              <Column>
                <Text style={styles.totalLabel}>Order total</Text>
              </Column>
              <Column align="right">
                <Text style={styles.totalValue}>{total}</Text>
              </Column>
            </Row>
          </Section>

          {viewOrderUrl ? (
            <Section style={styles.ctaSection}>
              <Button href={viewOrderUrl} style={styles.button}>
                View your order
              </Button>
            </Section>
          ) : null}

          <Text style={styles.footer}>
            Questions?{" "}
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} style={styles.link}>
                Contact our support team
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
    maxWidth: "600px",
  },
  heading: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "12px",
  },
  subheading: {
    fontSize: "16px",
    fontWeight: 600,
    marginBottom: "12px",
  },
  paragraph: {
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "20px",
  },
  meta: {
    fontSize: "14px",
    lineHeight: "20px",
    color: "#4a5568",
  },
  section: {
    marginBottom: "28px",
  },
  itemRow: {
    borderBottom: "1px solid #edf2f7",
    padding: "12px 0",
  },
  itemColumn: {
    verticalAlign: "top",
  },
  itemName: {
    fontSize: "15px",
    fontWeight: 600,
    marginBottom: "4px",
  },
  itemQuantity: {
    fontSize: "13px",
    color: "#718096",
  },
  itemPriceColumn: {
    verticalAlign: "top",
  },
  itemPrice: {
    fontSize: "15px",
    fontWeight: 600,
  },
  summaryRow: {
    paddingTop: "8px",
  },
  summaryLabel: {
    fontSize: "14px",
    color: "#4a5568",
  },
  summaryValue: {
    fontSize: "14px",
    color: "#1a202c",
  },
  totalRow: {
    borderTop: "2px solid #1a202c",
    marginTop: "16px",
    paddingTop: "12px",
  },
  totalLabel: {
    fontSize: "16px",
    fontWeight: 600,
  },
  totalValue: {
    fontSize: "18px",
    fontWeight: 700,
  },
  ctaSection: {
    textAlign: "center",
  },
  button: {
    backgroundColor: "#1a202c",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
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

export default OrderConfirmationEmail;
