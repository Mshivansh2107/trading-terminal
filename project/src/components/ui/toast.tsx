import React from "react";
import { cn } from "../../lib/utils";
import { Dispatch, SetStateAction, createContext, useContext, useState } from "react";
import { X } from "lucide-react";

type ToastVariant = "default" | "success" | "error" | "warning";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after duration (default 5000ms)
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function getToastClassName(variant: ToastVariant = "default") {
  switch (variant) {
    case "success":
      return "bg-green-100 border-green-500 text-green-900";
    case "error":
      return "bg-red-100 border-red-500 text-red-900";
    case "warning":
      return "bg-yellow-100 border-yellow-500 text-yellow-900";
    default:
      return "bg-white border-gray-200 text-gray-900";
  }
}

function Toast({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  return (
    <div
      className={cn(
        "rounded-md border p-4 shadow-md relative transition-all",
        getToastClassName(toast.variant)
      )}
    >
      <div className="flex justify-between items-start">
        {toast.title && <div className="font-medium">{toast.title}</div>}
        <button
          onClick={onRemove}
          className="text-gray-500 hover:text-gray-700 ml-2"
        >
          <X size={16} />
        </button>
      </div>
      {toast.description && (
        <div className="text-sm mt-1">{toast.description}</div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
} 