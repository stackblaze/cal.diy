import { randomUUID } from "node:crypto";

import { BookingAuditAction, BookingAuditSource, BookingAuditType } from "@calcom/prisma/enums";
import type { PrismaClient } from "@calcom/prisma";

export async function writeBookingAudit(
  prisma: PrismaClient,
  bookingUid: string,
  action: BookingAuditAction | "CREATED" | "RESCHEDULED" = BookingAuditAction.CREATED
) {
  try {
    const actor = await prisma.auditActor.upsert({
      where: { email: "system@cal.diy" },
      create: { type: "SYSTEM", email: "system@cal.diy", name: "Cal.diy" },
      update: {},
    });
    await prisma.bookingAudit.create({
      data: {
        bookingUid,
        actorId: actor.id,
        type: BookingAuditType.RECORD_CREATED,
        action,
        timestamp: new Date(),
        source: BookingAuditSource.SYSTEM,
        operationId: randomUUID(),
      },
    });
  } catch (error) {
    console.error("writeBookingAudit failed", error);
  }
}
