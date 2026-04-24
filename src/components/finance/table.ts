import type { TablePaginationConfig } from "antd";

export function standardPagination(
  pagination: false | TablePaginationConfig | undefined,
  totalText: (total: number) => string,
) {
  return pagination
    ? {
        ...pagination,
        itemRender: undefined,
        showSizeChanger: false,
        showTotal: totalText,
      }
    : false;
}
