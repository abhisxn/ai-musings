/** CSS transforms applied to the camera-bleed stage so its perspective
 *  matches the 3D camera in each viewMode. The leading `translate(-50%, -50%)`
 *  preserves the bleed stage's centered positioning; the volumetric variant
 *  adds a perspective tilt that approximates the off-axis camera move. */
export const BLEED_SKEW_FLAT = 'translate(-50%, -50%)'
export const BLEED_SKEW_VOLUMETRIC = 'translate(-50%, -50%) perspective(1400px) rotateX(8deg) rotateY(-14deg)'
