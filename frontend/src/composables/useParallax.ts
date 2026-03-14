import {
  ref,
  reactive,
  onMounted,
  onUnmounted,
  provide,
  type InjectionKey,
  type Ref,
} from "vue";
import { PARALLAX_EASE, SCROLL_SPEED } from "@/constants/layers";
import { useAnimationLoop } from "./useAnimationLoop";

export interface ParallaxContext {
  currentOffset: Ref<number>;
  registerLayer: (el: HTMLElement, speed: number) => void;
  startLoop: () => void;
  hideHint: () => void;
  wasDrag: () => boolean;
  scrollTo: (offset: number) => void;
}

export const PARALLAX_KEY: InjectionKey<ParallaxContext> = Symbol("parallax");

export function useParallax() {
  const targetOffset = ref(0);
  const currentOffset = ref(0);
  const maxOffset = ref(0);
  const hintHidden = ref(false);

  const keys = reactive({ ArrowLeft: false, ArrowRight: false });
  let dragging = false;
  let totalDragDistance = 0;
  const DRAG_THRESHOLD = 5;

  interface LayerMeta {
    el: HTMLElement;
    speed: number;
    centerShift: number;
  }
  const layerMeta: LayerMeta[] = [];

  function recalcParallax() {
    const vw = window.innerWidth;
    const isPortraitMobile =
      vw <= 768 && window.innerHeight > window.innerWidth;
    maxOffset.value = vw * (isPortraitMobile ? 1.5 : 1.2);
    layerMeta.forEach((m) => {
      m.centerShift = -(m.el.offsetWidth - vw) / 2;
    });
    targetOffset.value = Math.max(
      -maxOffset.value,
      Math.min(maxOffset.value, targetOffset.value),
    );
    currentOffset.value = Math.max(
      -maxOffset.value,
      Math.min(maxOffset.value, currentOffset.value),
    );
  }

  function applyParallax() {
    const offset = currentOffset.value;
    layerMeta.forEach((m) => {
      m.el.style.transform = `translateX(${m.centerShift - offset * m.speed}px)`;
    });
  }

  const { start: startLoop } = useAnimationLoop(() => {
    if (keys.ArrowLeft) targetOffset.value -= SCROLL_SPEED;
    if (keys.ArrowRight) targetOffset.value += SCROLL_SPEED;
    targetOffset.value = Math.max(
      -maxOffset.value,
      Math.min(maxOffset.value, targetOffset.value),
    );
    currentOffset.value +=
      (targetOffset.value - currentOffset.value) * PARALLAX_EASE;
    applyParallax();

    if (
      Math.abs(targetOffset.value - currentOffset.value) < 0.5 &&
      !keys.ArrowLeft &&
      !keys.ArrowRight &&
      !dragging
    ) {
      currentOffset.value = targetOffset.value;
      applyParallax();
      return false;
    }
    return true;
  });

  function registerLayer(el: HTMLElement, speed: number) {
    const vw = window.innerWidth;
    layerMeta.push({
      el,
      speed,
      centerShift: -(el.offsetWidth - vw) / 2,
    });
  }

  function hideHint() {
    hintHidden.value = true;
  }

  /* --- Input handlers --- */
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      keys[e.key] = true;
      startLoop();
      hideHint();
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      keys[e.key] = false;
    }
  }

  let dragStartX = 0;
  let offsetAtDragStart = 0;

  function onMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      target.closest("button, input, textarea, select, a, [contenteditable]")
    ) {
      return;
    }
    dragging = true;
    totalDragDistance = 0;
    dragStartX = e.clientX;
    offsetAtDragStart = targetOffset.value;
    startLoop();
    hideHint();
  }
  function onMouseMove(e: MouseEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    totalDragDistance += Math.abs(e.movementX);
    if (
      totalDragDistance > DRAG_THRESHOLD &&
      !document.body.classList.contains("dragging")
    ) {
      document.body.classList.add("dragging");
    }
    targetOffset.value = offsetAtDragStart - dx * 1.8;
  }
  function onMouseUp() {
    dragging = false;
    document.body.classList.remove("dragging");
  }
  function onBlur() {
    dragging = false;
    document.body.classList.remove("dragging");
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  }

  let touchStartX = 0;
  let touchOffsetStart = 0;

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchOffsetStart = targetOffset.value;
    startLoop();
    hideHint();
  }
  function onTouchMove(e: TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX;
    targetOffset.value = touchOffsetStart - dx * 1.8;
  }

  function onWheel(e: WheelEvent) {
    // Skip if an overlay panel or scrollable area is open
    const target = e.target as HTMLElement;
    if (target.closest(".board-scroll-area, .overlay-panel, .panel-scroll")) {
      return;
    }
    // Use deltaX (trackpad horizontal swipe / mouse horizontal scroll)
    // Also accept shift+deltaY as horizontal (common mouse fallback)
    const dx =
      Math.abs(e.deltaX) > Math.abs(e.deltaY)
        ? e.deltaX
        : e.shiftKey
          ? e.deltaY
          : 0;
    if (dx === 0) return;
    e.preventDefault();
    targetOffset.value += dx * 1.5;
    startLoop();
    hideHint();
  }

  let resizeRaf = 0;

  onMounted(() => {
    recalcParallax();
    applyParallax();
    startLoop();

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(recalcParallax);
    });
    window.addEventListener("orientationchange", () => {
      // Delay recalc to let the browser settle after orientation change
      setTimeout(() => {
        recalcParallax();
        applyParallax();
        startLoop();
      }, 150);
    });

    setTimeout(() => {
      hintHidden.value = true;
    }, 6000);
  });

  onUnmounted(() => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("touchstart", onTouchStart);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("wheel", onWheel);
  });

  function wasDrag(): boolean {
    return totalDragDistance > DRAG_THRESHOLD;
  }

  function scrollTo(offset: number) {
    targetOffset.value = Math.max(
      -maxOffset.value,
      Math.min(maxOffset.value, offset),
    );
    // Jump halfway to target so the animation feels faster
    currentOffset.value += (targetOffset.value - currentOffset.value) * 0.5;
    startLoop();
  }

  const ctx: ParallaxContext = {
    currentOffset,
    registerLayer,
    startLoop,
    hideHint,
    wasDrag,
    scrollTo,
  };

  provide(PARALLAX_KEY, ctx);

  return {
    currentOffset,
    hintHidden,
    registerLayer,
    startLoop,
    hideHint,
    scrollTo,
  };
}
