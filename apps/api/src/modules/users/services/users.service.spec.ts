import { UsersService } from './users.service';
import type { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

const buildUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'owner@acme.com',
  passwordHash: 'hash-1',
  name: 'Owner',
  role: UserRole.OWNER,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;
    service = new UsersService(userRepository);
  });

  test('should create user with hashed password', async () => {
    jest.mocked(bcrypt.hash).mockResolvedValue('hash-1');
    const created = buildUser({ passwordHash: 'hash-1' });
    userRepository.create.mockReturnValue(created);
    userRepository.save.mockResolvedValue(created);

    const result = await service.create({
      tenantId: 'tenant-1',
      email: 'owner@acme.com',
      name: 'Owner',
      role: UserRole.OWNER,
      password: 'secret',
    });

    expect(result.passwordHash).toBe('hash-1');
  });

  test('should find user by email', async () => {
    const user = buildUser();
    userRepository.findOne.mockResolvedValue(user);

    await expect(service.findByEmail('owner@acme.com')).resolves.toEqual(user);
  });

  test('should find user by id', async () => {
    const user = buildUser();
    userRepository.findOne.mockResolvedValue(user);

    await expect(service.findOne('user-1')).resolves.toEqual(user);
  });
});
