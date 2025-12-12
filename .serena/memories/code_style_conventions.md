# Code Style and Conventions

## General Rules
- TypeScript strict mode
- ESLint for code quality
- Tailwind CSS for styling (no separate CSS files)

## Naming Conventions
- **Files**: kebab-case (e.g., `auction-utils.ts`)
- **Components**: PascalCase (e.g., `WaitingPhase.tsx`)
- **Functions**: camelCase (e.g., `createAuction()`)
- **Types/Interfaces**: PascalCase (e.g., `AuctionRoom`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `INITIAL_TIMER_SECONDS`)

## File Organization
```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable components
│   ├── ui/          # Base UI components
│   ├── auction/     # Auction-specific components
│   └── chat/        # Chat components
├── lib/             # Utilities and API
│   ├── api/         # Supabase API functions
│   ├── constants.ts # Constants and config
│   ├── supabase.ts  # Supabase client
│   └── realtime.ts  # Realtime hooks
├── hooks/           # Custom React hooks
└── types/           # TypeScript types
```

## React Patterns
- Use `use client` directive for client components
- Prefer functional components with hooks
- Use `useRef` for callback functions in useEffect dependencies
- Spread objects when setting state from Presence to trigger re-render

## Realtime Channel Naming
- `room:{roomId}` - Broadcast 전용 (페이즈, 입찰, 타이머, 채팅)
- `presence:{roomId}` - Presence 전용 (접속자 상태)
- **주의**: Broadcast와 Presence는 반드시 별도 채널로 분리!

## API Pattern
```typescript
// src/lib/api/*.ts
export async function functionName(params: Params): Promise<Result> {
  const { data, error } = await supabase.from("table")...
  if (error) throw new Error(`실패: ${error.message}`);
  return data;
}
```
