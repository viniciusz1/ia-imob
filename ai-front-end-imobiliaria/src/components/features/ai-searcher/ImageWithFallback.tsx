"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageWithFallbackProps = React.ImgHTMLAttributes<HTMLImageElement>;

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const handleError = () => {
    setDidError(true);
  };

  const { src, alt, style, className, ...rest } = props;

  if (didError || !src) {
    return (
      <div
        role="img"
        aria-label="Erro ao carregar imagem"
        data-original-url={typeof src === "string" ? src : undefined}
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        style={style}
      >
        <ImageOff className="size-8 opacity-60" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  );
}
