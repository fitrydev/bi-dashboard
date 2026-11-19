import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap cursor-pointer transition-colors disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border border-primary bg-primary text-primary-foreground hover:opacity-90",
        destructive:
          "border border-destructive bg-destructive text-destructive-foreground hover:opacity-90",
        outline: "border border-rule-strong bg-transparent text-ink hover:bg-surface-sunken",
        secondary:
          "border border-rule bg-secondary text-secondary-foreground hover:bg-surface-sunken",
        ghost: "border border-transparent text-ink hover:bg-surface-sunken",
        link: "min-h-0 border border-transparent px-0 text-ink underline underline-offset-2 hover:decoration-2",
      },
      size: {
        default: "min-h-11 px-3.5 py-2 has-[>svg]:px-3 lg:min-h-9",
        xs: "min-h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-11 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5 lg:min-h-8",
        lg: "min-h-11 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-11 lg:size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-11 lg:size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
