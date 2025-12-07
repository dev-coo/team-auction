# 경매 타이머 동기화 설계

## 문제 분석

### 문제 1: 타이머 불일치 (5초 룰 적용 차이)

**현상**:
- 클라이언트 A: timer=52 (5.2초) → +2초 룰 적용 → newTimer=72
- 클라이언트 B: timer=48 (4.8초) → 5초로 고정 룰이 적용되어야 하지만, A의 newTimer=72를 받음

**원인 코드** (`page.tsx` L937-939):
```typescript
const newTimer = auctionState.timer <= MIN_TIMER_THRESHOLD
  ? MIN_TIMER_THRESHOLD
  : Math.min(auctionState.timer + BID_TIME_EXTENSION_SECONDS, INITIAL_TIMER_SECONDS);
```
- 발신자의 로컬 `auctionState.timer` 기준으로 계산
- 수신자는 자신의 타이머 상태와 무관하게 `newTimer` 값 적용

---

### 문제 2: 입찰 이벤트 손실

**현상**:
- 다른 팀이 입찰했는데 이벤트를 못 받음
- 본인이 계속 최고 입찰자로 표시됨
- 입찰 버튼 비활성화 (이미 최고 입찰자라고 판단)

**원인**:
- Supabase Realtime Broadcast는 "at-most-once" 전달 (손실 가능)
- 네트워크 불안정, 채널 구독 상태 문제
- DB에 상태 저장하지만 DB Changes 구독 미사용

---

## 규칙 변경

### 기존 타이머 규칙
- 입찰 시 +2초 추가
- 5초 이하면 5초로 고정

### 변경된 타이머 규칙
- **+2초 룰 삭제**
- **5초 룰만 유지**: 5초 이하에서 입찰 시 5초로 리셋

---

## 설계안: timer_end_at 기반 동기화

### 핵심 원리

**현재 (상대 시간)**:
```
발신자: timer=100 → newTimer=120 브로드캐스트
수신자: 각자 다른 타이밍에 수신 → timer=120 적용
결과: 수신자마다 타이머 종료 시점 다름
```

**개선 (절대 시간)**:
```
발신자: timerEndAt = 현재시간 + 남은시간 (절대 타임스탬프) 브로드캐스트
수신자: timer = (timerEndAt - Date.now()) / 100 계산
결과: 모든 클라이언트가 동일한 종료 시점
```

---

## 변경 상세

### 1. AuctionState 타입 변경

```typescript
// 기존
interface AuctionState {
  timer: number;              // 0.1초 단위 (로컬 카운트다운)
  timerRunning: boolean;
  // ...
}

// 변경
interface AuctionState {
  timer: number;              // 표시용 (0.1초 단위, 계산된 값)
  timerEndAt: number;         // 추가: 타이머 종료 시각 (ms 타임스탬프)
  timerRunning: boolean;
  // ...
}
```

### 2. handleBid 수정 (5초 룰만 적용)

```typescript
const handleBid = useCallback(async (amount: number) => {
  const now = Date.now();

  // 현재 남은 시간 계산 (timerEndAt 기준)
  const remainingMs = Math.max(0, auctionState.timerEndAt - now);

  // 5초 룰만 적용: 5초 이하면 5초로 리셋, 그 외에는 유지
  let newEndAt: number;
  if (remainingMs <= MIN_TIMER_THRESHOLD * 100) {  // 500ms = 5초
    // 5초 이하면 5초로 리셋
    newEndAt = now + MIN_TIMER_THRESHOLD * 100;
  } else {
    // 5초 초과면 기존 종료 시간 유지 (시간 추가 없음)
    newEndAt = auctionState.timerEndAt;
  }

  // 즉시 UI 업데이트
  setAuctionState((prev) => ({
    ...prev,
    currentPrice: amount,
    highestBidTeamId: myTeam.id,
    timerEndAt: newEndAt,
    timer: Math.ceil((newEndAt - now) / 100),
    bidLockUntil: now + 500,
    // ...bidHistory
  }));

  // 브로드캐스트 (timerEndAt 전송)
  broadcast("BID", {
    teamId: myTeam.id,
    teamName: myTeam.name,
    teamColor: myTeam.color,
    amount,
    timestamp: now,
    timerEndAt: newEndAt,  // 절대 시간
  });

  // DB 저장
  await updateRealtimeState(roomId, {
    currentPrice: amount,
    highestBidTeamId: myTeam.id,
    timerEndAt: new Date(newEndAt).toISOString(),
  });
});
```

### 3. BID 이벤트 수신 수정

```typescript
case "BID": {
  const payload = event.payload as BidPayload;
  const now = Date.now();

  setAuctionState((prev) => {
    if (payload.timestamp < prev.bidLockUntil) return prev;
    if (payload.amount <= prev.currentPrice) return prev;

    return {
      ...prev,
      currentPrice: payload.amount,
      highestBidTeamId: payload.teamId,
      timerEndAt: payload.timerEndAt,
      timer: Math.ceil((payload.timerEndAt - now) / 100),
      bidHistory: [
        { teamId, teamName, teamColor, amount, timestamp },
        ...prev.bidHistory,
      ].slice(0, 10),
    };
  });
  break;
}
```

### 4. 타이머 카운트다운 수정

```typescript
// 변경: timerEndAt 기준 계산
useEffect(() => {
  if (!auctionState.timerRunning || !auctionState.timerEndAt) return;

  const interval = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, auctionState.timerEndAt - now);
    const displayTimer = Math.ceil(remaining / 100);

    setAuctionState((prev) => ({
      ...prev,
      timer: displayTimer,
    }));
  }, TIMER_INTERVAL_MS);

  return () => clearInterval(interval);
}, [auctionState.timerRunning, auctionState.timerEndAt]);
```

### 5. DB Changes 구독 추가 (이벤트 손실 복구)

```typescript
// 컴포넌트 내부에 추가
useDbChanges(
  "auction_rooms",
  `id=eq.${roomId}`,
  useCallback((payload: any) => {
    const newData = payload.new;
    if (!newData) return;

    // DB 변경으로 상태 복구 (Broadcast 손실 시 백업)
    setAuctionState((prev) => {
      // 이미 최신 상태면 무시
      if (prev.currentPrice >= newData.current_price) return prev;

      const timerEndAt = newData.timer_end_at
        ? new Date(newData.timer_end_at).getTime()
        : prev.timerEndAt;

      return {
        ...prev,
        currentPrice: newData.current_price ?? prev.currentPrice,
        highestBidTeamId: newData.highest_bid_team_id ?? prev.highestBidTeamId,
        timerEndAt,
        timer: Math.ceil((timerEndAt - Date.now()) / 100),
      };
    });
  }, [])
);
```

### 6. 경매 시작 시 timerEndAt 설정

```typescript
const handleStartAuction = useCallback(() => {
  const now = Date.now();
  const timerEndAt = now + INITIAL_TIMER_SECONDS * 100;  // 30초 후

  setAuctionState((prev) => ({
    ...prev,
    currentTargetId: firstTarget,
    currentTargetIndex: firstIdx,
    timer: INITIAL_TIMER_SECONDS,
    timerEndAt,
    timerRunning: true,
    currentPrice: 0,
    highestBidTeamId: null,
  }));

  broadcast("AUCTION_START", {
    targetId: firstTarget,
    targetIndex: firstIdx,
    timerEndAt,
  });

  await updateRealtimeState(roomId, {
    timerEndAt: new Date(timerEndAt).toISOString(),
    timerRunning: true,
  });
}, [/* deps */]);
```

---

## constants.ts 변경

```typescript
// 기존
export const INITIAL_TIMER_SECONDS = 300; // 30.0초
export const BID_TIME_EXTENSION_SECONDS = 20; // 2.0초 - 삭제
export const MIN_TIMER_THRESHOLD = 50; // 5.0초

// 변경
export const INITIAL_TIMER_SECONDS = 300; // 30.0초
export const MIN_TIMER_THRESHOLD = 50; // 5.0초 (5초 이하면 5초로 리셋)
// BID_TIME_EXTENSION_SECONDS 삭제
```

---

## BidPayload 타입 변경

```typescript
// 기존
interface BidPayload {
  teamId: string;
  teamName: string;
  teamColor: string;
  amount: number;
  timestamp: number;
  newTimer: number;  // 상대 시간
}

// 변경
interface BidPayload {
  teamId: string;
  teamName: string;
  teamColor: string;
  amount: number;
  timestamp: number;
  timerEndAt: number;  // 절대 시간 (ms)
}
```

---

## 동기화 흐름

### 개선된 흐름 (절대 시간 + 5초 룰만)

```
T=0s:   HOST → AUCTION_START (timerEndAt=1734567890000)  // 30초 후
        ├─ 클라이언트 A: timerEndAt=1734567890000
        └─ 클라이언트 B: timerEndAt=1734567890000

T=25s:  CAPTAIN_A 입찰 (now=1734567865000)
        ├─ remaining = 25000ms (25초) → 5초 초과
        └─ newEndAt = 1734567890000 (기존 유지, 시간 추가 없음)

T=27s:  CAPTAIN_B 입찰 (now=1734567867000)
        ├─ remaining = 23000ms (23초) → 5초 초과
        └─ newEndAt = 1734567890000 (기존 유지)

T=29.5s: CAPTAIN_A 입찰 (now=1734567889500)
        ├─ remaining = 500ms (0.5초) → 5초 이하!
        └─ newEndAt = 1734567889500 + 5000 = 1734567894500 (5초로 리셋)

        모든 클라이언트: timerEndAt=1734567894500
        표시: 5.0초
```

---

## 이점

1. **타이머 동기화**: 모든 클라이언트가 동일한 절대 시간 기준
2. **5초 룰 일관성**: 5초 이하에서만 리셋, 그 외 시간 유지
3. **+2초 룰 제거**: 복잡한 시간 계산 단순화
4. **이벤트 손실 복구**: DB Changes로 상태 자동 복구
5. **네트워크 지연 무관**: 절대 시간이므로 지연 영향 없음

---

## 구현 순서

1. `constants.ts`에서 `BID_TIME_EXTENSION_SECONDS` 삭제
2. `AuctionState` 타입에 `timerEndAt` 추가
3. `BidPayload` 타입 변경 (`newTimer` → `timerEndAt`)
4. `handleBid` 수정 (timerEndAt 계산, 5초 룰만 적용)
5. `case "BID"` 수신 로직 수정
6. 타이머 카운트다운 useEffect 수정
7. `handleStartAuction` 수정
8. `AUCTION_START` 이벤트 수신 수정
9. `useDbChanges` 구독 추가
10. 테스트: 여러 클라이언트에서 동시 접속 후 입찰
