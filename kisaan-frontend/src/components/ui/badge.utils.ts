import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const userTypeBadgeStyles: Record<string, string> = {
  BUYER: 'bg-[#E0F2FE] text-[#0369A1] border border-[#7DD3FC]',
  FARMER: 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]',
  SHOP: 'bg-[#F3E8FF] text-[#7C3AED] border border-[#C4B5FD]',
};
