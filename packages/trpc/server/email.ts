interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "ChaiForms <notifications@chaiforms.dev>";

export async function sendEmail(input: SendEmailInput) {
  if (!RESEND_API_KEY) {
    return { status: "queued" as const, provider: "demo" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  return {
    status: response.ok ? ("sent" as const) : ("failed" as const),
    provider: "resend",
  };
}
