import { Exclude } from 'class-transformer'; // dùng để exclude thằng pw khi trả về json
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid') // Dùng UUID bảo mật hơn số thứ tự tăng dần
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  fullName: string; // Họ và tên

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude() //  Tự động loại bỏ khi trả về JSON
  password: string;

  @Column({ nullable: true }) // Cho phép null ban đầu
  avatar: string; // Lưu đường dẫn URL của ảnh

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
