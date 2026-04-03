import sgMail from "@sendgrid/mail";
import Twilio from "twilio";

const SENDGRID_KEY = process.env.SENDGRID_API_KEY || "";
const TWILIO_SID = process.env.TWILIO_SID || "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM = process.env.TWILIO_FROM || "";

if (SENDGRID_KEY) sgMail.setApiKey(SENDGRID_KEY);

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!SENDGRID_KEY) {
    console.warn("SENDGRID_API_KEY not set — email not sent");
    return;
  }
  const msg: any = {
    to,
    from: process.env.SENDGRID_FROM || "no-reply@carhub.example.com",
    subject,
    text,
  };
  if (html) msg.html = html;
  try {
    await sgMail.send(msg);
  } catch (err: any) {
    console.error("SendGrid error:", err?.response?.body || err.message || err);
  }
}

export async function sendSMS(to: string, body: string) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.warn("Twilio credentials not set — SMS not sent");
    return;
  }
  try {
    const client = Twilio(TWILIO_SID, TWILIO_TOKEN);
    await client.messages.create({ to, from: TWILIO_FROM, body });
  } catch (err) {
    console.error("Twilio error:", err);
  }
}
