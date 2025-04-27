import { useToast as useToastProvider } from "./toast";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
}

export function useToast() {
  const { addToast } = useToastProvider();

  return {
    toast: (options: ToastOptions) => {
      addToast(options);
    },
  };
} 