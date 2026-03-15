import { SPRITES } from "@/constants/sprites";

/** Compute the parallax offset needed to center a sprite on screen.
 *  Sprite layer: width = 400vw, speed = 0.55
 *  centerShift = -(4*vw - vw)/2 = -1.5*vw
 *  Sprite pixel pos = (leftPercent / 100) * 4 * vw
 *  To center on screen: pos + centerShift - offset * speed = vw/2
 *  => offset = ((leftPercent/100)*4 - 2) * vw / 0.55
 */
export function computeOffsetForSprite(spriteId: string): number | null {
  const sprite = SPRITES.find((s) => s.id === spriteId);
  if (!sprite) return null;
  const leftPercent = Number.parseFloat(sprite.left);
  if (Number.isNaN(leftPercent)) return null;
  const vw = globalThis.innerWidth;
  const spriteWidthVw = Number.parseFloat(sprite.width) || 0;
  const spriteLeftPx = (leftPercent / 100) * 4 * vw;
  const spriteCenterPx = spriteLeftPx + ((spriteWidthVw / 100) * vw) / 2;
  const centerShift = -(4 * vw - vw) / 2;
  const speed = 0.55;
  return (spriteCenterPx + centerShift - vw / 2) / speed;
}
