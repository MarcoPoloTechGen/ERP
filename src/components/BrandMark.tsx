import type { CSSProperties } from "react";

type BrandMarkProps = {
  companyLogoUrl?: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
};

export default function BrandMark({ companyLogoUrl, alt, className = "", style }: BrandMarkProps) {
  const source = companyLogoUrl ?? `${import.meta.env.BASE_URL}app-logo.svg`;
  const fitStyle: CSSProperties = companyLogoUrl
    ? { objectFit: "contain", padding: 4, background: "#fff" }
    : { objectFit: "cover" };

  return (
    <img
      src={source}
      alt={alt}
      className={className}
      style={{ borderRadius: 12, ...fitStyle, ...style }}
    />
  );
}
