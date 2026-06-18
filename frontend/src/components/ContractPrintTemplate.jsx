import React, { forwardRef } from 'react';

const formatCurrency = (value, currency = 'USD') => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (err) {
    return '—';
  }
};

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (err) {
    return '—';
  }
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatNumber = (value, fractionDigits = 0) => {
  const numeric = toNumberOrNull(value);
  if (numeric === null) {
    return '—';
  }
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const valueOrDash = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : '—';
};

const statusLabels = {
  DRAFT: 'مسودة',
  ACTIVE: 'نشط',
  COMPLETED: 'مكتمل',
  TERMINATED: 'ملغي',
};

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  TERMINATED: 'bg-red-100 text-red-700',
};

const milestoneStatusLabels = {
  PENDING: 'قيد الانتظار',
  IN_PROGRESS: 'قيد التنفيذ',
  COMPLETED: 'مكتمل',
  OVERDUE: 'متأخر',
};

const milestoneStatusColors = {
  PENDING: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

const ContractPrintTemplate = forwardRef(({
  contract,
  milestones = [],
}, ref) => {
  if (!contract) {
    return null;
  }

  const contractNumber = valueOrDash(contract.contract_no);
  const issueDate = formatDate(contract.contract_date);
  const startDate = formatDate(contract.start_date);
  const endDate = formatDate(contract.end_date);
  const signedDate = formatDate(contract.signed_date);
  
  const statusLabel = statusLabels[contract.status] || contract.status || 'مسودة';
  const statusColor = statusColors[contract.status] || 'bg-gray-100 text-gray-700';
  
  const customerName = valueOrDash(contract.customer_name);
  const customerPhone = valueOrDash(contract.customer_phone);
  const customerEmail = valueOrDash(contract.customer_email);
  const customerAddress = valueOrDash(contract.customer_address);
  
  const companySigner = valueOrDash(contract.signed_by_company);
  const customerSigner = valueOrDash(contract.signed_by_customer);

  // Filter milestones if provided, otherwise use contract milestones
  const contractMilestones = Array.isArray(milestones) && milestones.length > 0 
    ? milestones 
    : (Array.isArray(contract.milestones) ? contract.milestones : []);
  
  const completedMilestones = contractMilestones.filter(m => m.status === 'COMPLETED').length;
  const totalMilestones = contractMilestones.length;
  const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <div
      ref={ref}
      className="bg-white text-gray-900 max-w-[210mm] mx-auto p-8"
      style={{ minHeight: '297mm', fontFamily: 'system-ui, -apple-system, sans-serif' }}
      dir="rtl"
    >
      {/* Page Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-1">شركة سند للمصاعد</h1>
          <p className="text-sm text-gray-600">SANAD ELEVATORS COMPANY</p>
          <p className="text-sm text-gray-500 mt-2">بغداد - العراق</p>
        </div>
        <div className="text-left">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">CONTRACT</p>
          <p className="text-3xl font-black text-gray-900">{contractNumber}</p>
        </div>
      </div>

      {/* Contract Status and Amount */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              عقد رقم {contractNumber}
            </h2>
            <div className="flex items-center gap-4">
              <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
              <span className="text-sm text-slate-500">
                تاريخ العقد: {issueDate}
              </span>
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm text-slate-500 mb-1">المبلغ الإجمالي</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(contract.total_amount, contract.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Parties Information */}
      <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200">
        {/* Company Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">الطرف الأول - الشركة</h3>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-blue-700">اسم الشركة</span>
              <span className="text-blue-900 font-medium">شركة سند للمصاعد</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-blue-700">الممثل</span>
              <span className="text-blue-900 font-medium">{companySigner}</span>
            </div>
            {signedDate !== '—' && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-blue-700">تاريخ التوقيع</span>
                <span className="text-blue-900 font-medium">{signedDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-green-900 mb-4">الطرف الثاني - العميل</h3>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-green-700">اسم العميل</span>
              <span className="text-green-900 font-medium">{customerName}</span>
            </div>
            {customerPhone !== '—' && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-green-700">رقم الهاتف</span>
                <span className="text-green-900 font-medium">{customerPhone}</span>
              </div>
            )}
            {customerEmail !== '—' && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-green-700">البريد الإلكتروني</span>
                <span className="text-green-900 font-medium">{customerEmail}</span>
              </div>
            )}
            {customerAddress !== '—' && (
              <div className="grid grid-cols-1 gap-2">
                <span className="text-green-700">العنوان</span>
                <span className="text-green-900 font-medium">{customerAddress}</span>
              </div>
            )}
            {customerSigner !== '—' && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-green-700">الموقع من قبل</span>
                <span className="text-green-900 font-medium">{customerSigner}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">الجدول الزمني</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-2">📋</div>
            <p className="text-sm text-gray-500">تاريخ العقد</p>
            <p className="font-semibold text-gray-900">{issueDate}</p>
          </div>
          {startDate !== '—' && (
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">🚀</div>
              <p className="text-sm text-blue-600">تاريخ البدء</p>
              <p className="font-semibold text-blue-900">{startDate}</p>
            </div>
          )}
          {endDate !== '—' && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm text-green-600">تاريخ الانتهاء</p>
              <p className="font-semibold text-green-900">{endDate}</p>
            </div>
          )}
        </div>
      </div>

      {/* Milestones and Payments */}
      {totalMilestones > 0 && (
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">المعالم والدفعات</h3>
            <div className="text-sm text-slate-600">
              {completedMilestones} من {totalMilestones} مكتمل ({milestoneProgress.toFixed(0)}%)
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${milestoneProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-sm text-gray-500 border-b-2 border-gray-200">
                <tr>
                  <th className="font-semibold p-3 text-center w-12">رقم</th>
                  <th className="font-semibold p-3 text-right">المعلم</th>
                  <th className="font-semibold p-3 text-right w-20">الحالة</th>
                  <th className="font-semibold p-3 text-right w-24">تاريخ الاستحقاق</th>
                  <th className="font-semibold p-3 text-right w-32">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {contractMilestones.map((milestone, idx) => (
                  <tr key={milestone.id || idx} className="border-b border-gray-200">
                    <td className="p-3 text-center">{idx + 1}</td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-gray-900">{valueOrDash(milestone.milestone_name)}</p>
                        {milestone.description && (
                          <p className="text-xs text-gray-500 mt-1">{valueOrDash(milestone.description)}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        milestoneStatusColors[milestone.status] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {milestoneStatusLabels[milestone.status] || milestone.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">{formatDate(milestone.due_date)}</td>
                    <td className="p-3 text-right font-semibold text-gray-900">
                      {formatCurrency(milestone.payment_amount, contract.currency)}
                      {milestone.payment_percent > 0 && (
                        <span className="text-xs text-gray-500 block">
                          ({milestone.payment_percent}%)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Terms and Conditions */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">الشروط والأحكام</h3>
        <div className="space-y-6">
          {/* Payment Terms */}
          {contract.payment_terms && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-bold text-amber-900 mb-2">شروط الدفع</h4>
              <p className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">
                {contract.payment_terms}
              </p>
            </div>
          )}

          {/* Delivery Terms */}
          {contract.delivery_terms && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-900 mb-2">شروط التسليم</h4>
              <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                {contract.delivery_terms}
              </p>
            </div>
          )}

          {/* Warranty Terms */}
          {contract.warranty_terms && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-bold text-purple-900 mb-2">شروط الضمان</h4>
              <p className="text-sm text-purple-800 whitespace-pre-wrap leading-relaxed">
                {contract.warranty_terms}
              </p>
            </div>
          )}

          {/* Terms and Conditions */}
          {contract.terms_and_conditions && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-bold text-gray-900 mb-2">الشروط والأحكام العامة</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {contract.terms_and_conditions}
              </p>
            </div>
          )}

          {/* Penalties Clause */}
          {contract.penalties_clause && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-900 mb-2">بنود الغرامات</h4>
              <p className="text-sm text-red-800 whitespace-pre-wrap leading-relaxed">
                {contract.penalties_clause}
              </p>
            </div>
          )}

          {/* Termination Clause */}
          {contract.termination_clause && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-bold text-orange-900 mb-2">شروط الإلغاء</h4>
              <p className="text-sm text-orange-800 whitespace-pre-wrap leading-relaxed">
                {contract.termination_clause}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {contract.notes && (
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-bold text-yellow-900 mb-2">ملاحظات</h4>
            <p className="text-sm text-yellow-800 whitespace-pre-wrap leading-relaxed">
              {contract.notes}
            </p>
          </div>
        </div>
      )}

      {/* Signatures Section */}
      <div className="mt-12 pt-8 border-t-2 border-gray-200">
        <div className="grid grid-cols-2 gap-12">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900 mb-8">الطرف الأول - الشركة</p>
            <div className="border-t-2 border-gray-800 pt-2 mb-4">
              <p className="text-sm text-gray-600">{companySigner}</p>
            </div>
            <p className="text-xs text-gray-500">التوقيع والختم</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900 mb-8">الطرف الثاني - العميل</p>
            <div className="border-t-2 border-gray-800 pt-2 mb-4">
              <p className="text-sm text-gray-600">{customerSigner}</p>
            </div>
            <p className="text-xs text-gray-500">التوقيع</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-8 text-sm">
          <div>
            <h4 className="font-bold mb-2 text-gray-900">الشروط والأحكام</h4>
            <p className="text-gray-600">هذا العقد خاضع للشروط والأحكام المذكورة أعلاه.</p>
          </div>
          <div>
            <h4 className="font-bold mb-2 text-gray-900">المعلومات البنكية</h4>
            <p className="text-gray-600">البنك: البنك التجاري العراقي</p>
            <p className="text-gray-600">رقم الحساب: XXXX-XXXX-XXXX</p>
          </div>
          <div>
            <h4 className="font-bold mb-2 text-gray-900">معلومات الاتصال</h4>
            <p className="text-gray-600" dir="ltr">+964 XXX XXX XXXX</p>
            <p className="text-gray-600">info@sanadelevators.com</p>
            <p className="text-gray-600">www.sanadelevators.com</p>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">
          تاريخ إنشاء العقد: {formatDateTime(new Date())}
        </p>
      </div>
    </div>
  );
});

ContractPrintTemplate.displayName = 'ContractPrintTemplate';

export default ContractPrintTemplate;