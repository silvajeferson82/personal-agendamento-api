import { ApiProperty } from "@nestjs/swagger";
import { MemberRole } from "../../members/member-role.enum";

export class TokenPairResponseDto {
  @ApiProperty({ description: "JWT de acesso.", example: "eyJhbGciOi..." })
  accessToken!: string;

  @ApiProperty({ description: "Token para renovar a sessão." })
  refreshToken!: string;

  @ApiProperty({ enum: ["Bearer"], example: "Bearer" })
  tokenType!: "Bearer";

  @ApiProperty({
    description: "Duração do token de acesso em segundos.",
    example: 900,
  })
  expiresIn!: number;
}

export class AuthenticatedUserResponseDto {
  @ApiProperty({ format: "uuid" })
  userId!: string;

  @ApiProperty({ format: "uuid" })
  memberId!: string;

  @ApiProperty({ enum: MemberRole, example: MemberRole.PERSONAL })
  role!: MemberRole;
}

export class LogoutResponseDto {
  @ApiProperty({ enum: [true], example: true })
  loggedOut!: true;
}
