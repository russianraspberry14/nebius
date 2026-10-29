import { FactCategory, Sentiment } from "@/lib/api";

export const FACT_CATEGORIES: FactCategory[] = [
  "like",
  "dislike",
  "wishlist",
  "dietary",
  "constraint",
  "past_experience",
];

export const SENTIMENTS: Sentiment[] = ["positive", "negative", "neutral"];

export const CATEGORY_LABEL: Record<FactCategory, string> = {
  like: "Like",
  dislike: "Dislike",
  wishlist: "Wishlist",
  dietary: "Dietary",
  constraint: "Constraint",
  past_experience: "Past experience",
};

export const CATEGORY_COLOR: Record<FactCategory, string> = {
  like: "bg-sage-soft text-sage-ink border-sage/30",
  dislike: "bg-rose-soft text-rose-ink border-rose/30",
  wishlist: "bg-amber-soft text-amber-ink border-amber/30",
  dietary: "bg-clay-soft text-clay-hover border-clay/30",
  constraint: "bg-plum-soft text-plum-ink border-plum/30",
  past_experience: "bg-paper-raised text-ink-muted border-border-strong",
};
