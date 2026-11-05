import { useEffect, useState } from "react";

/**
 * Returns `value` only after it stopped changing for `delayMs`. Feed it what
 * the user types and use the result in query keys or request effects, so a
 * request goes out once the user pauses instead of on every keystroke. The
 * input itself should keep using the live value.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(timeout);
    }, [value, delayMs]);

    return debounced;
}
