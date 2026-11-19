/* 聊天室要不要跟著最新訊息。
   以前用「離底部 90px 以內」當還貼著。桌機滾輪／觸控板一下常常只有幾個到幾十 px，
   人已經往上翻，下一幀的補捲、表情重繪、虛擬列還原仍把畫面拉回最底，
   要一次捲超過那 90px 才放得開。
   這裡改成：捲動位置只要真的往上移，立刻放開；回到最底才再貼上。
   內容在腳下長高（新訊息、表情、字型）而人沒有往上捲時，仍然跟著走。 */

export const STICK_PX = 4;

export function createFollowController() {
  let follow = true;
  let lock = 0;
  let lastTop = 0;
  let armed = null;
  let touchY = 0;

  function gap(sc) {
    return sc.scrollHeight - sc.scrollTop - sc.clientHeight;
  }

  /* 動手之前量：人還貼在最底，而且沒有主動往上翻。 */
  function shouldFollow(sc) {
    return !!(sc && follow && gap(sc) <= STICK_PX);
  }

  function isFollowing() { return follow; }
  function force() { follow = true; }

  function noteScroll(sc) {
    const top = sc.scrollTop;
    if (lock) { lastTop = top; return follow; }
    const g = gap(sc);
    /* 往上移開最底就放開，哪怕只有 1px。人還貼在最底（內容變矮把 scrollTop 夾下去）不要誤放。 */
    if (top < lastTop - 0.5 && g > 0.5) follow = false;
    else if (g <= STICK_PX) follow = true;
    lastTop = top;
    return follow;
  }

  /* 這次確定要貼底（進來之前已經判斷過人還在最底）。 */
  function stick(sc) {
    if (!sc) return false;
    lock++;
    try {
      sc.scrollTop = sc.scrollHeight;
      lastTop = sc.scrollTop;
      follow = true;
    } finally { lock--; }
    return true;
  }

  function stickIf(sc, wanted) {
    if (!wanted) return false;
    return stick(sc);
  }

  /* 下一幀補貼。人在這中間往上捲過，scrollTop 會比上次小，就不拉回去。
     只是腳下的內容變高、scrollTop 沒往上移，仍然補上。 */
  function stickIfStill(sc) {
    if (!sc || !follow) return false;
    if (sc.scrollTop < lastTop - 0.5 && gap(sc) > 0.5) {
      follow = false;
      lastTop = sc.scrollTop;
      return false;
    }
    return stick(sc);
  }

  function releaseUnlessStill(sc, before) {
    if (!sc) return;
    if (sc.scrollTop >= before - 0.5 && gap(sc) <= STICK_PX) follow = true;
  }

  function onWheel(e) {
    const sc = armed;
    if (!sc || e.deltaY >= 0) return;
    const before = sc.scrollTop;
    follow = false;
    requestAnimationFrame(() => {
      if (armed !== sc) return;
      releaseUnlessStill(sc, before);
    });
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) touchY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    const sc = armed;
    if (!sc || e.touches.length !== 1) return;
    const y = e.touches[0].clientY;
    const down = y - touchY;
    touchY = y;
    if (down <= 2) return;
    const before = sc.scrollTop;
    follow = false;
    requestAnimationFrame(() => {
      if (armed !== sc) return;
      releaseUnlessStill(sc, before);
    });
  }

  function arm(sc) {
    if (!sc || armed === sc) return;
    armed = sc;
    lastTop = sc.scrollTop;
    sc.addEventListener("scroll", () => noteScroll(sc), { passive: true });
    sc.addEventListener("wheel", onWheel, { passive: true });
    sc.addEventListener("touchstart", onTouchStart, { passive: true });
    sc.addEventListener("touchmove", onTouchMove, { passive: true });
  }

  function reset(sc) {
    follow = true;
    lock = 0;
    lastTop = sc ? sc.scrollTop : 0;
  }

  return {
    gap, shouldFollow, isFollowing, force, noteScroll,
    stick, stickIf, stickIfStill, arm, reset,
  };
}
