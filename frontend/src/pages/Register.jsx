import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const navigate = useNavigate();

  // Validation functions
  const validateUsername = (username) => {
    if (username.length < 3) return 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'اسم المستخدم يجب أن يحتوي على أحرف وأرقام فقط';
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'البريد الإلكتروني غير صحيح';
    return '';
  };

  const validatePassword = (password) => {
    if (password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    if (!/[A-Za-z]/.test(password)) return 'كلمة المرور يجب أن تحتوي على حرف واحد على الأقل';
    if (!/[0-9]/.test(password)) return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    setError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let error = '';

    switch (name) {
      case 'username':
        error = validateUsername(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'confirmPassword':
        if (value !== formData.password) {
          error = 'كلمات المرور غير متطابقة';
        }
        break;
      default:
        break;
    }

    if (error) {
      setValidationErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const validateForm = () => {
    const errors = {};

    const usernameError = validateUsername(formData.username);
    if (usernameError) errors.username = usernameError;

    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;

    if (!formData.full_name.trim()) {
      errors.full_name = 'الاسم الكامل مطلوب';
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'كلمات المرور غير متطابقة';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validateForm()) {
      setError('يرجى تصحيح الأخطاء في النموذج');
      return;
    }

    setLoading(true);

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password
      };

      await register(userData);
      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول',
            username: formData.username
          }
        });
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.status === 400) {
        setError('اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (fieldName) => ({
    width: '100%',
    padding: '0.75rem',
    border: validationErrors[fieldName] ? '2px solid #dc2626' : '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s'
  });

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <svg style={{ width: '32px', height: '32px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            تم إنشاء الحساب بنجاح!
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            سيتم تحويلك إلى صفحة تسجيل الدخول...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      fontFamily: 'Arial, sans-serif',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '500px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            إنشاء حساب جديد
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            أدخل بياناتك لإنشاء حساب في النظام
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '14px'
            }}>
              اسم المستخدم <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle('username')}
              placeholder="اختر اسم مستخدم فريد"
              required
            />
            {validationErrors.username && (
              <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '0.25rem' }}>
                {validationErrors.username}
              </p>
            )}
          </div>

          {/* Email */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '14px'
            }}>
              البريد الإلكتروني <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle('email')}
              placeholder="example@company.com"
              required
            />
            {validationErrors.email && (
              <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '0.25rem' }}>
                {validationErrors.email}
              </p>
            )}
          </div>

          {/* Full Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '14px'
            }}>
              الاسم الكامل <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle('full_name')}
              placeholder="أدخل اسمك الكامل"
              required
            />
            {validationErrors.full_name && (
              <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '0.25rem' }}>
                {validationErrors.full_name}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '14px'
            }}>
              كلمة المرور <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle('password')}
              placeholder="اختر كلمة مرور قوية"
              required
            />
            {validationErrors.password && (
              <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '0.25rem' }}>
                {validationErrors.password}
              </p>
            )}
            <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '0.25rem' }}>
              يجب أن تحتوي على 6 أحرف على الأقل، وتتضمن أحرف وأرقام
            </p>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '14px'
            }}>
              تأكيد كلمة المرور <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle('confirmPassword')}
              placeholder="أعد إدخال كلمة المرور"
              required
            />
            {validationErrors.confirmPassword && (
              <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '0.25rem' }}>
                {validationErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '14px',
              border: '1px solid #fca5a5'
            }}>
              <strong>خطأ:</strong> {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              padding: '0.875rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.backgroundColor = '#3b82f6';
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  display: 'inline-block',
                  marginLeft: '0.5rem',
                  animation: 'spin 1s linear infinite'
                }}></span>
                جاري إنشاء الحساب...
              </span>
            ) : (
              'إنشاء حساب'
            )}
          </button>
        </form>

        {/* Login Link */}
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          لديك حساب بالفعل؟{' '}
          <Link
            to="/login"
            style={{
              color: '#3b82f6',
              textDecoration: 'none',
              fontWeight: '600'
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
          >
            تسجيل الدخول
          </Link>
        </div>

        {/* Info Box */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#eff6ff',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#1e40af',
          border: '1px solid #bfdbfe'
        }}>
          <strong>ملاحظة:</strong> سيتم تفعيل حسابك مباشرة بعد التسجيل، ولكن قد تحتاج إلى انتظار المدير لمنحك الصلاحيات المناسبة.
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Register;
