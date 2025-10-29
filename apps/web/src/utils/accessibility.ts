/**
 * Accessibility utilities for respecting user preferences
 */

/**
 * Returns appropriate transition CSS value based on reduced motion preference
 * @param transition - The transition CSS value to use when motion is allowed
 * @param prefersReducedMotion - Whether the user prefers reduced motion
 * @returns "none" if reduced motion is preferred, otherwise the provided transition
 */
export function getTransition(
  transition: string,
  prefersReducedMotion: boolean,
): string {
  return prefersReducedMotion ? "none" : transition;
}

/**
 * Returns appropriate animation CSS value based on reduced motion preference
 * @param animation - The animation CSS value to use when motion is allowed
 * @param prefersReducedMotion - Whether the user prefers reduced motion
 * @returns "none" if reduced motion is preferred, otherwise the provided animation
 */
export function getAnimation(
  animation: string,
  prefersReducedMotion: boolean,
): string {
  return prefersReducedMotion ? "none" : animation;
}
