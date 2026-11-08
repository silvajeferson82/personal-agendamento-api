import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { isUniqueViolation } from "../../database/is-unique-violation";
import { Member } from "../members/member.entity";
import { MemberRole } from "../members/member-role.enum";
import { Invitation } from "../invitations/invitation.entity";
import { CreateMemberDto } from "./dto/create-member.dto";
import { ListMembersDto } from "./dto/list-members.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { PersonalClient } from "./personal-client.entity";
import { PersonalClientStatus } from "./personal-client-status.enum";

@Injectable()
export class PersonalClientsService {
  constructor(private readonly dataSource: DataSource) {}

  async create(
    personalId: string,
    dto: CreateMemberDto,
  ): Promise<{
    id: string;
    name: string;
    phone: string;
    status: PersonalClientStatus;
  }> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const members = manager.getRepository(Member);
        const member = await members.save(
          members.create({
            userId: null,
            name: dto.name.trim(),
            phone: dto.phone.trim(),
            role: MemberRole.CLIENT,
          }),
        );
        const personalClients = manager.getRepository(PersonalClient);
        await personalClients.save(
          personalClients.create({
            personalId,
            clientId: member.id,
            status: PersonalClientStatus.ACTIVE,
          }),
        );

        return {
          id: member.id,
          name: member.name,
          phone: member.phone,
          status: PersonalClientStatus.ACTIVE,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "The client already has an active personal trainer",
        );
      }
      throw error;
    }
  }

  async findAll(
    personalId: string,
    query: ListMembersDto,
  ): Promise<
    Array<{
      id: string;
      name: string;
      phone: string;
      status: PersonalClientStatus;
      createdAt: Date;
    }>
  > {
    const relationships = await this.dataSource
      .getRepository(PersonalClient)
      .find({
        where: {
          personalId,
          status: query.status ?? PersonalClientStatus.ACTIVE,
        },
        relations: { client: true },
        order: { createdAt: "DESC" },
      });

    return relationships.map(({ client, status, createdAt }) => ({
      id: client!.id,
      name: client!.name,
      phone: client!.phone,
      status,
      createdAt,
    }));
  }

  async findOne(
    personalId: string,
    clientId: string,
  ): Promise<{
    id: string;
    name: string;
    phone: string;
    status: PersonalClientStatus;
    createdAt: Date;
  }> {
    const relationship = await this.dataSource
      .getRepository(PersonalClient)
      .findOne({
        where: { personalId, clientId },
        relations: { client: true },
      });
    if (!relationship?.client) {
      throw new NotFoundException("Client not found in your wallet");
    }

    return {
      id: relationship.client.id,
      name: relationship.client.name,
      phone: relationship.client.phone,
      status: relationship.status,
      createdAt: relationship.createdAt,
    };
  }

  async update(
    personalId: string,
    clientId: string,
    dto: UpdateMemberDto,
  ): Promise<{
    id: string;
    name: string;
    phone: string;
    status: PersonalClientStatus;
  }> {
    const relationship = await this.dataSource
      .getRepository(PersonalClient)
      .findOneBy({ personalId, clientId });
    if (!relationship) {
      throw new NotFoundException("Client not found in your wallet");
    }

    const members = this.dataSource.getRepository(Member);
    const member = await members.findOneBy({
      id: clientId,
      role: MemberRole.CLIENT,
    });
    if (!member) {
      throw new NotFoundException("Client not found in your wallet");
    }

    if (dto.name !== undefined) member.name = dto.name.trim();
    if (dto.phone !== undefined) member.phone = dto.phone.trim();
    await members.save(member);

    return {
      id: member.id,
      name: member.name,
      phone: member.phone,
      status: relationship.status,
    };
  }

  async deactivate(
    personalId: string,
    clientId: string,
  ): Promise<{ id: string; status: PersonalClientStatus }> {
    return this.dataSource.transaction(async (manager) => {
      const relationships = manager.getRepository(PersonalClient);
      const relationship = await relationships.findOne({
        where: { personalId, clientId },
        lock: { mode: "pessimistic_write" },
      });
      if (!relationship) {
        throw new NotFoundException("Client not found in your wallet");
      }

      relationship.status = PersonalClientStatus.INACTIVE;
      await relationships.save(relationship);

      await manager
        .getRepository(Invitation)
        .createQueryBuilder()
        .update(Invitation)
        .set({ revokedAt: new Date() })
        .where(
          '"member_id" = :clientId AND "accepted_at" IS NULL AND "revoked_at" IS NULL',
          { clientId },
        )
        .execute();

      return { id: clientId, status: relationship.status };
    });
  }
}
