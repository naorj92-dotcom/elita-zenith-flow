import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-primary-foreground active:scale-[0.98] hover:-translate-y-0.5 active:translate-y-0 " +
          "bg-[linear-gradient(165deg,hsl(22_20%_36%)_0%,hsl(26_22%_32%)_50%,hsl(30_28%_34%)_100%)] " +
          "shadow-[0_4px_16px_hsl(22_24%_22%/0.15),0_1px_3px_hsl(22_24%_22%/0.1),inset_0_1px_0_hsl(34_30%_45%/0.2)] " +
          "hover:shadow-[0_8px_28px_hsl(22_24%_22%/0.2),0_0_20px_hsl(34_48%_60%/0.08),0_2px_6px_hsl(22_24%_22%/0.1),inset_0_1px_0_hsl(34_30%_45%/0.25)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-card hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-elita-camel underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
        premium:
          "text-white active:scale-[0.98] hover:-translate-y-0.5 active:translate-y-0 " +
          "bg-[linear-gradient(165deg,hsl(30_40%_52%)_0%,hsl(34_48%_56%)_60%,hsl(32_42%_50%)_100%)] " +
          "shadow-[0_4px_16px_hsl(30_40%_40%/0.2),0_0_12px_hsl(34_48%_60%/0.1),inset_0_1px_0_hsl(36_50%_68%/0.25)] " +
          "hover:shadow-[0_8px_28px_hsl(30_40%_40%/0.25),0_0_24px_hsl(34_48%_60%/0.12),inset_0_1px_0_hsl(36_50%_68%/0.3)]",
      },
      size: {
        default: "h-12 px-6 py-2.5 rounded-xl",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-[3.5rem] rounded-2xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
