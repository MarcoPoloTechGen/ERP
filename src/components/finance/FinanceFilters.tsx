import { Button, Card, Col, Input, Row, Select } from "antd";
import type { Currency } from "@/lib/erp";

type NamedOption = {
  id: number;
  name: string;
};

type FinanceFiltersProps<TStatus extends string> = {
  allCurrenciesLabel: string;
  allProjectsLabel: string;
  clearLabel: string;
  currencyValue: Currency | "all";
  dateFrom: string;
  dateTo: string;
  hasFilters: boolean;
  projectValue: string;
  projects?: NamedOption[];
  searchPlaceholder: string;
  searchValue: string;
  onClear: () => void;
  onCurrencyChange: (value: Currency | "all") => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  allStatusesLabel?: string;
  allSuppliersLabel?: string;
  statusOptions?: Array<{ label: string; value: TStatus }>;
  statusValue?: TStatus | "all";
  suppliers?: NamedOption[];
  supplierValue?: string;
  onStatusChange?: (value: TStatus | "all") => void;
  onSupplierChange?: (value: string) => void;
};

export default function FinanceFilters<TStatus extends string>({
  allCurrenciesLabel,
  allProjectsLabel,
  allStatusesLabel,
  allSuppliersLabel,
  clearLabel,
  currencyValue,
  dateFrom,
  dateTo,
  hasFilters,
  projectValue,
  projects,
  searchPlaceholder,
  searchValue,
  statusOptions,
  statusValue,
  suppliers,
  supplierValue,
  onClear,
  onCurrencyChange,
  onDateFromChange,
  onDateToChange,
  onProjectChange,
  onSearchChange,
  onStatusChange,
  onSupplierChange,
}: FinanceFiltersProps<TStatus>) {
  return (
    <Card size="small">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Input
            allowClear
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </Col>
        {statusOptions && statusValue != null && onStatusChange ? (
          <Col xs={24} md={12} lg={4}>
            <Select
              value={statusValue}
              style={{ width: "100%" }}
              onChange={(value) => onStatusChange(value as TStatus | "all")}
              options={[
                { label: allStatusesLabel ?? "All", value: "all" },
                ...statusOptions,
              ]}
            />
          </Col>
        ) : null}
        <Col xs={24} md={12} lg={4}>
          <Select
            value={projectValue}
            style={{ width: "100%" }}
            onChange={onProjectChange}
            options={[
              { label: allProjectsLabel, value: "all" },
              ...(projects?.map((project) => ({ label: project.name, value: String(project.id) })) ?? []),
            ]}
          />
        </Col>
        {supplierValue != null && suppliers && onSupplierChange ? (
          <Col xs={24} md={12} lg={4}>
            <Select
              value={supplierValue}
              style={{ width: "100%" }}
              onChange={onSupplierChange}
              options={[
                { label: allSuppliersLabel ?? "All", value: "all" },
                ...(suppliers.map((supplier) => ({ label: supplier.name, value: String(supplier.id) })) ?? []),
              ]}
            />
          </Col>
        ) : null}
        <Col xs={24} md={12} lg={4}>
          <Select<Currency | "all">
            value={currencyValue}
            style={{ width: "100%" }}
            onChange={onCurrencyChange}
            options={[
              { label: allCurrenciesLabel, value: "all" },
              { label: "USD", value: "USD" },
              { label: "IQD", value: "IQD" },
            ]}
          />
        </Col>
        <Col xs={24} md={8} lg={4}>
          <Input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
        </Col>
        <Col xs={24} md={8} lg={4}>
          <Input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
        </Col>
        <Col xs={24} md={8} lg={4}>
          <Button block disabled={!hasFilters} onClick={onClear}>
            {clearLabel}
          </Button>
        </Col>
      </Row>
    </Card>
  );
}
