import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '이메일은 필수 입력입니다.' })
  email: string;

  @ApiProperty({ description: '비밀번호', example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: '비밀번호는 필수 입력입니다.' })
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '이메일은 필수 입력입니다.' })
  email: string;

  @ApiProperty({ description: '비밀번호 (최소 8자, 대소문자 및 숫자 포함)', example: 'Password1' })
  @IsString()
  @IsNotEmpty({ message: '비밀번호는 필수 입력입니다.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: '비밀번호는 최소 8자 이상이며 대문자, 소문자, 숫자를 각각 하나 이상 포함해야 합니다.',
  })
  password: string;

  @ApiProperty({ description: '비밀번호 확인', example: 'Password1' })
  @IsString()
  @IsNotEmpty({ message: '비밀번호 확인은 필수 입력입니다.' })
  passwordConfirm: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty({ message: '이름은 필수 입력입니다.' })
  name: string;
}
