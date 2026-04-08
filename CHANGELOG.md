# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0.0] - 2026-04-09

### Added
- 가계부: 거래내역 CRUD + 카테고리별 예산 설정 + 예산 대비 실적 분석 차트
- 가계부: 예산 올해 일괄 적용 (Preview + Apply + 12개월 체크리스트)
- 가계부: 대시보드 리디자인 (도넛차트, 최근 거래 5건, 예산 진행률 TOP 5)
- 가계부: 카드형 거래내역 (날짜 그루핑 + 카테고리 색상 뱃지 + 스켈레톤 UI)
- 가계부: 카테고리 CRUD API + 설정 페이지 카테고리 관리
- 가계부: 거래 추가 모달 shadcn Calendar + 금액 콤마 포맷
- 가계부: Optimistic update (거래 생성/수정/삭제 즉시 반영)
- 주식: 포트폴리오 관리 (계좌, 종목, 매매내역, FIFO 수익 계산)
- 주식: 실시간 주가 조회 + 보유 종목 평가손익
- 통합 대시보드: 가계부 + 주식 핵심 지표 한눈에 확인
- 인증: 회원가입 + 로그인 + 비밀번호 재설정 + JWT 인증
- 인증: 비밀번호 규칙 강화 (8자 이상, 영문+숫자+특수문자)
- Notion 데이터 마이그레이션 API (거래내역, 매매내역, 예산)
- Render 배포: API + Web 서비스, 헬스체크, standalone 빌드
- E2E 테스트: Playwright 환경 + 4개 도메인 70개 테스트 스펙
- 단위 테스트: 224개 (NestJS 서비스/컨트롤러 전체)
