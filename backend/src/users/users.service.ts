import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/database/prisma.service'; // Giả sử bạn đã có PrismaService
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

// Định nghĩa các trường muốn lấy về (loại bỏ password)
const userSelect = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // 1. Check trùng username/email
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Username hoặc Email đã tồn tại');
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // 3. Tạo user và trả về kết quả (không lấy password)
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      select: userSelect, // Chỉ trả về các trường an toàn
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: userSelect,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Nếu có update password thì phải hash lại
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
        select: userSelect,
      });
    } catch (error) {
      // Prisma error code P2025 là record not found
      if (error.code === 'P2025')
        throw new NotFoundException(`User with ID ${id} not found`);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025')
        throw new NotFoundException(`User with ID ${id} not found`);
      throw error;
    }
  }
}
