import { IsEmail, IsString, Length, Matches, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "pessoa@example.com", maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "SenhaSegura123!", minLength: 12, maxLength: 128 })
  @IsString()
  @Length(12, 128)
  password!: string;

  @ApiProperty({ example: "Maria Silva", minLength: 2, maxLength: 150 })
  @IsString()
  @Length(2, 150)
  name!: string;

  @ApiProperty({
    example: "+55 (11) 99999-9999",
    minLength: 8,
    maxLength: 20,
    pattern: "^[+0-9()\\-\\s]+$",
  })
  @IsString()
  @Length(8, 20)
  @Matches(/^[+0-9()\-\s]+$/)
  phone!: string;
}
