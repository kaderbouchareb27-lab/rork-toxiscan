export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  console.log('[NativeIntent] Redirecting:', path, 'initial:', initial);
  return '/';
}
