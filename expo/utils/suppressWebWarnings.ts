import { Platform } from 'react-native';

type ConsoleErrorFn = (...args: unknown[]) => void;

interface PatchableConsole {
  error: ConsoleErrorFn;
  __toxiscanWarningsPatched?: boolean;
}

/**
 * react-native-web 0.21's `ScrollView` renders its inner content container with
 * `collapsable={false}` — a native-only Android view-flattening hint. RNW does
 * not strip the prop, so React logs a benign
 * "Received `false` for a non-boolean attribute `collapsable`" error for every
 * ScrollView / FlatList on web. It has zero runtime effect but surfaces in the
 * preview error overlay.
 *
 * This silences ONLY that exact warning (web only). Every other log — including
 * real "non-boolean attribute" warnings for other props — passes through
 * untouched.
 */
export function suppressBenignWebWarnings(): void {
  if (Platform.OS !== 'web') return;

  const target = console as unknown as PatchableConsole;
  if (target.__toxiscanWarningsPatched === true) return;

  const originalError: ConsoleErrorFn = target.error.bind(console);

  target.error = (...args: unknown[]): void => {
    const format = args[0];
    const isCollapsableWarning =
      typeof format === 'string' &&
      format.includes('non-boolean attribute') &&
      args.some((arg) => arg === 'collapsable');

    if (isCollapsableWarning) return;

    originalError(...args);
  };

  target.__toxiscanWarningsPatched = true;
}
