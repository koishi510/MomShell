import type { WavefrontConfig, WavefrontStyle } from "@/types/scene";
import { createSeededRandom, rf } from "@/utils/random";

const rand = createSeededRandom(200);

export function generateWavefronts(config: WavefrontConfig): WavefrontStyle[] {
  const styles: WavefrontStyle[] = [];

  for (let i = 0; i < config.rows; i++) {
    let baseDelay = (i * config.cycle) / config.rows + rf(rand, -0.8, 0.8);
    if (baseDelay < 0) baseDelay += config.cycle;

    const segs = config.segs;
    const segBase = 100 / segs;

    for (let s = 0; s < segs; s++) {
      const layers = 1 + (rand() > 0.6 ? 1 : 0);
      for (let j = 0; j < layers; j++) {
        const overlap = segBase * 0.85;
        const left = s * segBase - overlap / 2 + rf(rand, -2, 2);
        const width = segBase + overlap + rf(rand, -2, 4);

        const nx = segs > 1 ? s / (segs - 1) : 0.5;
        const phaseOffset =
          config.phaseSpread *
            (0.6 * Math.sin(nx * Math.PI * 4 + config.phaseSeed) +
              0.4 * Math.sin(nx * Math.PI * 9 + config.phaseSeed * 1.7)) +
          rf(rand, -0.3, 0.3);

        const vertOffset =
          config.vertSpread *
            (0.5 * Math.sin(nx * Math.PI * 6 + config.phaseSeed * 0.8) +
              0.5 * Math.sin(nx * Math.PI * 13 + config.phaseSeed * 2.3)) +
          rf(rand, -1.5, 1.5);
        const segTop = config.startTop + vertOffset;

        let segDelay = baseDelay + phaseOffset + j * rf(rand, 0.2, 0.5);
        segDelay = ((segDelay % config.cycle) + config.cycle) % config.cycle;

        const h = config.hMin + rf(rand, 0, config.hVar);
        const alpha = config.alphaMin + rf(rand, 0, config.alphaVar);
        const blur = config.blur + rf(rand, -0.4, 0.6);
        const cycleJitter = config.cycle + rf(rand, -1.2, 1.2);

        const cx = 30 + rf(rand, 0, 40);
        const { r, g, b } = config;
        const bg =
          `radial-gradient(ellipse at ${cx.toFixed(0)}% 50%, ` +
          `rgba(${r},${g},${b},${alpha.toFixed(3)}) 0%, ` +
          `rgba(${r},${g},${b},${(alpha * 0.4).toFixed(3)}) 55%, ` +
          `transparent 100%)`;

        const br = [
          (35 + rf(rand, 0, 30)).toFixed(0) + "%",
          (35 + rf(rand, 0, 30)).toFixed(0) + "%",
          (30 + rf(rand, 0, 25)).toFixed(0) + "%",
          (30 + rf(rand, 0, 25)).toFixed(0) + "%",
        ];
        const brV = [
          (50 + rf(rand, 0, 30)).toFixed(0) + "%",
          (50 + rf(rand, 0, 30)).toFixed(0) + "%",
          (40 + rf(rand, 0, 25)).toFixed(0) + "%",
          (40 + rf(rand, 0, 25)).toFixed(0) + "%",
        ];

        const animName =
          config.anims[Math.floor(rand() * config.anims.length)];

        styles.push({
          top: segTop.toFixed(1) + "%",
          left: left.toFixed(1) + "%",
          width: width.toFixed(1) + "%",
          height: h.toFixed(1) + "px",
          borderRadius: br.join(" ") + " / " + brV.join(" "),
          background: bg,
          filter: `blur(${blur.toFixed(1)}px)`,
          animation: `${animName} ${cycleJitter.toFixed(1)}s ease-in-out ${segDelay.toFixed(1)}s infinite`,
        });
      }
    }
  }

  return styles;
}
