import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

type CheckArgs = {
  userId: number;
  teamId: number;
  permission?: string;
  fallbackRoles?: MembershipRole[] | string[];
};

export class PermissionCheckService {
  constructor(_prisma?: unknown) {}

  async checkPermission(args: CheckArgs): Promise<boolean> {
    const roles = (args.fallbackRoles || [
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.MEMBER,
    ]) as MembershipRole[];
    const membership = await prisma.membership.findFirst({
      where: {
        userId: args.userId,
        teamId: args.teamId,
        accepted: true,
        role: { in: roles },
      },
      select: { id: true },
    });
    return !!membership;
  }

  async hasPermission(args: CheckArgs): Promise<boolean> {
    return this.checkPermission(args);
  }

  async getTeamIdsWithPermission(args: {
    userId: number;
    permission?: string;
    fallbackRoles?: MembershipRole[] | string[];
  }): Promise<number[]> {
    const roles = (args.fallbackRoles || [
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.MEMBER,
    ]) as MembershipRole[];
    const rows = await prisma.membership.findMany({
      where: {
        userId: args.userId,
        accepted: true,
        role: { in: roles },
      },
      select: { teamId: true },
    });
    return rows.map((row) => row.teamId);
  }
}
