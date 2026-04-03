// SmileId integration stub. Replace with actual API calls and credentials.
export async function submitKyc({ userId, filePath }: { userId: string; filePath: string }) {
  // In production: upload file to SmileId, create verification request, return their tracking id and status.
  // Here we return a stubbed response.
  return { provider: "SMILEID", providerRef: `SMILEID_${Date.now()}`, status: "PENDING" };
}
export async function initiateKYC({ userId, callbackUrl }: { userId: string; callbackUrl: string }) {
  // In production, call SmileId API to start KYC. Here we return a stubbed URL.
  return {
    kycId: `SMILEID_${userId}_${Date.now()}`,
    redirectUrl: `${callbackUrl}?kycId=SMILEID_${userId}_${Date.now()}`,
  };
}

export async function verifyKYC(kycId: string) {
  // Call SmileId to verify. Stubbed as VERIFIED.
  return { status: "VERIFIED", kycId };
}
