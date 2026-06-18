import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6" dir="rtl">
          <div className="max-w-xl w-full bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-red-600 mb-2">حدث خطأ أثناء عرض الصفحة</h2>
            <p className="text-gray-700 mb-4">الرجاء فتح وحدة تحكم المتصفح (Console) ونسخ رسالة الخطأ لإرسالها لنا.</p>
            <pre className="text-xs bg-gray-100 p-3 rounded-md overflow-auto">
              {String(this.state.error)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

