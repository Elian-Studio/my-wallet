import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyIdentityDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty({ message: '이름은 필수 입력입니다.' })
  name: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty({ message: '이름은 필수 입력입니다.' })
  name: string;

  @ApiProperty({ description: '새 비밀번호 (최소 8자, 대소문자 및 숫자 포함)', example: 'NewPassword1' })
  @IsString()
  @IsNotEmpty({ message: '새 비밀번호는 필수 입력입니다.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: '비밀번호는 최소 8자 이상이며 대문자, 소문자, 숫자를 각각 하나 이상 포함해야 합니다.',
  })
  newPassword: string;

  @ApiProperty({ description: '새 비밀번호 확인', example: 'NewPassword1' })
  @IsString()
  @IsNotEmpty({ message: '새 비밀번호 확인은 필수 입력입니다.' })
  newPasswordConfirm: string;
}
