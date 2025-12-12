# Suggested Commands

## Development Commands
```bash
pnpm dev      # 개발 서버 실행 (http://localhost:3000)
pnpm build    # 프로덕션 빌드
pnpm lint     # ESLint 실행
pnpm start    # 프로덕션 서버 실행
```

## Database Setup (Supabase SQL Editor)
1. `supabase/schema.sql` - 기본 테이블 및 ENUM 생성
2. `supabase/alter_realtime_state.sql` - 실시간 상태 동기화 컬럼 추가
3. `supabase/add_rpc_functions.sql` - RPC 함수 (포인트 차감 등)

## Environment Variables
`.env.local` 파일에 설정:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

## Git Workflow
- **main**: 프로덕션 배포 (직접 커밋 금지)
- **develop**: 개발 메인 브랜치
- **feature/[task-name]**: 새 기능 개발
- **fix/[bug-name]**: 버그 수정

## Useful Commands
```bash
git status                    # 현재 상태 확인
git checkout develop          # develop 브랜치로 이동
git checkout -b feature/xxx   # 새 기능 브랜치 생성
```
