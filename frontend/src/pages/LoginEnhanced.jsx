import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Logo from '../components/Logo';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Wrench,
  TrendingUp,
  Users
} from 'lucide-react';

const LoginEnhanced = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberDuration, setRememberDuration] = useState('30');
  const [successMessage, setSuccessMessage] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for success message from registration
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      if (location.state.username) {
        setUsername(location.state.username);
      }
      // Clear the message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    }

    if (location.state?.from) {
      sessionStorage.setItem('redirectAfterLogin', location.state.from.pathname);
    }
    const savedDuration = localStorage.getItem('remember_duration');
    if (savedDuration) {
      setRememberDuration(savedDuration);
      setRememberMe(true);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password, rememberMe ? parseInt(rememberDuration) : null);
    if (result.success) {
      // Navigate to welcome screen after successful login
      navigate('/welcome');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Right Side - Branding */}
        <div className="hidden md:flex flex-col justify-center space-y-6 p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <Logo size="xl" showText={false} />
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-foreground">نظام إدارة المصاعد</h1>
                <p className="text-xl text-muted-foreground">السند للمصاعد</p>
                <p className="text-lg font-semibold text-blue-600">SANAD ELEVATORS</p>
              </div>
            </div>
            <p className="text-xl text-muted-foreground pt-2">
              حلول متكاملة لإدارة مشاريع المصاعد والمبيعات والخدمات
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">إدارة المشاريع والمبيعات</h3>
                <p className="text-sm text-muted-foreground">تتبع شامل لجميع المشاريع والعقود</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">خدمات الصيانة</h3>
                <p className="text-sm text-muted-foreground">نظام متطور لإدارة الصيانة والخدمات</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">تقارير مالية</h3>
                <p className="text-sm text-muted-foreground">تحليلات وتقارير مالية شاملة</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">إدارة الشركاء</h3>
                <p className="text-sm text-muted-foreground">إدارة العلاقات مع الشركاء والعملاء</p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Side - Login Form */}
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
            <CardDescription>
              أدخل بيانات الاعتماد الخاصة بك للوصول إلى النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Success Message */}
              {successMessage && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-800">{successMessage}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="أدخل اسم المستخدم"
                    required
                    className="pr-10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="أدخل كلمة المرور"
                    required
                    className="pr-10 pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                    تذكرني
                  </Label>
                </div>

                {rememberMe && (
                  <div className="bg-muted p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-3">اختر مدة التذكر:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: '7', label: '7 أيام' },
                        { value: '30', label: '30 يوماً' },
                        { value: '90', label: '90 يوماً' }
                      ].map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            "flex items-center justify-center cursor-pointer p-2 rounded-md border text-sm font-medium transition-colors",
                            rememberDuration === option.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <input
                            type="radio"
                            name="duration"
                            value={option.value}
                            checked={rememberDuration === option.value}
                            onChange={(e) => setRememberDuration(e.target.value)}
                            className="sr-only"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جارِ الدخول...
                  </>
                ) : (
                  <>
                    تسجيل الدخول
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">أو</span>
                </div>
              </div>

              {/* Register Link */}
              <div className="text-center text-sm">
                <span className="text-muted-foreground">ليس لديك حساب؟ </span>
                <Link
                  to="/register"
                  className="font-medium text-primary hover:underline"
                >
                  سجل الآن
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginEnhanced;