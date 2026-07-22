import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "duration-micro inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ease-in transition-colors hover:ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: { size: "default", variant: "default" },
    variants: {
      size: { default: "h-9 px-4 py-2", icon: "size-9", sm: "h-8 px-3" },
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border bg-background hover:bg-muted",
        ghost: "hover:bg-muted",
      },
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ asChild = false, className, size, variant, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ className, size, variant }))} {...props} />;
}

export { Button, buttonVariants };
