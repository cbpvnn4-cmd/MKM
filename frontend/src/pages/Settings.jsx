import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useLogoSettings } from '../contexts/LogoContext';
import { useToast } from '../components/ui/Toast';

const Settings = () => {
  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const { logoSettings, updateLogoSize, updateHeaderHeight, resetToDefaults } = useLogoSettings();
  const [activeTab, setActiveTab] = useState('system');
  const [settings, setSettings] = useState({
    // System preferences
    theme: 'light',
    currency: 'USD',
    dateFormat: 'dd/mm/yyyy',
    timezone: 'Asia/Riyadh',
    language: 'ar',
    systemNotifications: {
      email: true,
      push: true,
      reports: true,
      system: true,
      maintenance: true
    },

    // Business settings
    companyName: 'السند للمصاعد - SANAD ELEVATORS',
    fiscalYearStart: '01/01',
    defaultTaxRate: 15,
    autoBackup: true,
    reportFrequency: 'weekly',
    backupTime: '02:00',
    dataRetention: 365
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => {
      if (category === 'systemNotifications') {
        return {
          ...prev,
          systemNotifications: {
            ...prev.systemNotifications,
            [key]: value
          }
        };
      }
      return {
        ...prev,
        [key]: value
      };
    });
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Saving settings:', settings);

      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      toastError('فشل في حفظ التغييرات');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'system', name: 'النظام', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'appearance', name: 'المظهر', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'business', name: 'الأعمال', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'backup', name: 'النسخ الاحتياطي', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' }
  ];

  if (isSaving) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إعدادات النظام</h1>
            <p className="text-gray-600 mt-1">إدارة إعدادات النظام والأعمال والنسخ الاحتياطي</p>
          </div>

          {isDirty && (
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  تم الحفظ بنجاح
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="mr-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors duration-200 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                        </svg>
                        {tab.name}
                      </div>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Appearance Settings */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">إعدادات اللوغو</h3>
                      <p className="text-sm text-gray-600 mb-6">تحكم في حجم اللوغو في الشريط العلوي والقائمة الجانبية</p>

                      {/* Header Logo Size */}
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">حجم اللوغو في الشريط العلوي</label>

                          {/* أحجام عادية (مربعة) */}
                          <p className="text-xs font-medium text-gray-600 mb-2">أحجام عادية (مربعة)</p>
                          <div className="grid grid-cols-5 gap-2 mb-4">
                            {['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'].map((size) => (
                              <button
                                key={size}
                                onClick={() => updateLogoSize('header', size)}
                                className={`px-3 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                                  logoSettings.headerSize === size
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {size.toUpperCase()}
                              </button>
                            ))}
                          </div>

                          {/* أحجام عريضة (أفقية) */}
                          <p className="text-xs font-medium text-gray-600 mb-2">أحجام عريضة (أفقية)</p>
                          <div className="grid grid-cols-5 gap-2">
                            {['wide-sm', 'wide-md', 'wide-lg', 'wide-xl', 'wide-2xl', 'wide-3xl', 'wide-4xl', 'wide-5xl', 'wide-6xl'].map((size) => (
                              <button
                                key={size}
                                onClick={() => updateLogoSize('header', size)}
                                className={`px-3 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                                  logoSettings.headerSize === size
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {size.split('-')[1].toUpperCase()}
                              </button>
                            ))}
                          </div>

                          <p className="text-xs text-gray-500 mt-3">
                            الحجم الحالي: <span className="font-semibold">{logoSettings.headerSize.toUpperCase()}</span>
                            {' - '}
                            {logoSettings.headerSize === 'xs' && 'صغير جداً (40×40px)'}
                            {logoSettings.headerSize === 'sm' && 'صغير (64×64px)'}
                            {logoSettings.headerSize === 'md' && 'متوسط (80×80px)'}
                            {logoSettings.headerSize === 'lg' && 'كبير (96×96px)'}
                            {logoSettings.headerSize === 'xl' && 'كبير جداً (112×112px)'}
                            {logoSettings.headerSize === '2xl' && 'ضخم (144×144px)'}
                            {logoSettings.headerSize === '3xl' && 'ضخم جداً (176×176px)'}
                            {logoSettings.headerSize === '4xl' && 'هائل (208×208px)'}
                            {logoSettings.headerSize === '5xl' && 'هائل جداً (240×240px)'}
                            {logoSettings.headerSize === '6xl' && 'عملاق (288×288px)'}
                            {logoSettings.headerSize === 'wide-sm' && 'عريض صغير (64×128px)'}
                            {logoSettings.headerSize === 'wide-md' && 'عريض متوسط (80×192px)'}
                            {logoSettings.headerSize === 'wide-lg' && 'عريض كبير (96×224px)'}
                            {logoSettings.headerSize === 'wide-xl' && 'عريض جداً (112×256px)'}
                            {logoSettings.headerSize === 'wide-2xl' && 'عريض ضخم (144×320px)'}
                            {logoSettings.headerSize === 'wide-3xl' && 'عريض ضخم جداً (176×384px)'}
                            {logoSettings.headerSize === 'wide-4xl' && 'عريض هائل (208×384px+)'}
                            {logoSettings.headerSize === 'wide-5xl' && 'عريض هائل جداً (240×عرض كامل)'}
                            {logoSettings.headerSize === 'wide-6xl' && 'عريض عملاق (288×عرض كامل)'}
                          </p>
                        </div>

                        {/* Header Height */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">ارتفاع الشريط العلوي</label>
                          <div className="grid grid-cols-6 gap-2">
                            {['h-20', 'h-24', 'h-28', 'h-32', 'h-36', 'h-48'].map((height) => (
                              <button
                                key={height}
                                onClick={() => updateHeaderHeight(height)}
                                className={`px-3 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                                  logoSettings.headerHeight === height
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {height === 'h-20' ? '80px' :
                                 height === 'h-24' ? '96px' :
                                 height === 'h-28' ? '112px' :
                                 height === 'h-32' ? '128px' :
                                 height === 'h-36' ? '144px' : '192px'}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            الارتفاع الحالي: <span className="font-semibold">{logoSettings.headerHeight}</span>
                          </p>
                        </div>
                      </div>

                      {/* Sidebar Logo Size */}
                      <div className="space-y-4 mb-6 pt-6 border-t border-gray-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">حجم اللوغو في القائمة الجانبية</label>

                          {/* أحجام عادية (مربعة) */}
                          <p className="text-xs font-medium text-gray-600 mb-2">أحجام عادية (مربعة)</p>
                          <div className="grid grid-cols-5 gap-2 mb-4">
                            {['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'].map((size) => (
                              <button
                                key={size}
                                onClick={() => updateLogoSize('sidebar', size)}
                                className={`px-3 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                                  logoSettings.sidebarSize === size
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {size.toUpperCase()}
                              </button>
                            ))}
                          </div>

                          {/* أحجام عريضة (أفقية) */}
                          <p className="text-xs font-medium text-gray-600 mb-2">أحجام عريضة (أفقية)</p>
                          <div className="grid grid-cols-5 gap-2">
                            {['wide-sm', 'wide-md', 'wide-lg', 'wide-xl', 'wide-2xl', 'wide-3xl', 'wide-4xl', 'wide-5xl', 'wide-6xl'].map((size) => (
                              <button
                                key={size}
                                onClick={() => updateLogoSize('sidebar', size)}
                                className={`px-3 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                                  logoSettings.sidebarSize === size
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {size.split('-')[1].toUpperCase()}
                              </button>
                            ))}
                          </div>

                          <p className="text-xs text-gray-500 mt-3">
                            الحجم الحالي: <span className="font-semibold">{logoSettings.sidebarSize.toUpperCase()}</span>
                            {' - '}
                            {logoSettings.sidebarSize === 'xs' && 'صغير جداً (40×40px)'}
                            {logoSettings.sidebarSize === 'sm' && 'صغير (64×64px)'}
                            {logoSettings.sidebarSize === 'md' && 'متوسط (80×80px)'}
                            {logoSettings.sidebarSize === 'lg' && 'كبير (96×96px)'}
                            {logoSettings.sidebarSize === 'xl' && 'كبير جداً (112×112px)'}
                            {logoSettings.sidebarSize === '2xl' && 'ضخم (144×144px)'}
                            {logoSettings.sidebarSize === '3xl' && 'ضخم جداً (176×176px)'}
                            {logoSettings.sidebarSize === '4xl' && 'هائل (208×208px)'}
                            {logoSettings.sidebarSize === '5xl' && 'هائل جداً (240×240px)'}
                            {logoSettings.sidebarSize === '6xl' && 'عملاق (288×288px)'}
                            {logoSettings.sidebarSize === 'wide-sm' && 'عريض صغير (64×128px)'}
                            {logoSettings.sidebarSize === 'wide-md' && 'عريض متوسط (80×192px)'}
                            {logoSettings.sidebarSize === 'wide-lg' && 'عريض كبير (96×224px)'}
                            {logoSettings.sidebarSize === 'wide-xl' && 'عريض جداً (112×256px)'}
                            {logoSettings.sidebarSize === 'wide-2xl' && 'عريض ضخم (144×320px)'}
                            {logoSettings.sidebarSize === 'wide-3xl' && 'عريض ضخم جداً (176×384px)'}
                            {logoSettings.sidebarSize === 'wide-4xl' && 'عريض هائل (208×384px+)'}
                            {logoSettings.sidebarSize === 'wide-5xl' && 'عريض هائل جداً (240×عرض كامل)'}
                            {logoSettings.sidebarSize === 'wide-6xl' && 'عريض عملاق (288×عرض كامل)'}
                          </p>
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                        <div className="flex items-start gap-3">
                          <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-800 mb-1">نصيحة</h4>
                            <p className="text-sm text-blue-700">
                              تأكد من أن حجم اللوغو مناسب لارتفاع الشريط العلوي. إذا كان اللوغو كبيراً جداً، قد يخرج عن حدود الشريط.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reset Button */}
                      <div className="pt-6 border-t border-gray-200 mt-6">
                        <button
                          onClick={resetToDefaults}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          إعادة تعيين إعدادات اللوغو للقيم الافتراضية
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Settings */}
                {activeTab === 'system' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">لغة النظام</label>
                        <select
                          value={settings.language}
                          onChange={(e) => handleSettingChange('system', 'language', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="ar">العربية</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">المظهر</label>
                        <select
                          value={settings.theme}
                          onChange={(e) => handleSettingChange('system', 'theme', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="light">فاتح</option>
                          <option value="dark">داكن</option>
                          <option value="auto">تلقائي</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">العملة الافتراضية</label>
                        <select
                          value={settings.currency}
                          onChange={(e) => handleSettingChange('system', 'currency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="USD">دولار أمريكي (USD)</option>
                          <option value="SAR">ريال سعودي (SAR)</option>
                          <option value="EUR">يورو (EUR)</option>
                          <option value="AED">درهم إماراتي (AED)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">تنسيق التاريخ</label>
                        <select
                          value={settings.dateFormat}
                          onChange={(e) => handleSettingChange('system', 'dateFormat', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                          <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                          <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">المنطقة الزمنية</label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => handleSettingChange('system', 'timezone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                          <option value="UTC">UTC (GMT+0)</option>
                          <option value="Europe/London">لندن (GMT+0)</option>
                          <option value="Asia/Dubai">دبي (GMT+4)</option>
                        </select>
                      </div>
                    </div>

                    {/* System Notifications */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">تنبيهات النظام</h3>
                      <div className="space-y-4">
                        {Object.entries(settings.systemNotifications).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-700">
                                {key === 'email' && 'تنبيهات البريد الإلكتروني للنظام'}
                                {key === 'push' && 'التنبيهات المنبثقة'}
                                {key === 'reports' && 'تنبيهات إنشاء التقارير'}
                                {key === 'system' && 'تنبيهات أخطاء النظام'}
                                {key === 'maintenance' && 'تنبيهات الصيانة'}
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => handleSettingChange('systemNotifications', key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Settings */}
                {activeTab === 'business' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">اسم الشركة</label>
                        <input
                          type="text"
                          value={settings.companyName}
                          onChange={(e) => handleSettingChange('business', 'companyName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">بداية السنة المالية</label>
                        <input
                          type="text"
                          value={settings.fiscalYearStart}
                          onChange={(e) => handleSettingChange('business', 'fiscalYearStart', e.target.value)}
                          placeholder="MM/DD"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">معدل الضريبة الافتراضي (%)</label>
                        <input
                          type="number"
                          value={settings.defaultTaxRate}
                          onChange={(e) => handleSettingChange('business', 'defaultTaxRate', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">تكرار التقارير التلقائية</label>
                        <select
                          value={settings.reportFrequency}
                          onChange={(e) => handleSettingChange('business', 'reportFrequency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="daily">يومي</option>
                          <option value="weekly">أسبوعي</option>
                          <option value="monthly">شهري</option>
                          <option value="quarterly">ربع سنوي</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">مدة الاحتفاظ بالبيانات (يوم)</label>
                        <input
                          type="number"
                          value={settings.dataRetention}
                          onChange={(e) => handleSettingChange('business', 'dataRetention', parseInt(e.target.value) || 365)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Backup Settings */}
                {activeTab === 'backup' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700">النسخ الاحتياطي التلقائي</span>
                        <p className="text-xs text-gray-500">تمكين النسخ الاحتياطي اليومي للبيانات</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.autoBackup}
                          onChange={(e) => handleSettingChange('backup', 'autoBackup', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">وقت النسخ الاحتياطي</label>
                      <input
                        type="time"
                        value={settings.backupTime}
                        onChange={(e) => handleSettingChange('backup', 'backupTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="mr-3">
                          <h3 className="text-sm font-medium text-blue-800">إعدادات النسخ الاحتياطي</h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <ul className="list-disc list-inside space-y-1">
                              <li>يتم إنشاء نسخة احتياطية يومياً في الوقت المحدد</li>
                              <li>يتم الاحتفاظ بالنسخ لمدة 30 يوم</li>
                              <li>يمكن استعادة البيانات من أي نسخة احتياطية</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        إنشاء نسخة احتياطية الآن
                      </button>
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">
                        استعادة النسخ الاحتياطية
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">حالة النظام</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">حالة الخادم:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-green-600">متصل</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">قاعدة البيانات:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-green-600">نشطة</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">آخر نسخة احتياطية:</span>
                    <span className="text-sm font-medium text-gray-900">منذ ساعة</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">استخدام التخزين:</span>
                    <span className="text-sm font-medium text-gray-900">2.3 GB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">إجراءات سريعة</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    تصدير الإعدادات
                  </button>
                  <button className="w-full bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    استيراد الإعدادات
                  </button>
                  <button className="w-full bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    إعادة تعيين الإعدادات
                  </button>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">معلومات النظام</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الإصدار:</span>
                    <span className="font-medium">v2.1.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">آخر تحديث:</span>
                    <span className="font-medium">{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">المطور:</span>
                    <span className="font-medium">السند للمصاعد</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;