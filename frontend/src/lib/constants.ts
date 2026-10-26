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
  like: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  dislike: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
  wishlist: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  dietary: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
  constraint: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
  past_experience: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
};
