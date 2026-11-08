import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Member } from "../members/member.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({
    name: "password_hash",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  passwordHash!: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({
    name: "email_verified_at",
    type: "timestamptz",
    nullable: true,
  })
  emailVerifiedAt!: Date | null;

  @OneToOne(() => Member, (member) => member.user)
  member?: Member;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
