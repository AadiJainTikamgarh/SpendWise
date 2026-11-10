import { router } from 'expo-router';

/**
 * Safely navigates back if there is a screen in history,
 * otherwise replaces the current screen with the fallback route.
 * Prevents "The action 'GO_BACK' was not handled by any navigator" warnings/errors.
 */
export function safeGoBack(fallbackRoute: string = '/') {
  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  } catch {
    router.replace(fallbackRoute as any);
  }
}
