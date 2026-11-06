import { ReactNode } from 'react'

export interface DataTableColumn<Row> {
  key: string
  header: string
  render: (row: Row) => ReactNode
  numeric?: boolean
}

export interface DataTableProps<Row> {
  caption: string
  columns: Array<DataTableColumn<Row>>
  rows: Row[]
  rowKey: (row: Row) => string
  emptyMessage?: string
}

export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records available.',
}: DataTableProps<Row>) {
  return (
    <div
      className="cf-ui overflow-x-auto rounded-cf-md border-3 border-strong-border bg-surface shadow-brutal"
      role="region"
      aria-label={`${caption} table, horizontally scrollable`}
      tabIndex={0}
    >
      <table className="min-w-full border-collapse text-left text-cf-sm text-ink">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-action">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`border-b-3 border-strong-border px-cf-3 py-cf-2 font-extrabold ${column.numeric ? 'text-right' : ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-cf-3 py-cf-4 text-ink-muted" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : rows.map((row) => (
            <tr key={rowKey(row)} className="border-b-2 border-strong-border last:border-b-0 hover:bg-surface-muted">
              {columns.map((column) => (
                <td key={column.key} className={`px-cf-3 py-cf-3 align-top ${column.numeric ? 'text-right font-mono' : ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
