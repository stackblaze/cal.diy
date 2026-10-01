import nodemailer from "nodemailer";
import type { TransportOptions } from "nodemailer";

import { serverConfig } from "@calcom/lib/serverConfig";
import prisma from "@calcom/prisma";

type Trigger = "BOOKING_CREATED" | "BOOKING_RESCHEDULED" | "BOOKING_CANCELLED" | "BOOKING_ENDED";

export async function runExtWorkflows(opts: {
  trigger: Trigger;
  eventTypeId?: number | null;
  teamId?: number | null;
  userId?: number | null;
  attendeeEmail?: string | null;
  hostEmail?: string | null;
  title?: string | null;
  attendeePhone?: string | null;
}) {
  try {
    const workflows = await prisma.extWorkflow.findMany({
      where: {
        trigger: opts.trigger,
        OR: [
          opts.eventTypeId ? { eventTypeId: opts.eventTypeId } : undefined,
          opts.teamId ? { teamId: opts.teamId } : undefined,
          opts.userId ? { userId: opts.userId, eventTypeId: null, teamId: null } : undefined,
        ].filter(Boolean) as object[],
      },
      include: { steps: true },
    });
    if (!workflows.length) return;
    const transporter = nodemailer.createTransport(serverConfig.transport as TransportOptions);
    for (const workflow of workflows) {
      for (const step of workflow.steps) {
        const to =
          step.action === "EMAIL_HOST"
            ? opts.hostEmail
            : step.action === "EMAIL_ATTENDEE"
              ? opts.attendeeEmail
              : null;
        const body = step.template
          .replaceAll("{{title}}", opts.title || "")
          .replaceAll("{{trigger}}", opts.trigger);
        if (step.action === "SMS_ATTENDEE" && opts.attendeePhone && process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM) {
          await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_TOKEN}`).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: opts.attendeePhone,
                From: process.env.TWILIO_FROM,
                Body: body,
              }),
            }
          );
          continue;
        }
        if (!to) continue;
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "Cal.diy",
          to,
          subject: `${workflow.name}: ${opts.title || opts.trigger}`,
          text: body,
          html: `<p>${body}</p>`,
        });
      }
    }
  } catch (error) {
    console.error("runExtWorkflows failed", error);
  }
}
