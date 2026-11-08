import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { DataSource } from "typeorm";
import { isUniqueViolation } from "../../database/is-unique-violation";
import { Member } from "../members/member.entity";
import { MemberRole } from "../members/member-role.enum";
import { User } from "../users/user.entity";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshToken } from "./refresh-token.entity";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

interface JwtPayload {
  sub: string;
  memberId: string;
  role: MemberRole;
}

function durationInSeconds(value: string): number {
  const match = /^([1-9]\d*)([smhd])$/.exec(value);
  if (!match) {
    throw new Error("Invalid JWT duration configuration");
  }
  const amount = Number(match[1]);
  const unitSeconds: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return amount * unitSeconds[match[2]];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      return await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const members = manager.getRepository(Member);
        const createdUser = await users.save(
          users.create({ email, passwordHash }),
        );
        await members.save(
          members.create({
            userId: createdUser.id,
            name: dto.name.trim(),
            phone: dto.phone.trim(),
            role: MemberRole.PERSONAL,
          }),
        );
        const user = await users.findOneOrFail({
          where: { id: createdUser.id },
          relations: { member: true },
        });
        return this.createTokenPair(user, manager);
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

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { email: dto.email.trim().toLowerCase() },
      relations: { member: true },
    });
    if (
      !user ||
      !user.isActive ||
      !user.passwordHash ||
      !user.member ||
      !(await argon2.verify(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.createTokenPair(user);
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawToken);
    return this.dataSource.transaction(async (manager) => {
      const tokens = manager.getRepository(RefreshToken);
      const storedToken = await tokens.findOne({
        where: { tokenHash },
        lock: { mode: "pessimistic_write" },
      });
      if (
        !storedToken ||
        storedToken.revokedAt ||
        storedToken.expiresAt <= new Date()
      ) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      const user = await manager.getRepository(User).findOne({
        where: { id: storedToken.userId },
        relations: { member: true },
      });
      if (!user?.isActive || !user.member) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      storedToken.revokedAt = new Date();
      await tokens.save(storedToken);
      return this.createTokenPair(user, manager);
    });
  }

  async logout(userId: string, rawToken: string): Promise<{ loggedOut: true }> {
    const tokens = this.dataSource.getRepository(RefreshToken);
    const storedToken = await tokens.findOneBy({
      userId,
      tokenHash: this.hashToken(rawToken),
    });
    if (storedToken && !storedToken.revokedAt) {
      storedToken.revokedAt = new Date();
      await tokens.save(storedToken);
    }
    return { loggedOut: true };
  }

  private async createTokenPair(
    user: User,
    manager = this.dataSource.manager,
  ): Promise<TokenPair> {
    if (!user.member) {
      throw new UnauthorizedException("User profile is not available");
    }
    const accessTtl = this.config.getOrThrow<string>("JWT_EXPIRES_IN");
    const refreshTtl = this.config.getOrThrow<string>("JWT_REFRESH_EXPIRES_IN");
    const payload: JwtPayload = {
      sub: user.id,
      memberId: user.member.id,
      role: user.member.role,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: durationInSeconds(accessTtl),
    });
    const refreshToken = randomBytes(32).toString("base64url");
    const expiresIn = durationInSeconds(refreshTtl);
    const tokens = manager.getRepository(RefreshToken);
    await tokens.save(
      tokens.create({
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        revokedAt: null,
      }),
    );
    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: durationInSeconds(accessTtl),
    };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
