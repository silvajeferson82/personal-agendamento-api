import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import * as argon2 from "argon2";
import { DataSource } from "typeorm";
import { isUniqueViolation } from "../../database/is-unique-violation";
import { Member } from "../members/member.entity";
import { MemberRole } from "../members/member-role.enum";
import { PersonalClient } from "../personal-clients/personal-client.entity";
import { PersonalClientStatus } from "../personal-clients/personal-client-status.enum";
import { User } from "../users/user.entity";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { Invitation } from "./invitation.entity";
import { InvitationEmailService } from "./invitation-email.service";

const INVITATION_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

interface IssuedInvitation {
  id: string;
  invitedEmail: string;
  expiresAt: Date;
  token: string;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly invitationEmail: InvitationEmailService,
  ) {}

  async create(
    personalId: string,
    dto: CreateInvitationDto,
  ): Promise<{ id: string; email: string; expiresAt: Date }> {
    const email = dto.email.trim().toLowerCase();
    const issued = await this.issue(personalId, dto.memberId, email);
    await this.invitationEmail.sendInvitation(
      issued.invitedEmail,
      issued.token,
      issued.expiresAt,
    );
    return {
      id: issued.id,
      email: issued.invitedEmail,
      expiresAt: issued.expiresAt,
    };
  }

  async resend(
    personalId: string,
    invitationId: string,
  ): Promise<{ id: string; email: string; expiresAt: Date }> {
    const invitation = await this.dataSource
      .getRepository(Invitation)
      .findOneBy({ id: invitationId });
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }
    const relationship = await this.dataSource
      .getRepository(PersonalClient)
      .findOneBy({
        personalId,
        clientId: invitation.memberId,
      });
    if (!relationship) {
      throw new NotFoundException("Invitation not found");
    }
    if (invitation.acceptedAt || invitation.revokedAt) {
      throw new ConflictException("This invitation cannot be resent");
    }

    const issued = await this.issue(
      personalId,
      invitation.memberId,
      invitation.invitedEmail,
    );
    await this.invitationEmail.sendInvitation(
      issued.invitedEmail,
      issued.token,
      issued.expiresAt,
    );
    return {
      id: issued.id,
      email: issued.invitedEmail,
      expiresAt: issued.expiresAt,
    };
  }

  async revoke(
    personalId: string,
    invitationId: string,
  ): Promise<{ id: string; revoked: true }> {
    return this.dataSource.transaction(async (manager) => {
      const invitations = manager.getRepository(Invitation);
      const invitation = await invitations.findOne({
        where: { id: invitationId },
        lock: { mode: "pessimistic_write" },
      });
      if (!invitation) {
        throw new NotFoundException("Invitation not found");
      }

      const relationship = await manager
        .getRepository(PersonalClient)
        .findOneBy({
          personalId,
          clientId: invitation.memberId,
        });
      if (!relationship) {
        throw new NotFoundException("Invitation not found");
      }
      if (invitation.acceptedAt) {
        throw new ConflictException("An accepted invitation cannot be revoked");
      }
      if (!invitation.revokedAt) {
        invitation.revokedAt = new Date();
        await invitations.save(invitation);
      }

      return { id: invitation.id, revoked: true };
    });
  }

  async accept(
    dto: AcceptInvitationDto,
  ): Promise<{ accepted: true; memberId: string; userId: string }> {
    const tokenHash = this.hashToken(dto.token);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const invitations = manager.getRepository(Invitation);
        const invitationPreview = await invitations.findOneBy({ tokenHash });
        if (!invitationPreview) {
          throw new BadRequestException("Invalid invitation");
        }
        const members = manager.getRepository(Member);
        const member = await members.findOne({
          where: {
            id: invitationPreview.memberId,
            role: MemberRole.CLIENT,
          },
          lock: { mode: "pessimistic_write" },
        });
        const invitation = await invitations.findOne({
          where: { tokenHash },
          lock: { mode: "pessimistic_write" },
        });
        if (!invitation) {
          throw new BadRequestException("Invalid invitation");
        }
        if (invitation.acceptedAt || invitation.revokedAt) {
          throw new GoneException("This invitation is no longer available");
        }
        if (invitation.expiresAt <= new Date()) {
          throw new GoneException("This invitation has expired");
        }

        if (!member || member.id !== invitation.memberId || member.userId) {
          throw new ConflictException("This client account is already active");
        }

        const activeRelationship = await manager
          .getRepository(PersonalClient)
          .findOne({
            where: {
              clientId: member.id,
              status: PersonalClientStatus.ACTIVE,
            },
            lock: { mode: "pessimistic_write" },
          });
        if (!activeRelationship) {
          throw new ConflictException(
            "The client no longer has an active personal trainer",
          );
        }

        const email = invitation.invitedEmail.trim().toLowerCase();
        if (dto.email.trim().toLowerCase() !== email) {
          throw new BadRequestException(
            "The email does not match the invited address",
          );
        }
        const users = manager.getRepository(User);
        if (await users.findOneBy({ email })) {
          throw new ConflictException(
            "An account with this email already exists",
          );
        }

        const user = await users.save(
          users.create({
            email,
            passwordHash: await argon2.hash(dto.password, {
              type: argon2.argon2id,
            }),
            isActive: true,
            emailVerifiedAt: new Date(),
          }),
        );
        member.userId = user.id;
        await members.save(member);

        invitation.acceptedAt = new Date();
        await invitations.save(invitation);

        return { accepted: true, memberId: member.id, userId: user.id };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "An account with this email already exists",
        );
      }
      throw error;
    }
  }

  private async issue(
    personalId: string,
    memberId: string,
    email: string,
  ): Promise<IssuedInvitation> {
    return this.dataSource.transaction(async (manager) => {
      const member = await manager.getRepository(Member).findOne({
        where: { id: memberId, role: MemberRole.CLIENT },
        lock: { mode: "pessimistic_write" },
      });
      if (!member) {
        throw new NotFoundException("Client not found");
      }

      const relationship = await manager.getRepository(PersonalClient).findOne({
        where: {
          personalId,
          clientId: memberId,
          status: PersonalClientStatus.ACTIVE,
        },
        lock: { mode: "pessimistic_write" },
      });
      if (!relationship) {
        throw new NotFoundException("Client not found in your active wallet");
      }
      if (member.userId) {
        throw new ConflictException("This client already has an account");
      }

      const invitations = manager.getRepository(Invitation);
      const now = new Date();
      await invitations
        .createQueryBuilder()
        .update(Invitation)
        .set({ revokedAt: now })
        .where(
          '"member_id" = :memberId AND "accepted_at" IS NULL AND "revoked_at" IS NULL',
          { memberId },
        )
        .execute();

      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(now.getTime() + INVITATION_VALIDITY_MS);
      const invitation = await invitations.save(
        invitations.create({
          memberId,
          invitedEmail: email,
          tokenHash: this.hashToken(token),
          expiresAt,
          acceptedAt: null,
          revokedAt: null,
        }),
      );

      return {
        id: invitation.id,
        invitedEmail: invitation.invitedEmail,
        expiresAt: invitation.expiresAt,
        token,
      };
    });
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
