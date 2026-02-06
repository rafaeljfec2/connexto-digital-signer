import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../entities/user.entity';

export interface CreateUserInput {
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  password: string;
}

export interface CreatedUserWithPassword {
  user: User;
  password: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = this.userRepository.create({
      tenantId: input.tenantId,
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash,
      isActive: true,
    });
    return this.userRepository.save(user);
  }

  async createOwner(tenantId: string, email: string, name: string, password: string): Promise<User> {
    return this.create({
      tenantId,
      email,
      name,
      role: UserRole.OWNER,
      password,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByTenantId(tenantId: string): Promise<User[]> {
    return this.userRepository.find({ where: { tenantId } });
  }
}
