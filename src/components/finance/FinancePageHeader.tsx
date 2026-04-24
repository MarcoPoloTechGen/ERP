import { Button, Col, Row, Space, Typography } from "antd";
import { Download, FileSpreadsheet, Plus } from "lucide-react";

type FinancePageHeaderProps = {
  addLabel: string;
  countText: string;
  excelLabel: string;
  rowsLength: number;
  title: string;
  onAdd: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
};

export default function FinancePageHeader({
  addLabel,
  countText,
  excelLabel,
  rowsLength,
  title,
  onAdd,
  onExportCsv,
  onExportExcel,
}: FinancePageHeaderProps) {
  return (
    <Row align="bottom" gutter={[16, 16]} justify="space-between">
      <Col>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {title}
        </Typography.Title>
        <Typography.Text type="secondary">{countText}</Typography.Text>
      </Col>
      <Col>
        <Space wrap>
          <Button icon={<Download size={16} />} disabled={!rowsLength} onClick={onExportCsv}>
            CSV
          </Button>
          <Button icon={<FileSpreadsheet size={16} />} disabled={!rowsLength} onClick={onExportExcel}>
            {excelLabel}
          </Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={onAdd}>
            {addLabel}
          </Button>
        </Space>
      </Col>
    </Row>
  );
}
