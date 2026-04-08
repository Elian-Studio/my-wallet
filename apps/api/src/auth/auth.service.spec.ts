import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-id-1',
    email: 'test@example.com',
    password: 'hashed_password',
    name: '홍길동',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const jwtMock = {
      sign: jest.fn().mockReturnValue('mock_jwt_token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register()', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'Password1',
      passwordConfirm: 'Password1',
      name: '김철수',
    };

    it('성공적으로 회원가입하고 accessToken을 반환한다', async () => {
      const createdUser = {
        id: 'new-user-id',
        email: registerDto.email,
        name: registerDto.name,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');
      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({ user: createdUser, accessToken: 'mock_jwt_token' });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          password: 'hashed_pw',
          name: registerDto.name,
        },
        select: { id: true, email: true, name: true, createdAt: true },
      });
    });

    it('이미 존재하는 이메일이면 ConflictException을 던진다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('passwordConfirm이 password와 다르면 BadRequestException을 던진다', async () => {
      const dto = { ...registerDto, passwordConfirm: 'DifferentPass1' };

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login()', () => {
    const loginDto = { email: 'test@example.com', password: 'correct_password' };

    it('올바른 자격증명으로 로그인하면 accessToken을 반환한다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: { id: mockUser.id, email: mockUser.email, name: mockUser.name },
        accessToken: 'mock_jwt_token',
      });
    });

    it('비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('존재하지 않는 이메일이면 UnauthorizedException을 던진다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyIdentity()', () => {
    const verifyDto = { email: 'test@example.com', name: '홍길동' };

    it('이메일과 이름이 일치하면 verified: true를 반환한다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.verifyIdentity(verifyDto);

      expect(result).toEqual({ verified: true, email: mockUser.email });
    });

    it('이름이 일치하지 않으면 NotFoundException을 던진다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.verifyIdentity({ email: 'test@example.com', name: '다른이름' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('이메일로 사용자를 찾을 수 없으면 NotFoundException을 던진다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyIdentity(verifyDto)).rejects.toThrow(NotFoundException);
    });

    it('이름 비교 시 대소문자와 앞뒤 공백을 무시한다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.verifyIdentity({ email: 'test@example.com', name: ' 홍길동 ' });

      expect(result).toEqual({ verified: true, email: mockUser.email });
    });
  });

  describe('resetPassword()', () => {
    const resetDto = {
      email: 'test@example.com',
      name: '홍길동',
      newPassword: 'NewPassword1',
      newPasswordConfirm: 'NewPassword1',
    };

    it('본인 확인 후 새 비밀번호로 성공적으로 변경하고 reset: true를 반환한다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_pw');
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, password: 'new_hashed_pw' });

      const result = await service.resetPassword(resetDto);

      expect(result).toEqual({ reset: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: resetDto.email },
        data: { password: 'new_hashed_pw' },
      });
    });

    it('이름이 일치하지 않으면 NotFoundException을 던진다 (본인 확인 실패)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.resetPassword({ ...resetDto, name: '다른이름' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('newPasswordConfirm이 newPassword와 다르면 BadRequestException을 던진다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.resetPassword({ ...resetDto, newPasswordConfirm: 'WrongPassword1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProfile()', () => {
    it('존재하는 사용자의 프로필을 반환한다', async () => {
      const profileData = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        createdAt: mockUser.createdAt,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(profileData);

      const result = await service.getProfile(mockUser.id);

      expect(result).toEqual(profileData);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { id: true, email: true, name: true, createdAt: true },
      });
    });

    it('존재하지 않는 사용자이면 UnauthorizedException을 던진다', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('non-existent-id')).rejects.toThrow(UnauthorizedException);
    });
  });
});
