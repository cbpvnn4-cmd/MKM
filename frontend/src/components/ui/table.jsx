import React from 'react';
import { cn } from '../../lib/utils';
import { FileX } from 'lucide-react';

/**
 * مكون الجدول الموحد لنظام SANAD ELEVATORS
 * Unified Table Component for SANAD ELEVATORS System
 *
 * @component Table
 * @example
 * <Table
 *   columns={columns}
 *   data={data}
 *   loading={false}
 *   emptyMessage="لا توجد بيانات"
 * />
 */

const Table = React.forwardRef(({
  className,
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  emptyDescription = '',
  showHeader = true,
  striped = true,
  hover = true,
  compact = false,
  ...props
}, ref) => {

  const tableClasses = cn(
    'min-w-full',
    'divide-y',
    'divide-gray-200',
    className
  );

  const theadClasses = cn(
    'bg-gradient-to-r',
    'from-gray-50',
    'to-gray-100'
  );

  const thClasses = cn(
    'px-6',
    'py-4',
    'text-right',
    'text-xs',
    'font-medium',
    'text-gray-700',
    'uppercase',
    'tracking-wider'
  );

  const trBodyClasses = cn(
    hover && 'hover:bg-gray-50',
    'transition-colors',
    'duration-150'
  );

  const tdClasses = cn(
    'px-6',
    'py-4',
    'whitespace-nowrap',
    compact ? 'text-sm' : 'text-sm'
  );

  // حالة التحميل
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // حالة عدم وجود بيانات
  if (!data || data.length === 0) {
    return (
      <div className="p-12 text-center">
        <FileX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{emptyMessage}</h3>
        {emptyDescription && (
          <p className="text-gray-500">{emptyDescription}</p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        ref={ref}
        className={tableClasses}
        {...props}
      >
        {showHeader && (
          <thead className={theadClasses}>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key || index}
                  scope="col"
                  className={cn(
                    thClasses,
                    column.className
                  )}
                  style={column.width ? { minWidth: column.width } : {}}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className={cn('bg-white', striped && 'divide-y', 'divide-gray-200')}>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || row.key || rowIndex}
              className={trBodyClasses}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={column.key || colIndex}
                  className={cn(
                    tdClasses,
                    column.cellClassName
                  )}
                >
                  {column.render ? (
                    column.render(row[column.dataIndex || column.key], row, rowIndex)
                  ) : (
                    row[column.dataIndex || column.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

Table.displayName = 'Table';

/**
 * مكون جدول البيانات المحسّن
 * Enhanced Data Table Component
 */
const DataTable = React.forwardRef(({
  // البيانات
  columns = [],
  data = [],

  // التحميل والحالة الفارغة
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  emptyDescription = '',

  // التصميم
  striped = true,
  hover = true,
  compact = false,
  showHeader = true,

  // الإجراءات
  onRowClick = null,
  selectedRowId = null,

  // الفلاتر والبحث
  filter = null,
  searchQuery = '',

  // الصفحات
  pagination = false,
  currentPage = 1,
  pageSize = 10,
  totalPages = 1,
  onPageChange = null,

  // إضافية
  className = '',
  ...props
}, ref) => {

  // تصفية البيانات
  const filteredData = React.useMemo(() => {
    if (!filter || !searchQuery) return data;

    return data.filter(row => {
      return Object.keys(filter).some(key => {
        const value = row[key];
        return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  }, [data, filter, searchQuery]);

  // تقسيم البيانات حسب الصفحات
  const paginatedData = React.useMemo(() => {
    if (!pagination) return filteredData;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, pagination, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      <Table
        ref={ref}
        columns={columns}
        data={paginatedData}
        loading={loading}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        showHeader={showHeader}
        striped={striped}
        hover={hover}
        compact={compact}
        className={className}
        {...props}
      />

      {/* التصفح */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700">
            عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, filteredData.length)} من {filteredData.length}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              السابق
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange && onPageChange(pageNum)}
                  className={cn(
                    'px-3 py-1 text-sm border rounded-lg',
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

DataTable.displayName = 'DataTable';

export { Table, DataTable };
