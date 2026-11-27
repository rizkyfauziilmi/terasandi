import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "react-email";

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type VerificationEmailProps = {
  url: string;
};

export function VerificationEmail({ url }: VerificationEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        Confirm your email address to finish setting up Terasandi.
      </Preview>
      <Body
        style={{
          backgroundColor: "#f4f5f7",
          fontFamily,
          margin: 0,
          padding: "32px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            margin: "0 auto",
            maxWidth: "560px",
            padding: "40px 40px 32px",
          }}
        >
          <Text
            style={{
              color: "#111827",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              margin: "0 0 28px",
              textTransform: "uppercase",
            }}
          >
            Terasandi
          </Text>

          <Heading
            as="h1"
            style={{
              color: "#111827",
              fontSize: "24px",
              fontWeight: 600,
              lineHeight: "32px",
              margin: "0 0 16px",
            }}
          >
            Verify your email address
          </Heading>

          <Text
            style={{
              color: "#4b5563",
              fontSize: "15px",
              lineHeight: "24px",
              margin: "0 0 28px",
            }}
          >
            Thanks for setting up Terasandi. Confirm this address to finish
            creating the first administrator account and secure access to your
            cloud.
          </Text>

          <Button
            href={url}
            style={{
              backgroundColor: "#111827",
              borderRadius: "8px",
              color: "#ffffff",
              display: "inline-block",
              fontSize: "15px",
              fontWeight: 600,
              lineHeight: "20px",
              padding: "12px 20px",
              textDecoration: "none",
            }}
          >
            Verify email address
          </Button>

          <Text
            style={{
              color: "#6b7280",
              fontSize: "13px",
              lineHeight: "20px",
              margin: "24px 0 0",
            }}
          >
            If the button does not work, copy this link into your browser:
          </Text>
          <Link
            href={url}
            style={{
              color: "#111827",
              fontSize: "13px",
              lineHeight: "20px",
              wordBreak: "break-all",
            }}
          >
            {url}
          </Link>

          <Hr
            style={{
              border: "none",
              borderTop: "1px solid #e5e7eb",
              margin: "32px 0 20px",
            }}
          />

          <Text
            style={{
              color: "#6b7280",
              fontSize: "12px",
              lineHeight: "18px",
              margin: "0",
            }}
          >
            This link expires in 1 hour. If you did not request it, you can
            ignore this email and nothing will change.
          </Text>
          <Text
            style={{
              color: "#9ca3af",
              fontSize: "12px",
              lineHeight: "18px",
              margin: "12px 0 0",
            }}
          >
            Terasandi — Your Data, Your Cloud, Your Control.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default VerificationEmail;
