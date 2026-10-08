import { useState } from "react";
import { cn } from "@/utils/cn";

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md";
}

export default function StarRating({ rating, onChange, size = "sm" }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const starSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="inline-flex gap-0.5" onClick={(e) => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star === rating ? 0 : star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={cn(
            "transition-colors",
            starSize,
            onChange ? "cursor-pointer" : "cursor-default",
            (hover || rating) >= star
              ? "text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          )}
        >
          {"\u2605"}
        </button>
      ))}
    </div>
  );
}
