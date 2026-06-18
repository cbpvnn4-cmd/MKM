import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar.jsx';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" dir="rtl">
      <div className="flex min-h-screen flex-row-reverse">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-72 min-w-[280px] max-w-[320px] transform border-l border-slate-200 bg-white transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950 lg:static lg:w-80 lg:min-w-[300px] lg:max-w-[340px] lg:translate-x-0 lg:shadow-none ${
            sidebarOpen ? 'translate-x-0 shadow-xl' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex min-h-screen flex-1 flex-col">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto bg-slate-50 py-6 md:py-10 px-3 sm:px-4 md:px-6 lg:px-8 dark:bg-slate-950">
            <div className="mx-auto w-full max-w-7xl">
              <div className="rounded-xl md:rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {children}
              </div>
            </div>
          </main>

          <footer className="border-t border-slate-200 bg-white py-4 md:py-6 px-3 sm:px-4 md:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-950 flex-shrink-0">
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 md:gap-4 text-xs text-slate-500 sm:flex-row dark:text-slate-400">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-700 flex-shrink-0">
                  <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">منصة سناد لإدارة المصاعد</p>
                  <p className="text-[10px] md:text-xs text-gray-500 truncate">SANAD ELEVATORS</p>
                  <p className="text-[9px] md:text-[10px] truncate">© 2024 جميع الحقوق محفوظة.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
                <button className="text-[10px] md:text-xs text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 whitespace-nowrap">
                  سياسة الخصوصية
                </button>
                <button className="text-[10px] md:text-xs text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 whitespace-nowrap">
                  شروط الاستخدام
                </button>
                <button className="text-[10px] md:text-xs text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 whitespace-nowrap">
                  اتصل بنا
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Floating action button */}
      <div className="fixed bottom-4 md:bottom-6 left-4 md:left-6 z-20">
        <div className="group relative">
          <button className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl dark:bg-slate-700">
            <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <div className="pointer-events-none absolute bottom-14 md:bottom-16 left-0 mt-2 w-44 md:w-48 rounded-lg border border-slate-200 bg-white p-2 md:p-3 text-xs md:text-sm shadow-lg opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-2 text-[10px] md:text-xs font-semibold text-slate-400 dark:text-slate-500">إجراءات سريعة</p>
            <div className="space-y-1">
              <button className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-right text-[10px] md:text-xs text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap">
                إضافة أمر بيع
              </button>
              <button className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-right text-[10px] md:text-xs text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap">
                إنشاء فاتورة جديدة
              </button>
              <button className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-right text-[10px] md:text-xs text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap">
                إضافة عميل جديد
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
