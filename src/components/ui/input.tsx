import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#2f5bea]/20",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
