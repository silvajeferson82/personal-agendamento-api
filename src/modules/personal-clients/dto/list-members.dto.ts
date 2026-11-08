import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { PersonalClientStatus } from "../personal-client-status.enum";

export class ListMembersDto {
  @ApiPropertyOptional({ enum: PersonalClientStatus, default: "ACTIVE" })
  @IsOptional()
  @IsEnum(PersonalClientStatus)
  status?: PersonalClientStatus;
}
