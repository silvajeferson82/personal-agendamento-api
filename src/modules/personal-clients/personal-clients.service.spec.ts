import { DataSource, Repository } from "typeorm";
import { Invitation } from "../invitations/invitation.entity";
import { PersonalClient } from "./personal-client.entity";
import { PersonalClientStatus } from "./personal-client-status.enum";
import { PersonalClientsService } from "./personal-clients.service";

describe("PersonalClientsService", () => {
  it("deactivates a relationship without deleting its history", async () => {
    const relationship = {
      id: "relationship-id",
      personalId: "personal-id",
      clientId: "client-id",
      status: PersonalClientStatus.ACTIVE,
    } as PersonalClient;
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const relationships = {
      findOne: jest.fn().mockResolvedValue(relationship),
      save: jest.fn().mockResolvedValue(relationship),
    };
    const invitations = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const manager = {
      getRepository: jest.fn(
        (entity: typeof PersonalClient | typeof Invitation) =>
          entity === PersonalClient ? relationships : invitations,
      ),
    };
    const dataSource = {
      transaction: jest.fn(
        (work: (transactionManager: typeof manager) => Promise<unknown>) =>
          work(manager),
      ),
    } as unknown as DataSource;
    const service = new PersonalClientsService(dataSource);

    await expect(
      service.deactivate("personal-id", "client-id"),
    ).resolves.toEqual({
      id: "client-id",
      status: PersonalClientStatus.INACTIVE,
    });

    expect(relationships.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "relationship-id",
        status: PersonalClientStatus.INACTIVE,
      }),
    );
    expect(queryBuilder.where).toHaveBeenCalledWith(
      expect.stringContaining('"member_id" = :clientId'),
      { clientId: "client-id" },
    );
  });
});
