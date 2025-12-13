/**
 * 다중 사용자 동시 입찰 테스트
 *
 * 시나리오:
 * - 주최자 1명, 팀장 3명, 옵저버 1명이 동시 접속
 * - 페이즈별로 정확한 버튼을 클릭하여 경매까지 진행
 * - 경매 페이즈에서 50ms 간격으로 팀장들이 입찰
 * - 서버 사이드 검증이 제대로 동작하는지 확인
 *
 * 페이즈 진행 순서:
 * 1. WAITING → "팀장 소개 시작 →"
 * 2. CAPTAIN_INTRO → "다음 팀장 소개 →" (반복) → "팀원 셔플 시작 →"
 * 3. SHUFFLE → "셔플 시작" → (자동) → "경매 시작 →"
 * 4. AUCTION → "첫 번째 경매 시작" → "경매 시작" → (입찰)
 *
 * 사용법:
 * 1. 수동으로 경매방 생성 (http://localhost:3000/create)
 * 2. Supabase에서 코드 조회:
 *    SELECT id, host_code, observer_code FROM auction_rooms WHERE id = 'YOUR_ROOM_ID';
 *    SELECT captain_code FROM teams WHERE room_id = 'YOUR_ROOM_ID';
 * 3. 환경변수 설정 후 테스트:
 *    ROOM_ID=xxx HOST_CODE=xxx CAPTAIN_CODES=aaa,bbb,ccc OBSERVER_CODE=xxx pnpm test:e2e:headed
 */

import { test, expect, Browser, BrowserContext, Page } from "@playwright/test";

// =====================================================
// 테스트 설정
// =====================================================
const CONFIG = {
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  roomId: process.env.ROOM_ID || "",
  hostCode: process.env.HOST_CODE || "",
  captainCodes: (process.env.CAPTAIN_CODES || "").split(",").filter(Boolean),
  observerCode: process.env.OBSERVER_CODE || "",
  bidInterval: 50, // 입찰 간격 (ms)
  bidLockMs: 500, // 서버 입찰 락 시간 (ms)
};

// =====================================================
// 타입 정의
// =====================================================
interface UserSession {
  context: BrowserContext;
  page: Page;
  role: "HOST" | "CAPTAIN" | "OBSERVER";
  nickname: string;
  index: number;
  code: string;
}

interface TestState {
  sessions: UserSession[];
}

// =====================================================
// 유틸리티 함수
// =====================================================

/** 버튼이 보일 때까지 대기 후 클릭 */
async function clickButton(page: Page, text: string, timeout = 5000): Promise<boolean> {
  try {
    const btn = page.locator(`button:has-text("${text}")`).first();
    await btn.waitFor({ state: "visible", timeout });
    if (await btn.isEnabled()) {
      await btn.click();
      return true;
    }
  } catch {
    // 버튼을 찾지 못함
  }
  return false;
}

/** 여러 버튼 중 하나라도 클릭 시도 */
async function clickAnyButton(page: Page, texts: string[], timeout = 3000): Promise<string | null> {
  for (const text of texts) {
    if (await clickButton(page, text, timeout)) {
      return text;
    }
  }
  return null;
}

/** 페이지에 특정 텍스트가 포함되어 있는지 확인 */
async function pageContains(page: Page, text: string): Promise<boolean> {
  try {
    const content = await page.textContent("body");
    return content?.includes(text) ?? false;
  } catch {
    return false;
  }
}

// =====================================================
// 설정 검증
// =====================================================
function validateConfig() {
  const missing: string[] = [];

  if (!CONFIG.roomId) missing.push("ROOM_ID");
  if (!CONFIG.hostCode) missing.push("HOST_CODE");
  if (CONFIG.captainCodes.length === 0) missing.push("CAPTAIN_CODES");
  if (!CONFIG.observerCode) missing.push("OBSERVER_CODE");

  if (missing.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("❌ 필수 환경변수가 설정되지 않았습니다:");
    console.log("=".repeat(60));
    missing.forEach((m) => console.log(`   - ${m}`));
    console.log("\n📋 설정 방법:");
    console.log("   1. http://localhost:3000/create 에서 방 생성");
    console.log("   2. Supabase SQL Editor에서 코드 조회:");
    console.log("      SELECT id, host_code, observer_code FROM auction_rooms ORDER BY created_at DESC LIMIT 1;");
    console.log("      SELECT captain_code FROM teams WHERE room_id = 'YOUR_ROOM_ID';");
    console.log("   3. 환경변수로 테스트 실행:");
    console.log('      ROOM_ID="..." HOST_CODE="..." CAPTAIN_CODES="aaa,bbb,ccc" OBSERVER_CODE="..." pnpm test:e2e:headed');
    console.log("=".repeat(60) + "\n");
    return false;
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ 테스트 설정");
  console.log("=".repeat(60));
  console.log(`   ROOM_ID: ${CONFIG.roomId}`);
  console.log(`   HOST_CODE: ${CONFIG.hostCode}`);
  console.log(`   CAPTAIN_CODES: ${CONFIG.captainCodes.join(", ")}`);
  console.log(`   OBSERVER_CODE: ${CONFIG.observerCode}`);
  console.log(`   BID_INTERVAL: ${CONFIG.bidInterval}ms`);
  console.log(`   BID_LOCK: ${CONFIG.bidLockMs}ms`);
  console.log("=".repeat(60) + "\n");
  return true;
}

// =====================================================
// 테스트 시작
// =====================================================
test.describe("동시 입찰 테스트", () => {
  let browser: Browser;
  let state: TestState;
  let configValid: boolean;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    state = { sessions: [] };
    configValid = validateConfig();
  });

  test.afterAll(async () => {
    console.log("\n🧹 세션 정리 중...");
    for (const session of state.sessions) {
      await session.context.close();
    }
    console.log("✅ 모든 세션 종료 완료\n");
  });

  // =====================================================
  // 1단계: 각 역할별 입장
  // =====================================================
  test("1. 다중 사용자 입장", async () => {
    if (!configValid) {
      test.skip();
      return;
    }

    console.log("\n" + "=".repeat(60));
    console.log("🚀 1단계: 다중 사용자 입장");
    console.log("=".repeat(60));

    // === 주최자 입장 ===
    console.log("\n📌 주최자 입장 중...");
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    hostPage.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`   [HOST 에러] ${msg.text()}`);
      }
    });

    state.sessions.push({
      context: hostContext,
      page: hostPage,
      role: "HOST",
      nickname: "주최자",
      index: 0,
      code: CONFIG.hostCode,
    });

    await hostPage.goto(`${CONFIG.baseUrl}/join/${CONFIG.hostCode}`);
    await hostPage.waitForLoadState("networkidle");

    // "경매방 입장" 버튼 클릭
    const hostEnterBtn = hostPage.locator('button:has-text("경매방 입장")');
    await hostEnterBtn.waitFor({ state: "visible", timeout: 5000 });
    await hostEnterBtn.click();
    await hostPage.waitForURL(/\/room\//, { timeout: 10000 });
    console.log("✅ 주최자 입장 완료");

    // === 팀장들 입장 ===
    console.log("\n📌 팀장 입장 중...");
    for (let i = 0; i < CONFIG.captainCodes.length; i++) {
      const code = CONFIG.captainCodes[i];
      const nickname = `팀장${i + 1}`;

      const captainContext = await browser.newContext();
      const captainPage = await captainContext.newPage();

      captainPage.on("console", (msg) => {
        if (msg.type() === "error") {
          console.log(`   [${nickname} 에러] ${msg.text()}`);
        }
      });

      state.sessions.push({
        context: captainContext,
        page: captainPage,
        role: "CAPTAIN",
        nickname,
        index: i + 1,
        code,
      });

      await captainPage.goto(`${CONFIG.baseUrl}/join/${code}`);
      await captainPage.waitForLoadState("networkidle");

      // "본인 맞습니다" 버튼 클릭
      const confirmBtn = captainPage.locator('button:has-text("본인 맞습니다")');
      await confirmBtn.waitFor({ state: "visible", timeout: 5000 });
      await confirmBtn.click();
      await captainPage.waitForURL(/\/room\//, { timeout: 10000 });

      console.log(`   ✅ ${nickname} 입장 완료`);
      await captainPage.waitForTimeout(500);
    }

    // === 옵저버 입장 ===
    console.log("\n📌 옵저버 입장 중...");
    const observerContext = await browser.newContext();
    const observerPage = await observerContext.newPage();

    state.sessions.push({
      context: observerContext,
      page: observerPage,
      role: "OBSERVER",
      nickname: "관전자",
      index: 4,
      code: CONFIG.observerCode,
    });

    await observerPage.goto(`${CONFIG.baseUrl}/join/${CONFIG.observerCode}`);
    await observerPage.waitForLoadState("networkidle");

    // 닉네임 입력 (placeholder: "채팅에 표시될 이름")
    const nicknameInput = observerPage.locator('input[placeholder="채팅에 표시될 이름"]');
    await nicknameInput.waitFor({ state: "visible", timeout: 5000 });
    await nicknameInput.fill("테스트관전자");

    // "입장하기" 버튼 클릭
    const enterBtn = observerPage.locator('button:has-text("입장하기")');
    await enterBtn.waitFor({ state: "visible", timeout: 3000 });
    await enterBtn.click();
    await observerPage.waitForURL(/\/room\//, { timeout: 10000 });
    console.log("✅ 관전자 입장 완료");

    console.log(`\n✅ 총 ${state.sessions.length}명 입장 완료`);
  });

  // =====================================================
  // 2단계: 페이즈별 진행 (WAITING → CAPTAIN_INTRO → SHUFFLE → AUCTION)
  // =====================================================
  test("2. 경매 페이즈까지 진행", async () => {
    if (!configValid) {
      test.skip();
      return;
    }

    console.log("\n" + "=".repeat(60));
    console.log("🚀 2단계: 경매 페이즈까지 진행");
    console.log("=".repeat(60));

    const hostSession = state.sessions.find((s) => s.role === "HOST");
    if (!hostSession) {
      console.log("⚠️ 주최자 세션을 찾을 수 없습니다.");
      test.skip();
      return;
    }

    const { page: hostPage } = hostSession;
    const captainCount = CONFIG.captainCodes.length;

    // ========== WAITING 페이즈 ==========
    console.log("\n📍 WAITING 페이즈");
    await hostPage.waitForTimeout(1000);

    // "팀장 소개 시작" 버튼 대기 및 클릭
    let clicked = await clickButton(hostPage, "팀장 소개 시작", 10000);
    if (clicked) {
      console.log("   ✅ '팀장 소개 시작 →' 클릭");
    } else {
      console.log("   ⚠️ '팀장 소개 시작' 버튼을 찾지 못함");
    }
    await hostPage.waitForTimeout(1000);

    // ========== CAPTAIN_INTRO 페이즈 ==========
    console.log("\n📍 CAPTAIN_INTRO 페이즈");

    // 팀장 수만큼 "다음 팀장 소개" 클릭 (마지막은 "팀원 셔플 시작")
    for (let i = 0; i < captainCount; i++) {
      await hostPage.waitForTimeout(1500);

      const isLast = i === captainCount - 1;
      const buttonText = isLast ? "팀원 셔플 시작" : "다음 팀장 소개";

      clicked = await clickButton(hostPage, buttonText, 5000);
      if (clicked) {
        console.log(`   ✅ '${buttonText} →' 클릭 (${i + 1}/${captainCount})`);
      } else {
        // 대체 버튼 시도
        const altClicked = await clickAnyButton(hostPage, ["다음 팀장", "팀원 셔플", "다음"], 3000);
        if (altClicked) {
          console.log(`   ✅ '${altClicked}' 클릭 (대체)`);
        } else {
          console.log(`   ⚠️ 팀장 소개 버튼을 찾지 못함 (${i + 1}/${captainCount})`);
        }
      }
    }
    await hostPage.waitForTimeout(1000);

    // ========== SHUFFLE 페이즈 ==========
    console.log("\n📍 SHUFFLE 페이즈");

    // "셔플 시작" 버튼 클릭
    await hostPage.waitForTimeout(1000);
    clicked = await clickButton(hostPage, "셔플 시작", 5000);
    if (clicked) {
      console.log("   ✅ '셔플 시작' 클릭");
    } else {
      console.log("   ⚠️ '셔플 시작' 버튼을 찾지 못함");
    }

    // 셔플 애니메이션 완료 대기 (SHUFFLING → REVEALING → COMPLETE)
    console.log("   ⏳ 셔플 애니메이션 대기 중...");

    // "경매 시작" 버튼이 나타날 때까지 대기 (최대 30초)
    for (let i = 0; i < 30; i++) {
      await hostPage.waitForTimeout(1000);

      // 셔플 완료 후 "경매 시작" 버튼 확인
      const auctionStartBtn = hostPage.locator('button:has-text("경매 시작")');
      if (await auctionStartBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log("   ✅ 셔플 완료 - '경매 시작 →' 버튼 발견");
        await auctionStartBtn.click();
        console.log("   ✅ '경매 시작 →' 클릭");
        break;
      }

      if (i % 5 === 4) {
        console.log(`   ⏳ 셔플 진행 중... (${i + 1}초)`);
      }
    }
    await hostPage.waitForTimeout(1000);

    // ========== AUCTION 페이즈 ==========
    console.log("\n📍 AUCTION 페이즈");

    // "첫 번째 경매 시작" 버튼 확인 및 클릭
    clicked = await clickButton(hostPage, "첫 번째 경매 시작", 5000);
    if (clicked) {
      console.log("   ✅ '첫 번째 경매 시작' 클릭");
    }
    await hostPage.waitForTimeout(1000);

    // "경매 시작" (매물 소개 후 타이머 시작) 버튼 클릭
    clicked = await clickButton(hostPage, "경매 시작", 5000);
    if (clicked) {
      console.log("   ✅ '경매 시작' 클릭 (타이머 시작)");
    }

    // 입찰 가능 상태 확인
    await hostPage.waitForTimeout(1000);
    const hasCurrentPrice = await pageContains(hostPage, "현재 입찰가");
    const hasTimer = await pageContains(hostPage, "초");

    if (hasCurrentPrice && hasTimer) {
      console.log("   ✅ 경매 진행 중 (입찰 가능 상태)");
    } else {
      console.log("   ⚠️ 경매 상태 확인 필요");
    }

    console.log("\n✅ 경매 페이즈 도달 완료");
  });

  // =====================================================
  // 3단계: 50ms 간격 동시 입찰 테스트 (락 500ms 적용)
  // =====================================================
  test("3. 50ms 간격 동시 입찰 테스트", async () => {
    if (!configValid) {
      test.skip();
      return;
    }

    console.log("\n" + "=".repeat(60));
    console.log("🚀 3단계: 50ms 간격 동시 입찰 테스트");
    console.log("=".repeat(60));

    const hostSession = state.sessions.find((s) => s.role === "HOST");
    const captainSessions = state.sessions.filter((s) => s.role === "CAPTAIN");

    if (!hostSession || captainSessions.length < 2) {
      console.log("⚠️ 테스트에 필요한 세션이 부족합니다.");
      test.skip();
      return;
    }

    const { page: hostPage } = hostSession;

    // 타이머가 진행 중인지 확인
    const timerEl = hostPage.locator("text=/\\d+\\.\\d+/").first();
    const isTimerRunning = await timerEl.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isTimerRunning) {
      console.log("⚠️ 타이머가 진행 중이 아닙니다. 경매 시작 버튼을 클릭합니다.");
      await clickButton(hostPage, "경매 시작", 3000);
      await hostPage.waitForTimeout(500);
    }

    // === 동시 입찰 실행 ===
    console.log("\n📌 50ms 간격 동시 입찰 시작...");
    console.log(`   서버 입찰 락: ${CONFIG.bidLockMs}ms`);
    console.log("   예상 결과: 첫 번째 팀장만 성공, 나머지는 BID_TOO_SOON\n");
    console.log("   타임라인:");
    captainSessions.forEach((s, i) => {
      const marker = i === captainSessions.length - 1 ? "└─" : "├─";
      console.log(`   ${marker} ${s.nickname}: ${i * CONFIG.bidInterval}ms`);
    });
    console.log("");

    const bidResults: {
      captain: string;
      scheduledTime: number;
      actualTime: number;
      clicked: boolean;
      note?: string;
    }[] = [];

    const startTime = Date.now();

    // Promise.all로 "거의 동시" 입찰 실행
    const bidPromises = captainSessions.map(async (session, index) => {
      const scheduledDelay = index * CONFIG.bidInterval;

      // 정확한 타이밍을 위해 setTimeout 사용
      await new Promise((resolve) => setTimeout(resolve, scheduledDelay));

      const actualTime = Date.now() - startTime;

      try {
        // 입찰 버튼 찾기 ("+5p", "+10p" 등)
        const bidBtn = session.page.locator('button:has-text("+")').first();
        const isVisible = await bidBtn.isVisible({ timeout: 500 }).catch(() => false);
        const isEnabled = isVisible && (await bidBtn.isEnabled().catch(() => false));

        if (isEnabled) {
          await bidBtn.click();
          console.log(`🔨 ${session.nickname} 클릭 (${actualTime}ms)`);
          bidResults.push({
            captain: session.nickname,
            scheduledTime: scheduledDelay,
            actualTime,
            clicked: true,
          });
        } else {
          console.log(`⏸️ ${session.nickname} 버튼 비활성화 (${actualTime}ms)`);
          bidResults.push({
            captain: session.nickname,
            scheduledTime: scheduledDelay,
            actualTime,
            clicked: false,
            note: isVisible ? "버튼 비활성화" : "버튼 없음",
          });
        }
      } catch (error) {
        console.log(`❌ ${session.nickname} 에러 (${actualTime}ms)`);
        bidResults.push({
          captain: session.nickname,
          scheduledTime: scheduledDelay,
          actualTime,
          clicked: false,
          note: String(error),
        });
      }
    });

    await Promise.all(bidPromises);

    // 서버 처리 대기
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // === 결과 분석 ===
    console.log("\n" + "─".repeat(50));
    console.log("📊 입찰 결과 분석");
    console.log("─".repeat(50));

    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️ 총 소요 시간: ${totalTime}ms`);

    console.log("\n📋 클릭 결과:");
    for (const result of bidResults) {
      const status = result.clicked ? "✅ 클릭됨" : `⏸️ ${result.note || "실패"}`;
      console.log(`   ${result.captain}: ${status} [${result.actualTime}ms]`);
    }

    // 서버 콘솔 로그 확인 안내
    console.log("\n💡 서버 입찰 결과는 각 브라우저의 콘솔(F12)에서 확인하세요:");
    console.log("   - 성공: '입찰 성공'");
    console.log("   - 동시입찰 차단: '입찰 실패: 동시 입찰 감지 (Xms 후 재시도 가능)'");

    // 현재 입찰가 확인
    await hostPage.waitForTimeout(500);
    const priceEl = hostPage.locator("text=/\\d+p/").first();
    const currentPrice = await priceEl.textContent().catch(() => "확인 불가");
    console.log(`\n💰 현재 입찰가: ${currentPrice}`);

    console.log("─".repeat(50));
  });

  // =====================================================
  // 4단계: 락 해제 후 연속 입찰 테스트
  // =====================================================
  test("4. 락 해제 후 연속 입찰 테스트", async () => {
    if (!configValid) {
      test.skip();
      return;
    }

    console.log("\n" + "=".repeat(60));
    console.log("🚀 4단계: 락 해제 후 연속 입찰 테스트");
    console.log("=".repeat(60));

    const captainSessions = state.sessions.filter((s) => s.role === "CAPTAIN");
    if (captainSessions.length < 2) {
      test.skip();
      return;
    }

    // 500ms 락이 해제될 때까지 대기
    console.log(`\n📌 ${CONFIG.bidLockMs}ms 락 해제 대기 후 다시 입찰...\n`);
    await new Promise((resolve) => setTimeout(resolve, CONFIG.bidLockMs + 100));

    // 각 팀장이 순차적으로 입찰 (500ms 간격)
    for (let round = 0; round < 3; round++) {
      const session = captainSessions[round % captainSessions.length];

      console.log(`📌 라운드 ${round + 1}: ${session.nickname} 입찰 시도`);

      try {
        const bidBtn = session.page.locator('button:has-text("+")').first();
        if (await bidBtn.isEnabled({ timeout: 500 }).catch(() => false)) {
          await bidBtn.click();
          console.log(`   ✅ ${session.nickname} 클릭`);
        } else {
          console.log(`   ⏸️ ${session.nickname} 버튼 비활성화`);
        }
      } catch {
        console.log(`   ❌ ${session.nickname} 실패`);
      }

      // 락 해제 대기
      await new Promise((resolve) => setTimeout(resolve, CONFIG.bidLockMs + 100));
    }

    console.log("\n✅ 연속 입찰 테스트 완료");
  });

  // =====================================================
  // 5단계: 상태 일관성 검증
  // =====================================================
  test("5. 상태 일관성 검증", async () => {
    if (!configValid) {
      test.skip();
      return;
    }

    console.log("\n" + "=".repeat(60));
    console.log("🚀 5단계: 상태 일관성 검증");
    console.log("=".repeat(60));

    // 잠시 대기하여 모든 브로드캐스트가 완료되도록
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 모든 세션의 현재 입찰가 확인
    console.log("\n📌 세션 간 상태 일관성 검증...");
    const prices: { session: string; price: string }[] = [];

    for (const session of state.sessions) {
      try {
        // 현재 입찰가 텍스트 찾기
        const priceContainer = session.page.locator("text=/\\d+p/").first();
        const price = (await priceContainer.textContent({ timeout: 1000 })) || "없음";
        prices.push({ session: session.nickname, price });
      } catch {
        prices.push({ session: session.nickname, price: "확인 불가" });
      }
    }

    console.log("\n📋 각 세션의 현재 입찰가:");
    for (const p of prices) {
      console.log(`   ${p.session}: ${p.price}`);
    }

    // 가격 일관성 체크
    const validPrices = prices.map((p) => p.price).filter((p) => p !== "확인 불가" && p !== "없음");
    const uniquePrices = new Set(validPrices);

    if (uniquePrices.size === 0) {
      console.log("\n⚠️ 입찰가를 확인할 수 없습니다.");
    } else if (uniquePrices.size === 1) {
      console.log("\n✅ 모든 세션의 입찰가가 일치합니다.");
    } else {
      console.log(`\n⚠️ 세션 간 입찰가 불일치: ${[...uniquePrices].join(", ")}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ 테스트 완료");
    console.log("=".repeat(60));
  });
});
