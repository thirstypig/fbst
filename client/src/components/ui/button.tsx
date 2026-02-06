import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--fbst-accent)] text-white shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "liquid-glass border-white/10 hover:bg-white/10 text-[var(--fbst-text-primary)] font-bold",
        secondary:
          "bg-white/5 text-[var(--fbst-text-primary)] border border-white/10 hover:bg-white/10 font-bold",
        ghost: "hover:bg-white/5 text-[var(--fbst-text-secondary)] hover:text-[var(--fbst-text-primary)] font-medium",
        link: "text-[var(--fbst-accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2 rounded-2xl",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-12 rounded-3xl px-10 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
