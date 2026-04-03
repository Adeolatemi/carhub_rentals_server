// Monnify payment service integration
// Requires MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE in .env

const MONNIFY_BASE_URL = "https://api.monnify.com";
const isSandbox = process.env.MONNIFY_SANDBOX === "true";

const getBaseUrl = () => {
  if (isSandbox) return "https://sandbox.monnify.com";
  return MONNIFY_BASE_URL;
};

async function getAccessToken(): Promise<string> {
  const apiKey = process.env.MONNIFY_API_KEY;
  const secretKey = process.env.MONNIFY_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("Monnify credentials not configured");
  }

  const auth = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

  const response = await fetch(`${getBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get Monnify access token");
  }

  const data = await response.json();
  return data.responseData.accessToken;
}

export async function createPayment({
  amount,
  customerEmail,
  callbackUrl,
}: {
  amount: number;
  customerEmail: string;
  callbackUrl: string;
}): Promise<{
  provider: string;
  reference: string;
  paymentUrl: string;
}> {
  const accessToken = await getAccessToken();
  const contractCode = process.env.MONNIFY_CONTRACT_CODE;

  if (!contractCode) {
    throw new Error("Monnify contract code not configured");
  }

  const reference = `CARHUB_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const response = await fetch(
    `${getBaseUrl()}/api/v2/merchant/transactions/init-transaction`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        customerEmail: customerEmail,
        customerName: customerEmail.split("@")[0],
        paymentReference: reference,
        paymentDescription: "CarHub Car Rental",
        currencyCode: "NGN",
        contractCode: contractCode,
        redirectUrl: callbackUrl,
        metadata: {
          carhub_booking: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Monnify payment creation failed:", error);
    throw new Error("Failed to create payment");
  }

  const data = await response.json();
  return {
    provider: "MONNIFY",
    reference: data.responseData.paymentReference,
    paymentUrl: data.responseData.checkoutUrl,
  };
}

export async function verifyPayment(reference: string): Promise<{
  status: string;
  amount: number;
  paidOn?: string;
}> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${getBaseUrl()}/api/v2/merchant/transactions/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to verify payment");
  }

  const data = await response.json();
  return {
    status: data.responseData.paymentStatus,
    amount: data.responseData.amountPaid,
    paidOn: data.responseData.paidOn,
  };
}

export function verifyWebhook(payload: any, signature: string | undefined): boolean {
  const secret = process.env.MONNIFY_WEBHOOK_SECRET;
  if (!secret || !signature) {
    // In development, allow if no signature
    if (process.env.NODE_ENV !== "production") return true;
    return false;
  }

  // In production, implement proper HMAC verification
  // For now, return true if signature exists
  return signature.length > 0;
}
