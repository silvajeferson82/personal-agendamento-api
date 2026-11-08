import { BadRequestException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { DataSource, EntityManager } from "typeorm";
import { Member } from "../members/member.entity";
import { MemberRole } from "../members/member-role.enum";
import { PersonalClient } from "../personal-clients/personal-client.entity";
import { PersonalClientStatus } from "../personal-clients/personal-client-status.enum";
import { User } from "../users/user.entity";
import { Invitation } from "./invitation.entity";
import { InvitationEmailService } from "./invitation-email.service";
import { InvitationsService } from "./invitations.service";

describe("InvitationsService", () => {
  it("stores only a token hash and sends the raw token to the invited email", async () => {
    const savedInvitation = {
      id: "invitation-id",
      invitedEmail: "client@example.com",
      expiresAt: new Date(Date.now() + 60_000),
    };
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const invitations = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      create: jest.fn((value: Partial<Invitation>) => value),
      save: jest.fn().mockResolvedValue(savedInvitation),
    };
    const members = {
      findOne: jest.fn().mockResolvedValue({
        id: "client-id",
        userId: null,
        role: MemberRole.CLIENT,
      }),
    };
    const personalClients = {
      findOneBy: jest.fn().mockResolvedValue({
        status: PersonalClientStatus.ACTIVE,
      }),
      findOne: jest.fn().mockResolvedValue({
        status: PersonalClientStatus.ACTIVE,
      }),
    };
    const manager = {
      getRepository: jest.fn(
        (entity: typeof Invitation | typeof Member | typeof PersonalClient) => {
          if (entity === Invitation) return invitations;
          if (entity === Member) return members;
          return personalClients;
        },
      ),
    };
    const dataSource = {
      transaction: jest.fn(
        (work: (transactionManager: EntityManager) => Promise<unknown>) =>
          work(manager as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const invitationEmail = {
      sendInvitation: jest.fn().mockResolvedValue(undefined),
    } as unknown as InvitationEmailService;
    const service = new InvitationsService(dataSource, invitationEmail);

    const result = await service.create("personal-id", {
      memberId: "client-id",
      email: " Client@Example.com ",
    });

    const savedValues = invitations.create.mock
      .calls[0][0] as Partial<Invitation>;
    const sentToken = (invitationEmail.sendInvitation as jest.Mock).mock
      .calls[0][1] as string;
    expect(savedValues).toEqual(
      expect.objectContaining({
        invitedEmail: "client@example.com",
        tokenHash: createHash("sha256").update(sentToken).digest("hex"),
      }),
    );
    expect(savedValues.tokenHash).not.toBe(sentToken);
    expect(result).toEqual({
      id: "invitation-id",
      email: "client@example.com",
      expiresAt: savedInvitation.expiresAt,
    });
  });

  it("marks the invitation accepted and creates the client account transactionally", async () => {
    const invitation = {
      id: "invitation-id",
      memberId: "client-id",
      invitedEmail: "client@example.com",
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      revokedAt: null,
    } as Invitation;
    const member = {
      id: "client-id",
      userId: null,
      role: MemberRole.CLIENT,
    } as Member;
    const invitations = {
      findOneBy: jest.fn().mockResolvedValue(invitation),
      findOne: jest.fn().mockResolvedValue(invitation),
      save: jest.fn().mockResolvedValue(invitation),
    };
    const members = {
      findOne: jest.fn().mockResolvedValue(member),
      save: jest.fn().mockResolvedValue(member),
    };
    const personalClients = {
      findOneBy: jest.fn().mockResolvedValue({
        status: PersonalClientStatus.ACTIVE,
      }),
      findOne: jest.fn().mockResolvedValue({
        status: PersonalClientStatus.ACTIVE,
      }),
    };
    const users = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: Partial<User>) => value),
      save: jest
        .fn()
        .mockImplementation((user: Partial<User>) =>
          Promise.resolve({ ...user, id: "user-id" }),
        ),
    };
    const manager = {
      getRepository: jest.fn(
        (
          entity:
            | typeof Invitation
            | typeof Member
            | typeof PersonalClient
            | typeof User,
        ) => {
          if (entity === Invitation) return invitations;
          if (entity === Member) return members;
          if (entity === PersonalClient) return personalClients;
          return users;
        },
      ),
    };
    const dataSource = {
      transaction: jest.fn(
        (work: (transactionManager: EntityManager) => Promise<unknown>) =>
          work(manager as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const invitationEmail = {
      sendInvitation: jest.fn(),
    } as unknown as InvitationEmailService;
    const service = new InvitationsService(dataSource, invitationEmail);
    const token = "valid-invitation-token-with-enough-length";

    await expect(
      service.accept({
        token,
        email: "someone-else@example.com",
        password: "A-strong-password-123",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(users.save).not.toHaveBeenCalled();

    await expect(
      service.accept({
        token,
        email: "CLIENT@example.com",
        password: "A-strong-password-123",
      }),
    ).resolves.toEqual({
      accepted: true,
      memberId: "client-id",
      userId: "user-id",
    });

    expect(invitations.findOneBy).toHaveBeenCalledWith({
      tokenHash: createHash("sha256").update(token).digest("hex"),
    });
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "client@example.com",
        passwordHash: expect.stringMatching(/^\$argon2id\$/),
      }),
    );
    expect(member.userId).toBe("user-id");
    expect(invitation.acceptedAt).toBeInstanceOf(Date);
    expect(dataSource.transaction).toHaveBeenCalledTimes(2);
  });
});
