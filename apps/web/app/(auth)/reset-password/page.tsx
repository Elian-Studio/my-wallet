'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { verifyIdentity, resetPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, CheckCircle } from 'lucide-react';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

type Step = 'verify' | 'reset' | 'done';

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('verify');

  // Step 1 state
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyName, setVerifyName] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Step 2 state
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setVerifyError('');
    setIsVerifying(true);

    try {
      const result = await verifyIdentity(verifyEmail, verifyName);
      if (result.verified) {
        setStep('reset');
      } else {
        setVerifyError('이메일 또는 이름이 일치하지 않습니다.');
      }
    } catch {
      setVerifyError('이메일 또는 이름이 일치하지 않습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!newPassword) {
      setResetError('새 비밀번호를 입력해주세요.');
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      setResetError('비밀번호는 8자 이상, 대문자, 소문자, 숫자를 모두 포함해야 합니다.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setResetError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword({
        email: verifyEmail,
        name: verifyName,
        newPassword,
        newPasswordConfirm,
      });
      setStep('done');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <Wallet className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">My Wallet</CardTitle>
        <CardDescription>
          {step === 'verify' && '본인 확인 후 비밀번호를 재설정하세요'}
          {step === 'reset' && '새 비밀번호를 설정하세요'}
          {step === 'done' && '비밀번호가 변경되었습니다'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="verifyEmail" className="text-sm font-medium">
                이메일
              </label>
              <Input
                id="verifyEmail"
                type="email"
                placeholder="name@example.com"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isVerifying}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="verifyName" className="text-sm font-medium">
                이름
              </label>
              <Input
                id="verifyName"
                type="text"
                placeholder="홍길동"
                value={verifyName}
                onChange={(e) => setVerifyName(e.target.value)}
                required
                autoComplete="name"
                disabled={isVerifying}
              />
            </div>

            {verifyError && (
              <p className="text-sm text-destructive" role="alert">
                {verifyError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? '처리 중...' : '본인 확인'}
            </Button>

            <p className="text-center text-sm">
              <Link href="/login" className="text-muted-foreground underline-offset-4 hover:underline">
                로그인으로 돌아가기
              </Link>
            </p>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="confirmedEmail" className="text-sm font-medium">
                이메일
              </label>
              <Input
                id="confirmedEmail"
                type="email"
                value={verifyEmail}
                disabled
                readOnly
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                새 비밀번호
              </label>
              <Input
                id="newPassword"
                type="password"
                placeholder="새 비밀번호를 입력하세요"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isResetting}
              />
              <p className="text-xs text-muted-foreground">8자 이상, 대소문자 + 숫자 포함</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="newPasswordConfirm" className="text-sm font-medium">
                새 비밀번호 확인
              </label>
              <Input
                id="newPasswordConfirm"
                type="password"
                placeholder="새 비밀번호를 다시 입력하세요"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isResetting}
              />
            </div>

            {resetError && (
              <p className="text-sm text-destructive" role="alert">
                {resetError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isResetting}>
              {isResetting ? '처리 중...' : '비밀번호 변경'}
            </Button>

            <p className="text-center text-sm">
              <Link href="/login" className="text-muted-foreground underline-offset-4 hover:underline">
                로그인으로 돌아가기
              </Link>
            </p>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm text-muted-foreground">
                비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              로그인 페이지로 이동
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
