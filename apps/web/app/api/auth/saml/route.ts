import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const entry = process.env.SAML_ENTRY_POINT;
  const issuer = process.env.SAML_ISSUER || process.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000";
  if (!entry) {
    return NextResponse.json({ error: "SAML is not configured" }, { status: 400 });
  }
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get("callbackUrl") || "/";
  const acs = `${issuer.replace(/\/$/, "")}/api/auth/saml/acs`;
  const dest = new URL(entry);
  dest.searchParams.set("SAMLRequest", Buffer.from(
    `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_${crypto.randomUUID()}" Version="2.0" IssueInstant="${new Date().toISOString()}" AssertionConsumerServiceURL="${acs}"><saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${issuer}</saml:Issuer></samlp:AuthnRequest>`
  ).toString("base64"));
  dest.searchParams.set("RelayState", callbackUrl);
  return NextResponse.redirect(dest.toString());
}
