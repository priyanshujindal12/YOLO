// Minimal shadcn-compatible Avatar — drop-in replaceable once you run `npx shadcn add avatar`
import { type HTMLAttributes, type ImgHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

// ── Avatar root ───────────────────────────────────────────────────────────────
export const Avatar = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      "relative flex shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
Avatar.displayName = "Avatar";

// ── AvatarImage ───────────────────────────────────────────────────────────────
export const AvatarImage = forwardRef<
  HTMLImageElement,
  ImgHTMLAttributes<HTMLImageElement>
>(({ className, src, alt = "", ...props }, ref) => {
  if (!src) return null;
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={clsx("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

// ── AvatarFallback ────────────────────────────────────────────────────────────
export const AvatarFallback = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      "flex h-full w-full items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/70",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";
