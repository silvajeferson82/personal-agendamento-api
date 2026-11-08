import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsUUID, MaxLength } from "class-validator";

export class CreateInvitationDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ example: "aluno@example.com", maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
