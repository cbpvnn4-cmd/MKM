import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

const RememberMeStatus = () => {
  const { isRemembered, getRemainingRememberTime, logout } = useAuth();

  if (!isRemembered()) {
    return null;
  }

  const remainingDays = getRemainingRememberTime();

  const handleForgetMe = () => {
    // Clear remember me data but keep session
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('remember_duration');

    // Move current token to session storage to maintain current session
    const currentToken = localStorage.getItem('access_token');
    if (currentToken) {
      sessionStorage.setItem('access_token', currentToken);
    }

    // Refresh page to reflect changes
    window.location.reload();
  };

  return (
    <Card className="mb-4 border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">تم حفظ تسجيل الدخول</h4>
              <p className="text-xs text-gray-600">
                {remainingDays > 0 ? (
                  <>ستبقى مسجل الدخول لمدة <span className="font-medium text-primary-600">{remainingDays} يوم</span> متبقي</>
                ) : (
                  <span className="text-amber-600">ستنتهي صلاحية الجلسة اليوم</span>
                )}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleForgetMe}
            className="text-xs px-3 py-1 h-auto border-primary-300 text-primary-700 hover:bg-primary-100"
          >
            إلغاء التذكر
          </Button>
        </div>

        {remainingDays <= 3 && remainingDays > 0 && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-xs text-amber-800">
                تنبيه: ستحتاج إلى تسجيل الدخول مرة أخرى قريباً
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RememberMeStatus;