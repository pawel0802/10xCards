import React, { useEffect } from "react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = "success", onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => {
      clearTimeout(timer);
    };
  }, [onClose, duration]);

  return (
    <div
      className={cn(
        "fixed right-6 bottom-6 z-50 rounded px-4 py-2 text-white shadow-lg",
        type === "success" ? "bg-green-600" : "bg-red-600",
      )}
    >
      {message}
    </div>
  );
};

export default Toast;
