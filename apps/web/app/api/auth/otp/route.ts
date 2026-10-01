import { sendEmailVerificationByCode } from "@calcom/features/auth/lib/verifyEmail";
import { verifyCodeUnAuthenticated } from "@calcom/features/auth/lib/verifyCodeUnAuthenticated";
import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const action = String(body.action || "send");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (action === "send") {
    await sendEmailVerificationByCode({ email, username: email.split("@")[0] });
    return NextResponse.json({ ok: true });
  }
  if (action === "verify") {
    const code = String(body.code || "");
    try {
      await verifyCodeUnAuthenticated(email, code);
    } catch {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    let user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          username: `${email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "user"}-${crypto.randomUUID().slice(0, 6)}`,
          name: email.split("@")[0],
          emailVerified: new Date(),
          identityProvider: IdentityProvider.CAL,
        },
      });
    }
    const token = crypto.randomUUID();
    await prisma.verificationToken.create({
      data: {
        identifier: `otp:${user.id}`,
        token,
        expires: new Date(Date.now() + 5 * 60_000),
      },
    });
    return NextResponse.json({ token });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
