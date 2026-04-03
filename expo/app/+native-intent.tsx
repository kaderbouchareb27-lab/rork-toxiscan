export function redirectSystemPath({
  path: _path,
  initial: _initial,
}: { path: string; initial: boolean }) {
  console.log('[NativeIntent] Redirecting system path');
  return '/';
}
