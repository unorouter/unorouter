"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider({
  className,
  "aria-label": ariaLabel,
  ...props
}: SliderPrimitive.Root.Props & { "aria-label"?: string }) {
  const current = props.value ?? props.defaultValue;
  const thumbValues = Array.isArray(current) ? current : null;
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-5 w-full items-center">
        <SliderPrimitive.Track className="bg-muted relative h-1.5 w-full grow overflow-hidden rounded-full">
          <SliderPrimitive.Indicator className="bg-primary absolute h-full" />
        </SliderPrimitive.Track>
        {/* A range value renders one thumb per handle; a scalar keeps the single thumb. */}
        {thumbValues ? (
          thumbValues.map((_, index) => (
            <SliderPrimitive.Thumb
              key={index}
              index={index}
              aria-label={ariaLabel}
              className="border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border-2 shadow-sm transition-shadow focus-visible:ring-4 focus-visible:outline-hidden disabled:opacity-50"
            />
          ))
        ) : (
          <SliderPrimitive.Thumb
            aria-label={ariaLabel}
            className="border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border-2 shadow-sm transition-shadow focus-visible:ring-4 focus-visible:outline-hidden disabled:opacity-50"
          />
        )}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
