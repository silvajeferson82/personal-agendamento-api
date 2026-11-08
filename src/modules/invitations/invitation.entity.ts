import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Member } from "../members/member.entity";

@Entity("invitations")
@Index("UQ_invitations_token_hash", ["tokenHash"], { unique: true })
export class Invitation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "member_id", type: "uuid" })
  memberId!: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "member_id" })
  member?: Member;

  @Column({ name: "invited_email", type: "varchar", length: 255 })
  invitedEmail!: string;

  @Column({ name: "token_hash", type: "varchar", length: 64 })
  tokenHash!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "accepted_at", type: "timestamptz", nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
