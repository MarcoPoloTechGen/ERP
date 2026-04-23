type BrandMarkProps = {
  companyLogoUrl?: string | null;
  alt: string;
  className?: string;
};

export default function BrandMark({ companyLogoUrl, alt, className = "" }: BrandMarkProps) {
  const source = companyLogoUrl ?? `${import.meta.env.BASE_URL}app-logo.svg`;
  const fitClassName = companyLogoUrl ? "bg-white object-contain p-1.5" : "object-cover";

  return (
    <img
      src={source}
      alt={alt}
      className={`rounded-2xl ${fitClassName} ${className}`.trim()}
    />
  );
}
