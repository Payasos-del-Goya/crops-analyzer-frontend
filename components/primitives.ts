import { tv } from "tailwind-variants";

export const title = tv({
  base: "tracking-tight inline font-semibold",
  variants: {
    color: {
      green: "from-[#22c55e] to-[#16a34a]",
      lime: "from-[#84cc16] to-[#22c55e]",
      emerald: "from-[#34d399] to-[#059669]",
      teal: "from-[#2dd4bf] to-[#0d9488]",
      cyan: "from-[#22d3ee] to-[#06b6d4]",
      foreground: "from-[#f0faf2] to-[#81c784]",
    },
    size: {
      sm: "text-3xl lg:text-4xl",
      md: "text-[2.3rem] lg:text-5xl",
      lg: "text-4xl lg:text-6xl",
    },
    fullWidth: {
      true: "w-full block",
    },
  },
  defaultVariants: {
    size: "md",
  },
  compoundVariants: [
    {
      color: ["green", "lime", "emerald", "teal", "cyan", "foreground"],
      class: "bg-clip-text text-transparent bg-gradient-to-b",
    },
  ],
});

export const subtitle = tv({
  base: "w-full md:w-1/2 my-2 text-lg lg:text-xl text-muted block max-w-full",
  variants: {
    fullWidth: {
      true: "!w-full",
    },
  },
  defaultVariants: {
    fullWidth: true,
  },
});
