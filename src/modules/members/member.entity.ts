import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { MemberRole } from "./member-role.enum";

@Entity("members")
@Check("\"role\" IN ('PERSONAL', 'CLIENT')")
@Check('"role" <> \'PERSONAL\' OR "user_id" IS NOT NULL')
export class Member {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid", nullable: true, unique: true })
  userId!: string | null;

  @OneToOne(() => User, (user) => user.member, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "varchar", length: 20 })
  role!: MemberRole;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
