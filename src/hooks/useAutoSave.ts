import { useRef, useEffect, useState, useCallback } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
    /** The current form data to watch for changes */
    data: T;
    /** The save callback to invoke */
    onSave: (data: T) => Promise<void>;
    /** Debounce delay in ms (default: 1500) */
    delay?: number;
    /** Whether auto-save is enabled (default: true) */
    enabled?: boolean;
}

/**
 * Auto-save hook that debounces form changes and saves automatically.
 *
 * Uses a "settling" period after `enabled` transitions to `true`
 * to let form data fully populate from the database before tracking changes.
 * Only user-initiated edits (after settling) will trigger a save.
 */
export function useAutoSave<T>({
    data,
    onSave,
    delay = 1500,
    enabled = true,
}: UseAutoSaveOptions<T>) {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef<string>("");
    const onSaveRef = useRef(onSave);
    const settlingRef = useRef(true); // Start as settling
    const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevEnabledRef = useRef(false);

    // Always keep the latest onSave reference
    onSaveRef.current = onSave;

    const doSave = useCallback(async (payload: T) => {
        const serialized = JSON.stringify(payload);
        // Don't save if nothing actually changed since last save
        if (serialized === lastSavedRef.current) return;

        setSaveStatus("saving");
        try {
            await onSaveRef.current(payload);
            lastSavedRef.current = serialized;
            setSaveStatus("saved");

            // Reset status after 3s
            setTimeout(() => setSaveStatus("idle"), 3000);
        } catch {
            setSaveStatus("error");
            setTimeout(() => setSaveStatus("idle"), 4000);
        }
    }, []);

    useEffect(() => {
        const serialized = JSON.stringify(data);

        // ── While disabled, keep baseline updated and reset settling ──
        if (!enabled) {
            lastSavedRef.current = serialized;
            prevEnabledRef.current = false;
            settlingRef.current = true;
            if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        // ── Just became enabled → enter settling period ──
        if (!prevEnabledRef.current) {
            prevEnabledRef.current = true;
            settlingRef.current = true;
            lastSavedRef.current = serialized;

            // End settling after 2s — enough time for form useEffects to populate
            if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
            settleTimerRef.current = setTimeout(() => {
                settlingRef.current = false;
            }, 2000);
            return;
        }

        // ── Still settling → just update baseline, don't save ──
        if (settlingRef.current) {
            lastSavedRef.current = serialized;
            return;
        }

        // ── Normal operation: debounced save ──
        if (serialized === lastSavedRef.current) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            void doSave(data);
        }, delay);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [data, delay, enabled, doSave]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
        };
    }, []);

    // Immediate save function (for Ctrl+S)
    const saveNow = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        settlingRef.current = false; // Force out of settling
        void doSave(data);
    }, [data, doSave]);

    return { saveStatus, saveNow };
}
