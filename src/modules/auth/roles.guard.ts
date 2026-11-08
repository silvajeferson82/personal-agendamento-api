import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AuthenticatedUser } from "./interfaces/authenticated-user.interface";
import { ROLES_KEY } from "./roles.decorator";
import { MemberRole } from "../members/member-role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    return requiredRoles.includes(request.user.role);
  }
}
