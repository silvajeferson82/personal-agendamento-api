import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash } from "node:crypto";
import { DataSource, EntityManager } from "typeorm";
import { Member } from "../members/member.entity";
import { MemberRole } from "../members/member-role.enum";
import { User } from "../users/user.entity";
import { AuthService, TokenPair } from "./auth.service";
import { RefreshToken } from "./refresh-token.entity";

describe("AuthService", () => {
  it("normalizes the email and stores only an Argon2id hash on registration", async () => {
    const user = {
      id: "user-id",
      email: "trainer@example.com",
      passwordHash: "$argon2id$hash",
      isActive: true,
      member: {
        id: "member-id",
        role: MemberRole.PERSONAL,
      },
    } as User;
    const users = {
      create: jest.fn((value: Partial<User>) => value),
      save: jest.fn().mockResolvedValue(user),
      findOneOrFail: jest.fn().mockResolvedValue(user),
    };
    const members = {
      create: jest.fn((value: Partial<Member>) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const refreshTokens = {
      create: jest.fn((value: Partial<RefreshToken>) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const transactionManager = {
      getRepository: jest.fn(
        (entity: typeof User | typeof Member | typeof RefreshToken) => {
          if (entity === User) return users;
          if (entity === Member) return members;
          return refreshTokens;
        },
      ),
    };
    const dataSource = {
      transaction: jest.fn(
        (work: (manager: EntityManager) => Promise<TokenPair>) =>
          work(transactionManager as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue("signed-access-token"),
    } as unknown as JwtService;
    const config = {
      getOrThrow: jest.fn((key: string) =>
        key === "JWT_EXPIRES_IN" ? "15m" : "7d",
      ),
    } as unknown as ConfigService;
    const service = new AuthService(dataSource, jwtService, config);

    const result = await service.register({
      email: " Trainer@Example.com ",
      password: "a-secure-password",
      name: "Trainer",
      phone: "+5511999999999",
    });

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "trainer@example.com",
        passwordHash: expect.stringMatching(/^\$argon2id\$/),
      }),
    );
    expect(members.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-id",
        role: MemberRole.PERSONAL,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: "signed-access-token",
        tokenType: "Bearer",
        expiresIn: 900,
      }),
    );
    expect(refreshTokens.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-id",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it("revokes a used refresh token before issuing its replacement", async () => {
    const rawToken = "a-valid-refresh-token-value-123456789012345";
    const storedToken = {
      userId: "user-id",
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    } as RefreshToken;
    const user = {
      id: "user-id",
      isActive: true,
      member: { id: "member-id", role: MemberRole.PERSONAL },
    } as User;
    const tokens = {
      findOne: jest.fn().mockResolvedValue(storedToken),
      save: jest.fn().mockResolvedValue(storedToken),
      create: jest.fn((value: Partial<RefreshToken>) => value),
    };
    const users = {
      findOne: jest.fn().mockResolvedValue(user),
    };
    const manager = {
      getRepository: jest.fn((entity: typeof User | typeof RefreshToken) =>
        entity === User ? users : tokens,
      ),
    };
    const dataSource = {
      transaction: jest.fn(
        (work: (transactionManager: EntityManager) => Promise<unknown>) =>
          work(manager as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue("replacement-access-token"),
    } as unknown as JwtService;
    const config = {
      getOrThrow: jest.fn((key: string) =>
        key === "JWT_EXPIRES_IN" ? "15m" : "7d",
      ),
    } as unknown as ConfigService;
    const service = new AuthService(dataSource, jwtService, config);

    const result = await service.refresh(rawToken);

    expect(tokens.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tokenHash: createHash("sha256").update(rawToken).digest("hex"),
        },
        lock: { mode: "pessimistic_write" },
      }),
    );
    expect(users.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-id" },
      }),
    );
    expect(storedToken.revokedAt).toBeInstanceOf(Date);
    expect(tokens.save).toHaveBeenCalledWith(storedToken);
    expect(result.accessToken).toBe("replacement-access-token");
    expect(tokens.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-id",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });
});
