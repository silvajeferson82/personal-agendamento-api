import { MemberRole } from "../../members/member-role.enum";

export interface AuthenticatedUser {
  userId: string;
  memberId: string;
  role: MemberRole;
}
