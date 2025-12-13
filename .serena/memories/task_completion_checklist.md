# Task Completion Checklist

## Before Marking Task Complete
1. [ ] 코드 변경사항 확인
2. [ ] TypeScript 타입 에러 없음
3. [ ] ESLint 에러 없음 (`pnpm lint`)
4. [ ] 관련 컴포넌트/함수 테스트
5. [ ] 브라우저에서 동작 확인

## Important Notes
- **절대 자동 커밋하지 않음** - 사용자 확인 후에만 커밋
- **테스트/빌드 명령어 자동 실행 금지** - 사용자가 직접 실행
- **작업 완료 시 테스트 방법 함께 제공**

## Commit Guidelines
- 사용자가 명시적으로 요청할 때만 커밋
- 커밋 전 반드시 변경사항 리뷰 요청
- 커밋 메시지 형식: `feat:`, `fix:`, `refactor:`, `docs:`

## Testing Approach
- 개발 서버에서 수동 테스트 (`pnpm dev`)
- 역할별 UI 테스트 (HOST, CAPTAIN, OBSERVER)
- Realtime 기능은 여러 브라우저 탭에서 테스트
