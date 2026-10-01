import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { NextResponse } from "next/server";

function extractEmail(xml: string): string | null {
  const nameId = xml.match(/<(?:\w+:)?NameID[^>]*>([^<]+)</i);
  if (nameId?.[1]) return nameId[1].trim().toLowerCase();
  const mail = xml.match(/emailaddress[^>]*>([^<]+)</i);
  return mail?.[1]?.trim().toLowerCase() || null;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const encoded = String(form.get("SAMLResponse") || "");
  const relay = String(form.get("RelayState") || "/");
  if (!encoded) {
    return NextResponse.json({ error: "Missing SAMLResponse" }, { status: 400 });
  }
  const xml = Buffer.from(encoded, "base64").toString("utf8");
  const email = extractEmail(xml);
  if (!email) {
    return NextResponse.redirect(new URL("/auth/error?error=saml-no-email", req.url));
  }
  let user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    const username = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "user";
    user = await prisma.user.create({
      data: {
        email,
        username: `${username}-${crypto.randomUUID().slice(0, 6)}`,
        name: email.split("@")[0],
        emailVerified: new Date(),
        identityProvider: IdentityProvider.SAML,
        identityProviderId: email,
      },
    });
  }
  const token = crypto.randomUUID();
  await prisma.verificationToken.create({
    data: {
      identifier: `saml:${user.id}`,
      token,
      expires: new Date(Date.now() + 60_000),
    },
  });
  const dest = new URL("/auth/saml-complete", req.url);
  dest.searchParams.set("token", token);
  dest.searchParams.set("callbackUrl", relay);
  return NextResponse.redirect(dest);
}
