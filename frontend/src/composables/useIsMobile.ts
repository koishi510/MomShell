import { ref, onMounted, onUnmounted } from "vue";

const MQ_MOBILE = "(max-width: 768px)";
const MQ_SMALL = "(max-width: 480px)";
const MQ_LANDSCAPE = "(max-height: 500px) and (orientation: landscape)";

export function useIsMobile() {
  const isMobile = ref(
    typeof globalThis.window !== "undefined" &&
      globalThis.matchMedia(MQ_MOBILE).matches,
  );
  const isSmall = ref(
    typeof globalThis.window !== "undefined" &&
      globalThis.matchMedia(MQ_SMALL).matches,
  );
  const isLandscape = ref(
    typeof globalThis.window !== "undefined" &&
      globalThis.matchMedia(MQ_LANDSCAPE).matches,
  );

  function update() {
    if (mql768 && mql480 && mqlLandscape) {
      isMobile.value = mql768.matches;
      isSmall.value = mql480.matches;
      isLandscape.value = mqlLandscape.matches;
    }
  }

  let mql768: MediaQueryList | undefined;
  let mql480: MediaQueryList | undefined;
  let mqlLandscape: MediaQueryList | undefined;

  onMounted(() => {
    mql768 = globalThis.matchMedia(MQ_MOBILE);
    mql480 = globalThis.matchMedia(MQ_SMALL);
    mqlLandscape = globalThis.matchMedia(MQ_LANDSCAPE);
    update();
    mql768.addEventListener("change", update);
    mql480.addEventListener("change", update);
    mqlLandscape.addEventListener("change", update);
  });

  onUnmounted(() => {
    mql768?.removeEventListener("change", update);
    mql480?.removeEventListener("change", update);
    mqlLandscape?.removeEventListener("change", update);
  });

  return { isMobile, isSmall, isLandscape };
}
