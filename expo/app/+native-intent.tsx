export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  console.log('[NativeIntent] Redirecting path:', path, 'initial:', initial);
  if (initial) {
    console.log('[NativeIntent] Initial load, redirecting to home');
  }
  return '/';
}
