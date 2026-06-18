import React from 'react';
import Layout from '../components/Layout';

const InvoiceDetailSimple = () => {
  console.log('InvoiceDetailSimple component loaded');

  return (
    <Layout>
      <div style={{ padding: '20px', background: 'white', minHeight: '100vh' }}>
        <h1 style={{ color: 'red', fontSize: '32px' }}>اختبار - صفحة الفاتورة</h1>
        <p style={{ fontSize: '20px' }}>إذا رأيت هذا النص، معناها React يعمل بشكل صحيح!</p>
        <div style={{ background: '#e3f2fd', padding: '20px', marginTop: '20px', borderRadius: '8px' }}>
          <h2>معلومات التشخيص:</h2>
          <ul style={{ fontSize: '16px', lineHeight: '2' }}>
            <li>✅ React Component يعمل</li>
            <li>✅ Layout Component يعمل</li>
            <li>✅ Router يعمل</li>
            <li>⚠️ المشكلة في InvoiceDetail الأصلي</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default InvoiceDetailSimple;
