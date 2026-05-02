import type { ReactNode } from "react";

export function ModalTitle({
  lockedLabel,
  title,
}: {
  lockedLabel?: ReactNode | null;
  title: ReactNode;
}) {
  return (
    <span className="erp-modal-title">
      <span className="erp-modal-title-text">{title}</span>
      {lockedLabel ? <span className="erp-modal-title-locked">{lockedLabel}</span> : null}
    </span>
  );
}
