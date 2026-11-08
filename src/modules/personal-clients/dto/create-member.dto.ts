import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";

export class CreateMemberDto {
  @ApiProperty({ example: "Maria Silva", minLength: 2, maxLength: 150 })
  @IsString()
  @Length(2, 150)
  name!: string;

  @ApiProperty({
    example: "+55 (11) 99999-9999",
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @Length(8, 20)
  @Matches(/^[+0-9()\-\s]+$/)
  phone!: string;
}
