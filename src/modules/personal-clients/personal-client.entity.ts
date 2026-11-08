import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Member } from "../members/member.entity";
import { PersonalClientStatus } from "./personal-client-status.enum";

@Entity("personal_clients")
@Unique("UQ_personal_clients_personal_client", ["personalId", "clientId"])
@Check("\"status\" IN ('ACTIVE', 'INACTIVE')")
export class PersonalClient {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "personal_id", type: "uuid" })
  personalId!: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "personal_id" })
  personal?: Member;

  @Column({ name: "client_id", type: "uuid" })
  clientId!: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "client_id" })
  client?: Member;

  @Column({ type: "varchar", length: 20 })
  status!: PersonalClientStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
