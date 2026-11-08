import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiProperty({
    description: "Refresh token emitido no registro, login ou renovação.",
    minLength: 40,
    maxLength: 100,
  })
  @IsString()
  @Length(40, 100)
  refreshToken!: string;
}
