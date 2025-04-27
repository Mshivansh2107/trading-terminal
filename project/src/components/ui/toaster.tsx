import { ToastProvider, ToastContainer } from "./toast";

export function Toaster() {
  return (
    <ToastProvider>
      <ToastContainer />
    </ToastProvider>
  );
} 