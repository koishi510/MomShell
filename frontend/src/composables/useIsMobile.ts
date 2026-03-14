import { ref, onMounted, onUnmounted } from "vue";

const MQ_MOBILE = "(max-width: 768px)";
const MQ_SMALL = "(max-width: 480px)";
const MQ_LANDSCAPE = "(max-height: 500px) and (orientation: landscape)";

export function useIsMobile() {
  const isMobile = ref(
    typeof window !== "undefined" && window.matchMedia(MQ_MOBILE).matches,
  );
  const isSmall = ref(
    typeof window !== "undefined" && window.matchMedia(MQ_SMALL).matches,
  );
  const isLandscape = ref(
    typeof window !== "undefined" && window.matchMedia(MQ_LANDSCAPE).matches,
  );

  function update() {
    isMobile.value = window.matchMedia(MQ_MOBILE).matches;
    isSmall.value = window.matchMedia(MQ_SMALL).matches;
    isLandscape.value = window.matchMedia(MQ_LANDSCAPE).matches;
  }

  let mql768: MediaQueryList | undefined;
  let mql480: MediaQueryList | undefined;
  let mqlLandscape: MediaQueryList | undefined;

  onMounted(() => {
    mql768 = window.matchMedia(MQ_MOBILE);
    mql480 = window.matchMedia(MQ_SMALL);
    mqlLandscape = window.matchMedia(MQ_LANDSCAPE);
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
