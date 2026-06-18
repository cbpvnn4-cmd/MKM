import React from 'react';
import { cn } from '../../lib/utils';

/**
 * مكون زر الأيقونة الموحد لنظام SANAD ELEVATORS
 * Unified Icon Button Component for SANAD ELEVATORS System
 *
 * @component IconButton
 * @example
 * <IconButton variant="view" onClick={handleView} />
 * <IconButton variant="edit" onClick={handleEdit} />
 * <IconButton variant="delete" onClick={handleDelete} />
 */

const iconButtonVariants = {
  // زر العرض/الطباعة
  view: "bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200",
  'view-blue': "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200",

  // زر التعديل
  edit: "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200",
  'edit-purple': "bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200",

  // زر الحذف
  delete: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200",
  'delete-ghost': "text-red-600 hover:bg-red-50",

  // زر التأكيد/النجاح
  confirm: "bg-green-50 hover:bg-green-100 text-green-600 border border-green-200",
  'confirm-solid': "bg-green-600 text-white hover:bg-green-700",

  // زر التحذير
  warning: "bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200",
  'warning-solid': "bg-amber-500 text-white hover:bg-amber-600",

  // زر المعلومات
  info: "bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border border-cyan-200",
  'info-solid': "bg-cyan-500 text-white hover:bg-cyan-600",

  // زر محايد
  ghost: "text-slate-600 hover:bg-slate-100",
  secondary: "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200",

  // زر أساسي
  primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md",
  'primary-solid': "bg-cyan-500 text-white hover:bg-cyan-600 shadow-sm"
};

const sizes = {
  xs: "p-1 rounded-md",
  sm: "p-1.5 rounded-md",
  md: "p-2 rounded-lg",
  lg: "p-2.5 rounded-lg",
  xl: "p-3 rounded-xl"
};

const IconButton = React.forwardRef(({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  disabled = false,
  title,
  ...props
}, ref) => {

  const classes = cn(
    "inline-flex",
    "items-center",
    "justify-center",
    "transition-all",
    "duration-200",
    "focus:outline-none",
    "focus:ring-2",
    "focus:ring-offset-1",
    "disabled:opacity-50",
    "disabled:cursor-not-allowed",
    "disabled:pointer-events-none",
    "hover:shadow-sm",
    iconButtonVariants[variant] || iconButtonVariants.ghost,
    sizes[size] || sizes.md,
    className
  );

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled}
      title={title}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';

/**
 * مكون مجموعة أزرار الإجراءات الموحد
 * Unified Action Buttons Group Component
 *
 * @component ActionButtons
 * @example
 * <ActionButtons
 *   onView={() => navigate(`/items/${id}`)}
 *   onEdit={() => navigate(`/items/${id}/edit`)}
 *   onDelete={() => handleDelete(id)}
 * />
 */
const ActionButtons = React.forwardRef(({
  onView,
  onEdit,
  onDelete,
  onConfirm,
  viewTitle = 'عرض',
  editTitle = 'تعديل',
  deleteTitle = 'حذف',
  confirmTitle = 'تأكيد',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}, ref) => {

  const { Eye, Edit, Trash2, Check } = require('lucide-react');

  return (
    <div
      ref={ref}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {onView && (
        <IconButton
          variant="view"
          size={size}
          disabled={disabled}
          title={viewTitle}
          onClick={onView}
        >
          <Eye className="w-4 h-4" />
        </IconButton>
      )}

      {onEdit && (
        <IconButton
          variant="edit"
          size={size}
          disabled={disabled}
          title={editTitle}
          onClick={onEdit}
        >
          <Edit className="w-4 h-4" />
        </IconButton>
      )}

      {onConfirm && (
        <IconButton
          variant="confirm-solid"
          size={size}
          disabled={disabled}
          title={confirmTitle}
          onClick={onConfirm}
        >
          <Check className="w-4 h-4" />
        </IconButton>
      )}

      {onDelete && (
        <IconButton
          variant="delete"
          size={size}
          disabled={disabled}
          title={deleteTitle}
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </IconButton>
      )}
    </div>
  );
});

ActionButtons.displayName = 'ActionButtons';

export { IconButton, iconButtonVariants, ActionButtons };
