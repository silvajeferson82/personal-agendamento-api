import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";

@Controller()
@ApiTags("Status")
export class AppController {
  @Get()
  @ApiOperation({ summary: "Verifica se a API está disponível" })
  @ApiOkResponse({
    description: "API disponível.",
    schema: {
      type: "object",
      properties: { status: { type: "string", example: "ok" } },
      required: ["status"],
    },
  })
  getStatus(): { status: string } {
    return { status: "ok" };
  }
}
