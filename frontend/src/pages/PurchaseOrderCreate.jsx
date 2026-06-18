import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PurchaseOrderForm from '../components/PurchaseOrderFormImproved';
import { useConfirmations } from '../components/ui/ConfirmDialog';
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Package,
  DollarSign,
  CheckCircle,
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';

const OVERVIEW_CARDS = [
  { title: 'البيانات الأساسية', description: 'حدّد المورد، المستودع، وأرقام الطلب', icon: FileText, accent: 'bg-sky-100 text-sky-700' },
  { title: 'بنود الطلب', description: 'أضف المنتجات أو المصاعد مع تفاصيلها بسهولة', icon: Package, accent: 'bg-emerald-100 text-emerald-700' },
  { title: 'الدفعات', description: 'وزّع الجدول الزمني للدفع وتحقق من رأس المال', icon: DollarSign, accent: 'bg-amber-100 text-amber-700' },
  { title: 'المراجعة والحفظ', description: 'راجع الملخص المالي قبل الإرسال النهائي', icon: CheckCircle, accent: 'bg-indigo-100 text-indigo-700' }
];

const PurchaseOrderCreate = () => {
  const navigate = useNavigate();
  const { confirmCustom } = useConfirmations();
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = () => {
    try {
      setShowSuccess(true);
      setError(null);
      setTimeout(() => {
        navigate('/purchase-orders');
      }, 3000);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ أمر الشراء، يرجى المحاولة لاحقاً.');
      setShowSuccess(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirmCustom('هل أنت متأكد من إلغاء إنشاء أمر الشراء؟ سيتم فقدان البيانات غير المحفوظة.');
    if (confirmed) {
      navigate('/purchase-orders');
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-emerald-50 p-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">تم إنشاء أمر الشراء بنجاح!</h2>
          <p className="text-slate-600 mb-6">سيتم توجيهك إلى قائمة أوامر الشراء خلال لحظات...</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-indigo-600 to-slate-900" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_transparent_55%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between text-white">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 border border-white/20 backdrop-blur">
                <ClipboardList className="w-4 h-4" />
                <span className="text-sm font-medium">إعداد أمر شراء جديد</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">واجهة حديثة لإنشاء أوامر الشراء</h1>
                <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                  قُم بإدارة تفاصيل المورد والمستودع والدفعات من خلال خطوات واضحة وجدول مُحسّن يسهل قراءته.
                  تم تنظيم الصفحة لتقليل الأخطاء وتقديم نظرة مالية مباشرة قبل الحفظ.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {OVERVIEW_CARDS.map(({ title, description, icon: Icon, accent }) => (
                  <div key={title} className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <h2 className="text-sm font-semibold">{title}</h2>
                    </div>
                    <p className="text-xs text-white/80">{description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 max-w-lg">
              <p className="text-sm/relaxed">
                واجهة حديثة لإنشاء أوامر الشراء بخطوات واضحة ومرنة. جميع المدخلات منظمة بعناية لتسريع العمل وتقليل الأخطاء.
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={handleCancel} variant="outline" className="border-white/40 text-white hover:bg-white/10 hover:text-white">
                  <span className="inline-flex items-center gap-2">
                    <X className="w-4 h-4" />
                    إلغاء والعودة
                  </span>
                </Button>
                <p className="text-xs text-white/70 max-w-xs leading-relaxed">كل شيء جاهز، اضغط على "حفظ الطلب" لإتمام العملية.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 -mt-12 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OVERVIEW_CARDS.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800 mb-1">خطأ</h4>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">نموذج أمر الشراء</h2>
              <p className="mt-1 text-sm text-slate-500">اتبع الخطوات الأربع لإدخال بيانات الطلب. يمكنك حفظ التغييرات في أي وقت والمراجعة قبل التأكيد.</p>
            </div>
            <div className="p-6 sm:p-8">
              <PurchaseOrderForm onSave={handleSave} onCancel={handleCancel} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PurchaseOrderCreate;

