import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  if (type === "password") {
    return (
      <div className="relative w-full flex items-center">
        <input
          type={showPassword ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    );
  }

  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
