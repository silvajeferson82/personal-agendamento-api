import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { MemberRole } from "../members/member-role.enum";
import { AuthenticatedUser } from "./interfaces/authenticated-user.interface";

interface JwtPayload {
  sub: string;
  memberId: string;
  role: MemberRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (
      typeof payload.sub !== "string" ||
      typeof payload.memberId !== "string" ||
      !Object.values(MemberRole).includes(payload.role)
    ) {
      throw new UnauthorizedException();
    }
    return {
      userId: payload.sub,
      memberId: payload.memberId,
      role: payload.role,
    };
  }
}
