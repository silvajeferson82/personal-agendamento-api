import { IsEmail, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "pessoa@example.com", maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "SenhaSegura123!", maxLength: 128 })
  @IsString()
  @MaxLength(128)
  password!: string;
}
