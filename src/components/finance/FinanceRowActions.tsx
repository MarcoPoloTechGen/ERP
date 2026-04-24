import { Button, Popconfirm, Space } from "antd";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";

type FinanceRowActionsProps = {
  active: boolean;
  cancelLabel: string;
  deleteLoading: boolean;
  deleteTitle: string;
  removeLabel: string;
  detailHref?: string;
  onDelete: () => void;
  onEdit: () => void;
};

export default function FinanceRowActions({
  active,
  cancelLabel,
  deleteLoading,
  deleteTitle,
  detailHref,
  removeLabel,
  onDelete,
  onEdit,
}: FinanceRowActionsProps) {
  if (!active && !detailHref) {
    return null;
  }

  return (
    <Space size="small">
      {active ? (
        <>
          <Button type="text" icon={<Pencil size={16} />} onClick={onEdit} />
          <Popconfirm title={deleteTitle} okText={removeLabel} cancelText={cancelLabel} onConfirm={onDelete}>
            <Button danger type="text" icon={<Trash2 size={16} />} loading={deleteLoading} />
          </Popconfirm>
        </>
      ) : null}
      {detailHref ? (
        <Link href={detailHref}>
          <Button type="text" icon={<ChevronRight size={16} />} />
        </Link>
      ) : null}
    </Space>
  );
}
