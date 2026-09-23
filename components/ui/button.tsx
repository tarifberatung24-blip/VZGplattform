import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-bold tracking-[0.01em] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-none hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-none hover:bg-destructive/90",
        outline: "border border-border bg-background text-foreground hover:border-foreground hover:bg-secondary",
        secondary: "border border-border bg-secondary text-secondary-foreground shadow-none hover:bg-background",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm gap-1.5 px-3",
        lg: "h-11 rounded-sm px-6",
        icon: "size-9",
        "icon-xs": "size-6 rounded-sm gap-1 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

type ButtonProps = React.ComponentPropsWithoutRef<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }))
    if (asChild) {
      return React.cloneElement(children as React.ReactElement<{ className?: string; ref?: React.Ref<HTMLButtonElement> }>, {
        ...props,
        className: cn(classes, (children as React.ReactElement<{ className?: string }>).props.className),
      })
    }
    return <button ref={ref} className={classes} {...props}>{children}</button>
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
