import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    verifyIdentity: jest.fn(),
    resetPassword: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('register DTO를 AuthService.register에 위임하고 결과를 반환한다', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'Password1',
        passwordConfirm: 'Password1',
        name: '김철수',
      };
      const expected = {
        user: { id: 'uid', email: dto.email, name: dto.name, createdAt: new Date() },
        accessToken: 'token',
      };

      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /auth/login', () => {
    it('login DTO를 AuthService.login에 위임하고 결과를 반환한다', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const expected = {
        user: { id: 'uid', email: dto.email, name: '홍길동' },
        accessToken: 'token',
      };

      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /auth/verify-identity', () => {
    it('verifyIdentity DTO를 AuthService.verifyIdentity에 위임하고 결과를 반환한다', async () => {
      const dto = { email: 'test@example.com', name: '홍길동' };
      const expected = { verified: true, email: dto.email };

      mockAuthService.verifyIdentity.mockResolvedValue(expected);

      const result = await controller.verifyIdentity(dto);

      expect(authService.verifyIdentity).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('resetPassword DTO를 AuthService.resetPassword에 위임하고 결과를 반환한다', async () => {
      const dto = {
        email: 'test@example.com',
        name: '홍길동',
        newPassword: 'NewPassword1',
        newPasswordConfirm: 'NewPassword1',
      };
      const expected = { reset: true };

      mockAuthService.resetPassword.mockResolvedValue(expected);

      const result = await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('GET /auth/profile', () => {
    it('req.user.id를 AuthService.getProfile에 위임하고 결과를 반환한다', async () => {
      const req = { user: { id: 'user-id-1' } };
      const expected = {
        id: 'user-id-1',
        email: 'test@example.com',
        name: '홍길동',
        createdAt: new Date(),
      };

      mockAuthService.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile(req);

      expect(authService.getProfile).toHaveBeenCalledWith(req.user.id);
      expect(result).toEqual(expected);
    });

    it('JwtAuthGuard가 profile 엔드포인트에 적용되어 있다', () => {
      const guards = Reflect.getMetadata('__guards__', AuthController.prototype.getProfile);
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
    });
  });
});
