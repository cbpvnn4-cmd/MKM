import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  UserPlus,
  Users,
  Coins,
  ShieldCheck,
  Sparkles,
  ClipboardList,
  Phone,
  Info
} from 'lucide-react';
import Layout from '../components/Layout';
import PartnerForm from '../components/PartnerForm';

const PartnerCreate = () => {
  const navigate = useNavigate();

  const handleSave = () => {
    navigate('/partners');
  };

  const handleCancel = () => {
    navigate('/partners');
  };

  const insightCards = [
    {
      label: 'الشريك القادم',
      highlight: '+1',
      description: 'سيتم تحديث عدد الشركاء بعد الحفظ.',
      icon: Users,
      accent: 'from-blue-500/10 to-blue-100',
      iconClass: 'bg-blue-500/15 text-blue-600'
    },
    {
      label: 'رأس المال الأولي',
      highlight: '$0',
      description: 'يمكن تعديله لاحقاً عبر حركات رأس المال.',
      icon: Coins,
      accent: 'from-emerald-500/10 to-emerald-100',
      iconClass: 'bg-emerald-500/15 text-emerald-600'
    },
    {
      label: 'الحالة الافتراضية',
      highlight: 'نشط',
      description: 'يمكن تغيير الحالة من إدارة الشركاء.',
      icon: ShieldCheck,
      accent: 'from-purple-500/10 to-purple-100',
      iconClass: 'bg-purple-500/15 text-purple-600'
    }
  ];

  const tips = [
    {
      title: 'أدخل بيانات التواصل بدقة',
      body: 'البريد الإلكتروني ورقم الجوال أساسيان للتواصل وإرسال التنبيهات.',
      icon: Phone,
      color: 'text-sky-600 bg-sky-500/10 border border-sky-500/20'
    },
    {
      title: 'تأكيد الهوية',
      body: 'رقم الهوية يساعد على التوثيق القانوني ويمنع الازدواجية.',
      icon: ClipboardList,
      color: 'text-indigo-600 bg-indigo-500/10 border border-indigo-500/20'
    },
    {
      title: 'رأس المال الأولي اختياري',
      body: 'يمكن ترك القيمة صفر الآن وإضافة الإيداع لاحقاً من صفحة الحركات.',
      icon: Coins,
      color: 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20'
    },
    {
      title: 'حالة الشريك',
      body: 'يتم إنشاء الشريك بحالة نشطة، ويمكن إيقافه من لوحة الشركاء.',
      icon: ShieldCheck,
      color: 'text-purple-600 bg-purple-500/10 border border-purple-500/20'
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Header */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-6 px-8 py-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => navigate('/partners')}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-sm font-semibold text-purple-600 ring-1 ring-purple-500/15">
                    <Sparkles className="h-4 w-4" />
                    خطوة جديدة
                  </div>
                  <h1 className="mt-4 text-3xl font-bold text-slate-900">إضافة شريك جديد</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    أدخل بيانات الشريك بشكل واضح ودقيق لضمان اكتمال السجل المالي والتواصل بسهولة.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <Info className="h-4 w-4 text-blue-500" />
                سيتم حفظ الشريك مع إمكانية تعديل أي حقل لاحقاً من لوحة الشركاء.
              </div>
            </div>
          </div>

          {/* Insight cards */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {insightCards.map(({ label, highlight, description, icon: Icon, accent, iconClass }) => (
              <div
                key={label}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />
                <div className="flex items-start justify-between gap-4 px-6 py-5">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{highlight}</p>
                    <p className="mt-1 text-xs text-slate-500">{description}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
              <h2 className="text-xl font-semibold text-white">بيانات الشريك الجديد</h2>
              <p className="mt-1 text-sm text-white/60">جميع الحقول التي تحمل علامة * مطلوبة.</p>
            </div>
            <div className="px-6 py-8 sm:px-8">
              <PartnerForm partner={null} onSave={handleSave} onCancel={handleCancel} />
            </div>
          </div>

          {/* Tips */}
          <section className="mt-10 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-8 py-5">
              <h3 className="text-lg font-semibold text-slate-900">نصائح تساعدك على إدخال البيانات بإتقان</h3>
              <p className="mt-1 text-sm text-slate-500">
                اتبع الإرشادات التالية لضمان إدخال الشريك الجديد بأفضل صورة ممكنة.
              </p>
            </div>
            <div className="grid gap-4 px-8 py-6 md:grid-cols-2">
              {tips.map(({ title, body, icon: Icon, color }) => (
                <div key={title} className={`flex items-start gap-3 rounded-2xl p-4 ${color}`}>
                  <div className="mt-1 rounded-xl bg-white/70 p-2 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-xs text-slate-600">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default PartnerCreate;
