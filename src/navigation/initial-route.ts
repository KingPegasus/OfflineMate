export function getInitialRoute(hasHydrated: boolean, hasCompletedOnboarding: boolean) {
  if (!hasHydrated) return null;
  return hasCompletedOnboarding ? "/chat" : "/onboarding";
}
