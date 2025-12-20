import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  username: string;
  fullName: string;
  email: string;

  @Exclude()
  password: string;

  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}
