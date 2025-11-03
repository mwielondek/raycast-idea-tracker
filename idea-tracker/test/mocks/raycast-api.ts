import { vi } from "vitest";

export const Toast = { Style: { Success: "success", Failure: "failure" } } as const;
export const Alert = { ActionStyle: { Destructive: "destructive" } } as const;

export const showToast = vi.fn();
export const confirmAlert = vi.fn();
