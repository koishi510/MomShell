import { ref, onMounted, onUnmounted } from "vue";

export function useIsMobile() {
  const isMobile = ref(false);
  const isSmall = ref(false);
  const isLandscape = ref(false);

  function update() {
    isMobile.value = window.matchMedia("(max-width: 768px)").matches;
    isSmall.value = window.matchMedia("(max-width: 480px)").matches;
    isLandscape.value = window.matchMedia(
      "(max-height: 500px) and (orientation: landscape)",
    ).matches;
  }

  let mql768: MediaQueryList;
  let mql480: MediaQueryList;
  let mqlLandscape: MediaQueryList;

  onMounted(() => {
    mql768 = window.matchMedia("(max-width: 768px)");
    mql480 = window.matchMedia("(max-width: 480px)");
    mqlLandscape = window.matchMedia(
      "(max-height: 500px) and (orientation: landscape)",
    );
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
