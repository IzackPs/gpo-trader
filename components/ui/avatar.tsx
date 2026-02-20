import * as React from "react";
import { cn } from "@/lib/utils";

const DEFAULT_AVATAR =
  "https://cdn.discordapp.com/embed/avatars/0.png";

export interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLImageElement, AvatarProps>(
  ({ src, alt = "", className, fallback = DEFAULT_AVATAR, ...props }, ref) => (
    <img
      ref={ref}
      src={src ?? fallback}
      alt={alt}
      width={40}
      height={40}
      className={cn(
        "size-10 rounded-full border border-slate-700 object-cover shrink-0",
        className
      )}
      loading="lazy"
      decoding="async"
      {...props}
    />
  )
);
Avatar.displayName = "Avatar";

export { Avatar };
