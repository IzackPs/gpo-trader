import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const DEFAULT_AVATAR =
  "https://cdn.discordapp.com/embed/avatars/0.png";

const SIZE = 40;

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback?: string;
  width?: number;
  height?: number;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt = "",
      className,
      fallback = DEFAULT_AVATAR,
      width = SIZE,
      height = SIZE,
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn("relative shrink-0 overflow-hidden rounded-full", className)}
      style={{ width, height }}
    >
      <Image
        src={src ?? fallback}
        alt={alt}
        width={width}
        height={height}
        className="object-cover"
        sizes={`${width}px`}
      />
    </div>
  )
);
Avatar.displayName = "Avatar";

export { Avatar };
