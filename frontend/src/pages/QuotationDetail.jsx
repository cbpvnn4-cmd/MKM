import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuotation } from '../services/api';
import { Loader2 } from 'lucide-react';
import QuotationPDF from '../components/pdf/QuotationPDF';
import usePdfPrint from '../hooks/usePdfPrint';

const DEFAULT_NOTES = [
  'السعر لا يشمل أي أعمال مدنية أو كهربائية غير مذكورة.',
  'فترة الضمان سنتان على المحرك وسنة على باقي الأجزاء.',
  'عرض السعر صالح لمدة 30 يوماً من تاريخ الإصدار.',
  'يتم تحديد موعد التركيب بعد استلام الدفعة المقدمة.'
];

const STATUS_META = {
  ACCEPTED: {
    label: 'ساري المفعول',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    dot: 'bg-green-500'
  },
  APPROVED: {
    label: 'ساري المفعول',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    dot: 'bg-green-500'
  },
  ACTIVE: {
    label: 'ساري المفعول',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    dot: 'bg-green-500'
  },
  SENT: {
    label: 'بانتظار الموافقة',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    dot: 'bg-yellow-400'
  },
  DRAFT: {
    label: 'مسودة',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    dot: 'bg-slate-400'
  },
  REJECTED: {
    label: 'مرفوض',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200',
    dot: 'bg-red-500'
  },
  CANCELLED: {
    label: 'ملغى',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200',
    dot: 'bg-red-500'
  },
  EXPIRED: {
    label: 'منتهي',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
    dot: 'bg-rose-500'
  },
  DEFAULT: {
    label: 'ساري المفعول',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    dot: 'bg-green-500'
  }
};

const DETAIL_MARKERS = ['تفاصيل المصعد', 'مواصفات المصعد'];
const FALLBACK_LOGO = '/images/logo.svg';

const formatCurrency = (value, currency = 'USD') => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return '—';
  }
};

const separateNotesSections = (notes = '') => {
  if (!notes) {
    return { notesText: '', detailText: '' };
  }

  for (const marker of DETAIL_MARKERS) {
    const markerIndex = notes.indexOf(marker);
    if (markerIndex !== -1) {
      const detailText = notes
        .slice(markerIndex + marker.length)
        .replace(/^[:\-–\s]+/, '')
        .trim();

      return {
        notesText: notes.slice(0, markerIndex).trim(),
        detailText
      };
    }
  }

  return { notesText: notes, detailText: '' };
};

const parseDetailLines = (text = '') =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(':');
      if (rest.length === 0) {
        return { label: null, value: line };
      }
      return {
        label: label.trim(),
        value: rest.join(':').trim()
      };
    });

const getNotesList = (rawNotes = '') => {
  if (!rawNotes) {
    return DEFAULT_NOTES;
  }
  const lines = rawNotes
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\-\u2022•\s]+/, '').trim())
    .filter(Boolean);
  return lines.length ? lines : DEFAULT_NOTES;
};

const getStatusMeta = (status = '') => {
  if (!status) {
    return STATUS_META.DEFAULT;
  }
  const key = status.toUpperCase();
  return STATUS_META[key] || {
    label: status,
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    dot: 'bg-slate-400'
  };
};

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadQuotation = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getQuotation(id);
        setQuotation(data || null);
        setError('');
      } catch (err) {
        console.error('Error loading quotation:', err);
        const message =
          err?.response?.data?.detail ||
          'تعذر تحميل عرض السعر. حاول مرة أخرى.';
        setError(message);
        setQuotation(null);
      } finally {
        setLoading(false);
      }
    };

    loadQuotation();
  }, [id]);

  const pdfFileName = useMemo(() => `Quotation_${quotation?.quotation_no || id || 'draft'}.pdf`, [quotation, id]);

  const { print: handlePrint, download: handleDownloadPDF, printing, downloading } = usePdfPrint({
    createDocument: () => <QuotationPDF quotation={quotation} />,
    fileName: pdfFileName,
  });

  // Safely derive items and currency to avoid runtime errors during render
  const items =
    Array.isArray(quotation?.items) && quotation.items.length
      ? quotation.items
      : Array.isArray(quotation?.quotation_items)
      ? quotation.quotation_items
      : [];
  const currency = quotation?.currency || 'USD';

  const statusMeta = getStatusMeta(quotation?.status);
  const { notesText: cleanedNotes, detailText: extractedDetails } = separateNotesSections(
    quotation?.notes || ''
  );
  const elevatorDetailsSource =
    quotation?.elevator_details ||
    extractedDetails ||
    (items[0]?.specifications || '');
  const elevatorDetails = parseDetailLines(elevatorDetailsSource);
  const trimmedNotes = (cleanedNotes || '').trim();
  const compiledTermsText = (quotation?.terms_and_conditions || '').trim();
  const termsEntries = compiledTermsText ? getNotesList(compiledTermsText) : [];
  const generalNoteEntries = trimmedNotes ? getNotesList(trimmedNotes) : [];
  const noteLines =
    termsEntries.length > 0
      ? [...termsEntries, ...generalNoteEntries]
      : generalNoteEntries.length > 0
      ? generalNoteEntries
      : getNotesList('');
  const companyLogo =
    quotation?.company_logo_url ||
    quotation?.company_logo ||
    FALLBACK_LOGO;
  const quotationNumber = quotation?.quotation_no || `Q-${id || 'draft'}`;
  const issueDate = formatDate(quotation?.quotation_date);
  const validUntil = formatDate(quotation?.valid_until);

  return (
    <div className="font-display relative flex min-h-screen w-full flex-col bg-gradient-to-b from-[#E3F2FD] to-[#B3E5FC] dark:bg-background-dark">
      <header className="sticky top-0 z-10 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg p-2 shadow-md">
                <img
                  src={companyLogo}
                  alt="شعار الشركة"
                  className="h-10 w-auto object-contain"
                  style={{ maxWidth: '120px' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/images/logo.svg';
                  }}
                />
              </div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                عرض سعر المصاعد
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={!quotation || printing || downloading}
                className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                title="طباعة (ملف PDF موحد)"
              >
                <span className="material-symbols-outlined text-lg">print</span>
                <span>{printing ? 'جارٍ التحضير...' : 'طباعة'}</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={!quotation || printing || downloading}
                className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-200" />
                ) : (
                  <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                )}
                <span>{downloading ? 'جارٍ التحميل...' : 'تحميل PDF'}</span>
              </button>
              <button
                onClick={() => navigate('/quotations')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="العودة إلى قائمة عروض الأسعار"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div
          dir="rtl"
          className="w-full max-w-5xl rounded-xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-white/30 dark:border-slate-800"
        >
          {loading && (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                جاري تحميل عرض السعر...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="p-10 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full">
                <span className="material-symbols-outlined text-3xl text-red-600">error</span>
              </div>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                حدث خطأ أثناء تحميل عرض السعر
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
              <button
                onClick={() => navigate('/quotations')}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-5 py-2 text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
                العودة للقائمة
              </button>
            </div>
          )}

          {!loading && !error && quotation && (
            <>
              <header className="bg-gradient-to-l from-[#1A237E] to-[#303F9F] dark:from-slate-900 dark:to-slate-900 p-6 text-white">
                <div className="flex justify-between items-center gap-6">
                  <div className="bg-white rounded-lg p-3 shadow-lg flex-shrink-0">
                    <img
                      src={companyLogo}
                      alt="شعار الشركة"
                      className="h-16 w-auto object-contain"
                      style={{ maxWidth: '150px', minWidth: '100px' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/logo.svg';
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right flex-1">
                    <p className="text-4xl font-black tracking-tight">عرض سعر</p>
                    <p className="text-base font-normal text-blue-200">
                      رقم عرض السعر: {quotationNumber} | تاريخ الإصدار: {issueDate}
                    </p>
                  </div>
                </div>
              </header>

              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-slate-200 dark:border-slate-700 text-sm">
                <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 lg:border-b-0">
                  <span className="material-symbols-outlined text-lg text-slate-500">business</span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {quotation?.company_name || 'السند للمصاعد - SANAD ELEVATORS'}
                  </p>
                </div>
                <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 lg:border-b-0 lg:border-r">
                  <span className="material-symbols-outlined text-lg text-slate-500">location_on</span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {quotation?.company_address || 'شارع الستين، بغداد، العراق'}
                  </p>
                </div>
                <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 lg:border-b-0 lg:border-r">
                  <span className="material-symbols-outlined text-lg text-slate-500">call</span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {quotation?.company_phone || '+964 770 123 4567'}
                  </p>
                </div>
                <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 lg:border-b-0 lg:border-r">
                  <span className="material-symbols-outlined text-lg text-slate-500">email</span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {quotation?.company_email || 'sales@sanadelevators.com'}
                  </p>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                <div className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                  <p className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-100">موجّه إلى</p>
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <p>
                      <span className="font-bold text-slate-700 dark:text-slate-200">اسم العميل:</span>{' '}
                      {quotation?.customer_name || '—'}
                    </p>
                    <p>
                      <span className="font-bold text-slate-700 dark:text-slate-200">شركة العميل:</span>{' '}
                      {quotation?.customer_company || quotation?.customer_name || '—'}
                    </p>
                    {quotation?.customer_address && (
                      <p>
                        <span className="font-bold text-slate-700 dark:text-slate-200">العنوان:</span>{' '}
                        {quotation.customer_address}
                      </p>
                    )}
                    {(quotation?.contact_email || quotation?.customer_email) && (
                      <p>
                        <span className="font-bold text-slate-700 dark:text-slate-200">جهة الاتصال:</span>{' '}
                        {quotation?.contact_email || quotation?.customer_email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20 p-4 flex flex-col justify-between">
                  <div>
                    <p className="mb-3 text-lg font-bold text-orange-800 dark:text-orange-300">صالح حتى</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">{validUntil}</p>
                  </div>
                  <div className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-sm font-bold ${statusMeta.badge}`}>
                    <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`}></span>
                    {statusMeta.label}
                  </div>
                </div>
              </section>

              <section className="px-6 pb-6">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-slate-800 text-white text-xs uppercase">
                      <tr>
                        <th className="px-6 py-3">#</th>
                        <th className="px-6 py-3 text-left">الوصف</th>
                        <th className="px-6 py-3">الكمية</th>
                        <th className="px-6 py-3 text-left">سعر الوحدة</th>
                        <th className="px-6 py-3 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {items.length === 0 && (
                        <tr>
                          <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                            لا توجد أصناف مضافة في هذا العرض.
                          </td>
                        </tr>
                      )}
                      {items.map((item, index) => {
                        const qty = Number(item.qty || item.quantity || 0);
                        const unit = Number(item.unit_price || item.unitPrice || 0);
                        const discountAmount = Number(item.discount_amount || 0);
                        const lineTotal =
                          item.line_total ?? item.lineTotal ?? qty * unit - discountAmount;

                        return (
                          <tr
                            key={item.id || index}
                            className={
                              index % 2 === 0
                                ? 'bg-white dark:bg-slate-900'
                                : 'bg-slate-50 dark:bg-slate-800/40'
                            }
                          >
                            <td className="px-6 py-4">{index + 1}</td>
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                              <div className="space-y-1">
                                <p>{item.description || '—'}</p>
                                {item.specifications && (
                                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                                    {item.specifications}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-700 dark:text-slate-200 text-center">
                              {qty || '-'}
                            </td>
                            <td className="px-6 py-4 text-slate-700 dark:text-slate-200 text-left">
                              {formatCurrency(unit, currency)}
                            </td>
                            <td className="px-6 py-4 text-left font-bold text-slate-800 dark:text-slate-100">
                              {formatCurrency(lineTotal, currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {elevatorDetails.length > 0 && (
                <section className="px-6 pb-6">
                  <h3 className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-100">تفاصيل المصعد</h3>
                  <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm text-right">
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {elevatorDetails.map((detail, idx) => (
                          <tr
                            key={`${detail.label || 'detail'}-${idx}`}
                            className={
                              idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'
                            }
                          >
                            {detail.label ? (
                              <>
                                <td className="px-6 py-3 font-bold text-slate-600 dark:text-slate-400 w-1/4">
                                  {detail.label}
                                </td>
                                <td className="px-6 py-3 text-slate-800 dark:text-slate-200">
                                  {detail.value}
                                </td>
                              </>
                            ) : (
                              <td className="px-6 py-3 text-slate-800 dark:text-slate-200" colSpan={2}>
                                {detail.value}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {quotation.payment_terms && (
                <section className="px-6 pb-6">
                  <div className="rounded-lg bg-gradient-to-tr from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 p-4">
                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">خطة الدفع</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-line leading-relaxed">
                      {quotation.payment_terms}
                    </p>
                  </div>
                </section>
              )}

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                <div className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
                  <h3 className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-100">الملاحظات والشروط</h3>
                  <ul className="list-disc space-y-2 pr-5 text-sm text-slate-600 dark:text-slate-300">
                    {noteLines.map((note, idx) => (
                      <li key={`note-${idx}`}>{note}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 flex flex-col">
                  <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">الملخص المالي</h3>
                  <div className="space-y-3 text-sm flex-grow">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>المجموع الفرعي</span>
                      <span>{formatCurrency(quotation?.subtotal, currency)}</span>
                    </div>
                    {Number(quotation?.tax_amount) > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>ضريبة القيمة المضافة ({quotation?.tax_percent || 0}%)</span>
                        <span>{formatCurrency(quotation?.tax_amount, currency)}</span>
                      </div>
                    )}
                    {!!Number(quotation?.discount_amount) && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>خصم إضافي</span>
                        <span>-{formatCurrency(quotation?.discount_amount, currency)}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 border-t border-slate-300 dark:border-slate-600 pt-3">
                    <div className="flex justify-between text-xl font-bold text-slate-900 dark:text-white">
                      <span>الإجمالي</span>
                      <span>{formatCurrency(quotation?.total, currency)}</span>
                    </div>
                  </div>
                </div>
              </section>

              <footer className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  شكراً لتعاملكم معنا. هذا المستند صادر إلكترونياً ولا يتطلب توقيعاً.
                </p>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuotationDetail;
