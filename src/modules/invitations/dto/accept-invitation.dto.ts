import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length, MaxLength } from "class-validator";

export class AcceptInvitationDto {
  @ApiProperty({ minLength: 32, maxLength: 128 })
  @IsString()
  @Length(32, 128)
  token!: string;

  @ApiProperty({ example: "aluno@example.com", maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "SenhaSegura123!", minLength: 12, maxLength: 128 })
  @IsString()
  @Length(12, 128)
  password!: string;
}
