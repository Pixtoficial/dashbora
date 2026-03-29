/**
 * GET /api/credentials
 *
 * Verifica quais credenciais estão configuradas no servidor via env vars.
 * Não expõe os valores das credenciais — apenas informa se estão presentes.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const meta = !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);
  const google = !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN &&
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET
  );
  const ga4 = !!(
    (process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );

  return NextResponse.json({
    meta: {
      configured: meta,
      accountId: meta ? process.env.META_AD_ACCOUNT_ID : null,
    },
    google: {
      configured: google,
      customerId: google ? process.env.GOOGLE_ADS_CUSTOMER_ID : null,
    },
    ga4: {
      configured: ga4,
      propertyId: ga4 ? process.env.GA4_PROPERTY_ID : null,
    },
  });
}
