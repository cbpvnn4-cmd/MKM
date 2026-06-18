import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Phone, TrendingUp } from 'lucide-react';
import { getPartners } from '../services/api';

const RecentPartners = ({ limit = 4 }) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecentPartners();
  }, []);

  const fetchRecentPartners = async () => {
    try {
      setLoading(true);
      const data = await getPartners();
      // Get the most recent partners (sorted by ID descending, only active)
      const recentPartners = Array.isArray(data)
        ? data.filter(p => p.active !== false).slice(0, limit)
        : [];
      setPartners(recentPartners);
      setError(null);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setError('فشل في تحميل الشركاء');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return '—';
    // Format: 964750... → Show last 4 digits
    const str = phone.toString();
    if (str.length > 4) {
      return `${str.slice(0, 6)}...${str.slice(-4)}`;
    }
    return str;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">أحدث الشركاء</h2>
        </div>
        <Link
          to="/partners"
          className="text-amber-600 hover:text-amber-800 text-sm font-medium transition-colors"
        >
          عرض الكل →
        </Link>
      </div>

      {/* Partners List */}
      <div className="p-6">
        {partners.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">لا يوجد شركاء حالياً</p>
            <p className="text-sm text-gray-400 mt-1">ابدأ بإضافة شريك جديد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {partners.map((partner) => (
              <Link
                key={partner.id}
                to={`/partners/${partner.id}`}
                className="group block"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-amber-50 transition-colors">
                  {/* Left Side - Partner Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar with number */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-amber-600 font-bold text-lg">
                          {partner.name?.charAt(0) || 'ش'}
                        </span>
                      </div>
                      {partner.active && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    {/* Partner Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 group-hover:text-amber-600 transition-colors truncate">
                        {partner.name}
                      </p>

                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        {/* Phone */}
                        {partner.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            <span dir="ltr">{formatPhone(partner.phone)}</span>
                          </div>
                        )}

                        {/* Ownership */}
                        {partner.current_ownership_percentage != null && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>{partner.current_ownership_percentage?.toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Capital */}
                  <div className="text-left flex-shrink-0">
                    {partner.base_capital_usd != null && (
                      <>
                        <p className="font-semibold text-gray-900" dir="ltr">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(partner.base_capital_usd)}
                        </p>
                        <p className="text-sm text-gray-500">رأس المال</p>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentPartners;
