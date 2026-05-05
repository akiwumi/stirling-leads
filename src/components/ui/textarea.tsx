import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-[1rem] border border-[#ece7de] bg-[#fcfbf8] px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#2f5bea]/20",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };
