import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import ProtectedComponent from '../components/ProtectedComponent';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS, ROLES } from '../utils/permissions';
import { userAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const UserManagement = () => {
  const { success, error: toastError } = useToast();
  const { confirmDelete, confirmCustom } = useConfirmations();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('edit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [openActionUserId, setOpenActionUserId] = useState(null);
  const { hasPermission } = usePermissions();

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (!openActionUserId || typeof document === 'undefined') {
      return;
    }

    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-user-actions-menu]')) {
        setOpenActionUserId(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenActionUserId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openActionUserId]);

  const closeActionMenu = () => setOpenActionUserId(null);

  const toggleActionMenu = (userId) => {
    setOpenActionUserId((prev) => (prev === userId ? null : userId));
  };

  const normalizeUser = (u) => ({
    ...u,
    roles: Array.isArray(u?.roles)
      ? u.roles.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
      : []
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await userAPI.getUsers();
      setUsers(Array.isArray(usersData) ? usersData.map(normalizeUser) : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_expiry');
        sessionStorage.removeItem('access_token');
        window.location.href = '/login';
        return;
      }
      setError('فشل في جلب بيانات المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const rolesData = await userAPI.getRoles();
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_expiry');
        sessionStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
  };

  const fetchPermissions = async () => {
    try {
      const permissionsData = await userAPI.getPermissions();
      setPermissions(Array.isArray(permissionsData) ? permissionsData : []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_expiry');
        sessionStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
  };

  const handleEditUser = (user) => {
    closeActionMenu();
    setSelectedUser(user);
    setModalType('edit');
    setShowModal(true);
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setModalType('edit');
    setShowModal(true);
  };

  const handleDeleteUser = (user) => {
    closeActionMenu();
    setSelectedUser(user);
    setModalType('delete');
    setShowModal(true);
  };

  const handleResetPassword = (user) => {
    closeActionMenu();
    setSelectedUser(user);
    setModalType('reset-password');
    setShowModal(true);
  };

  const handleManagePermissions = (user) => {
    closeActionMenu();
    setSelectedUser(user);
    setModalType('permissions');
    setShowModal(true);
  };

  const handleSendNotification = (user) => {
    closeActionMenu();
    setSelectedUser(user);
    setModalType('notify');
    setShowModal(true);
  };

  const handleViewActivity = (user) => {
    closeActionMenu();
    setSelectedUser(user);
    setModalType('activity');
    setShowModal(true);
  };

  const confirmDeleteUser = async () => {
    try {
      setLoading(true);
      await userAPI.deleteUser(selectedUser.id);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUser.id));
      setShowModal(false);
      setSelectedUser(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('فشل حذف المستخدم');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (newPassword) => {
    try {
      setLoading(true);
      await userAPI.resetUserPassword(selectedUser.id, newPassword);
      setShowModal(false);
      setSelectedUser(null);
      setError(null);
      success('تم إعادة تعيين كلمة المرور بنجاح');
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('فشل إعادة تعيين كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    const confirmed = await confirmCustom(`هل أنت متأكد من حذف ${selectedUsers.length} مستخدم؟`);
    if (!confirmed) return;

    try {
      await userAPI.bulkDeleteUsers(selectedUsers);
      success(`تم حذف ${selectedUsers.length} مستخدم بنجاح`);
      setUsers(prevUsers => prevUsers.filter(user => !selectedUsers.includes(user.id)));
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      setError('فشل حذف المستخدمين');
    }
  };

  const handleBulkStatusUpdate = async (isActive) => {
    if (selectedUsers.length === 0) return;

    try {
      await userAPI.bulkUpdateUserStatus(selectedUsers, isActive);
      fetchUsers();
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error bulk updating status:', error);
      setError('فشل تحديث حالة المستخدمين');
    }
  };

  const handleExportUsers = async () => {
    try {
      const blob = await userAPI.exportUsers();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting users:', error);
      setError('فشل تصدير البيانات');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    closeActionMenu();
    try {
      await userAPI.updateUser(userId, { is_active: !currentStatus });
      fetchUsers();
      const message = currentStatus
        ? 'تم إلغاء تفعيل المستخدم بنجاح'
        : 'تم تفعيل المستخدم بنجاح';
      success(message);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(user => user.id));
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users;

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter((user) => user.is_active === isActive);
    }

    if (roleFilter !== 'all') {
      result = result.filter((user) =>
        (user.roles || []).some(r => {
          const roleName = typeof r === 'string' ? r : r?.name;
          return roleName === roleFilter;
        })
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((user) =>
        user.username?.toLowerCase().includes(term) ||
        user.full_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, statusFilter, roleFilter, searchTerm, sortField, sortDirection]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return (
      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortDirection === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );
  };

  const UserActionsMenu = ({
    user,
    isOpen,
    onToggle,
    onEdit,
    onManagePermissions,
    onResetPassword,
    onToggleStatus,
    onSendNotification,
    onViewActivity,
    onDelete
  }) => {
    const displayName = user?.full_name || user?.username || '';

    return (
      <div className="relative" data-user-actions-menu>
        <button
          type="button"
          data-testid="user-actions-trigger"
          onClick={onToggle}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`قائمة الإجراءات للمستخدم ${displayName}`}
          className={`inline-flex items-center gap-1.5 px-4 py-2 border-2 text-sm font-semibold rounded-lg bg-white transition-all duration-200 shadow-sm focus:outline-none ${
            isOpen
              ? 'border-blue-500 text-blue-700 shadow-md'
              : 'border-gray-300 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 hover:shadow-md'
          }`}
        >
          إجراءات
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div
            className="absolute left-0 mt-2 w-64 rounded-xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-10 border border-gray-200"
            role="menu"
            data-testid="user-actions-menu"
          >
            <div className="py-2">
              <button
                type="button"
                onClick={onEdit}
                className="w-full text-right px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 transition-all duration-150 flex items-center gap-2"
                role="menuitem"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                تعديل الأدوار
              </button>
              <button
                type="button"
                onClick={onManagePermissions}
                className="w-full text-right px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 transition-all duration-150 flex items-center gap-2"
                role="menuitem"
              >
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zm0 6c-4 0-6 2-6 3v1h12v-1c0-1-2-3-6-3z" />
                </svg>
                إدارة الصلاحيات
              </button>
              <button
                type="button"
                onClick={onResetPassword}
                className="w-full text-right px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-indigo-100 transition-all duration-150 flex items-center gap-2"
                role="menuitem"
              >
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                إعادة تعيين كلمة المرور
              </button>
              <button
                type="button"
                onClick={onToggleStatus}
                className={`w-full text-right px-4 py-2.5 text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                  user.is_active
                    ? 'text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100'
                }`}
                role="menuitem"
              >
                <svg
                  className={`w-4 h-4 ${user.is_active ? 'text-amber-600' : 'text-green-600'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {user.is_active ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  )}
                </svg>
                {user.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
              </button>
              <button
                type="button"
                onClick={onSendNotification}
                className="w-full text-right px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-cyan-100 transition-all duration-150 flex items-center gap-2"
                role="menuitem"
              >
                <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                إرسال إشعار
              </button>
              <button
                type="button"
                onClick={onViewActivity}
                className="w-full text-right px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-teal-50 hover:to-teal-100 transition-all duration-150 flex items-center gap-2"
                role="menuitem"
              >
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                عرض سجل النشاط
              </button>
              <hr className="my-2 border-gray-200" />
              <button
                type="button"
                onClick={onDelete}
                className="w-full text-right px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 transition-all duration-150 flex items-center gap-2"
                role="menuitem"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                حذف
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!hasPermission(PERMISSIONS.MANAGE_USERS)) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">إدارة المستخدمين</h1>
            <p className="text-gray-600">إدارة المستخدمين وأدوارهم وصلاحياتهم</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-200 rounded-full mr-3">
                <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-red-800 font-medium">ليس لديك صلاحية للوصول إلى إدارة المستخدمين</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">إدارة المستخدمين</h1>
          <p className="text-gray-600">إدارة المستخدمين وأدوارهم وصلاحياتهم في النظام</p>
        </div>

        {error && (
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200 mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-200 rounded-full mr-3">
                <svg className="w-5 h-5 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-yellow-800 font-medium text-sm">{error}</div>
              <button onClick={() => setError(null)} className="mr-auto text-yellow-600 hover:text-yellow-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                قائمة المستخدمين
              </h2>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                عدد المستخدمين: {formatNumber(filteredUsers.length)}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <ProtectedComponent permission={PERMISSIONS.MANAGE_USERS}>
                <button
                  onClick={handleAddUser}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  إضافة مستخدم
                </button>
                <button
                  onClick={handleExportUsers}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  تصدير CSV
                </button>
              </ProtectedComponent>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedUsers.length > 0 && (
            <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-blue-900 font-semibold">تم تحديد {selectedUsers.length} مستخدم</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkStatusUpdate(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    تفعيل الكل
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    تعطيل الكل
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    حذف الكل
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-2">
              <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث بالاسم أو اسم المستخدم أو البريد"
                  className="w-full pl-4 pr-11 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-400"
                />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-400 cursor-pointer bg-white"
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-400 cursor-pointer bg-white"
              >
                <option value="all">كل الأدوار</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-2 border-gray-200 rounded-xl shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th scope="col" className="px-4 py-3 text-right">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('username')}
                  >
                    المستخدم <SortIcon field="username" />
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    البريد الإلكتروني
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الأدوار
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    تاريخ الإنشاء <SortIcon field="created_at" />
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-sm text-gray-500">
                      لا توجد مستخدمين مطابقين
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">{user.full_name || user.username}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.map((role, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {typeof role === 'string' ? role : role?.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.is_active ? (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            غير نشط
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <UserActionsMenu
                          user={user}
                          isOpen={openActionUserId === user.id}
                          onToggle={() => toggleActionMenu(user.id)}
                          onEdit={() => handleEditUser(user)}
                          onManagePermissions={() => handleManagePermissions(user)}
                          onResetPassword={() => handleResetPassword(user)}
                          onToggleStatus={() => toggleUserStatus(user.id, user.is_active)}
                          onSendNotification={() => handleSendNotification(user)}
                          onViewActivity={() => handleViewActivity(user)}
                          onDelete={() => handleDeleteUser(user)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">عرض</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-700">من {formatNumber(filteredUsers.length)}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  السابق
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                            : 'text-gray-700 bg-white border-2 border-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 animate-slideUp">
            {modalType === 'delete' && (
              <DeleteConfirmModal
                user={selectedUser}
                onConfirm={confirmDeleteUser}
                onCancel={() => setShowModal(false)}
                isDeleting={loading}
              />
            )}
            {modalType === 'reset-password' && (
              <ResetPasswordModal
                user={selectedUser}
                onSubmit={handlePasswordReset}
                onCancel={() => setShowModal(false)}
              />
            )}
            {modalType === 'notify' && (
              <NotificationModal
                user={selectedUser}
                onSubmit={async (message) => {
                  await userAPI.sendUserNotification(selectedUser.id, message);
                  setShowModal(false);
                  success('تم إرسال الإشعار');
                }}
                onCancel={() => setShowModal(false)}
              />
            )}
            {modalType === 'activity' && (
              <ActivityLogModal
                user={selectedUser}
                onClose={() => setShowModal(false)}
              />
            )}
            {modalType === 'edit' && (
              <UserFormModal
                user={selectedUser}
                roles={roles}
                onSubmit={selectedUser ? async (roleIds) => {
                  await userAPI.assignUserRoles(selectedUser.id, roleIds);
                  setShowModal(false);
                  fetchUsers();
                } : async (userData) => {
                  await userAPI.createUser(userData);
                  setShowModal(false);
                  fetchUsers();
                }}
                onCancel={() => setShowModal(false)}
              />
            )}
            {modalType === 'permissions' && (
              <PermissionsModal
                user={selectedUser}
                permissions={permissions}
                onSubmit={async (permissionIds) => {
                  try {
                    await userAPI.assignUserPermissions(selectedUser.id, permissionIds);
                    setShowModal(false);
                    fetchUsers();
                  } catch (error) {
                    console.error('Error updating permissions:', error);
                  }
                }}
                onCancel={() => setShowModal(false)}
              />
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ user, onConfirm, onCancel, isDeleting }) => (
  <div className="p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-900">تأكيد الحذف</h3>
    </div>
    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
      هل أنت متأكد من حذف المستخدم <strong className="text-gray-900 font-semibold">{user?.full_name || user?.username}</strong>؟
      <br />
      <span className="text-red-600 font-medium">لا يمكن التراجع عن هذا الإجراء.</span>
    </p>
    <div className="flex justify-end gap-3">
      <button
        onClick={onCancel}
        disabled={isDeleting}
        className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        إلغاء
      </button>
      <button
        onClick={onConfirm}
        disabled={isDeleting}
        className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isDeleting && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        )}
        {isDeleting ? 'جاري الحذف...' : 'حذف'}
      </button>
    </div>
  </div>
);

// Reset Password Modal
const ResetPasswordModal = ({ user, onSubmit, onCancel }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toastError('كلمات المرور غير متطابقة');
      return;
    }
    if (password.length < 6) {
      toastError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    onSubmit(password);
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">إعادة تعيين كلمة المرور</h3>
      </div>
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        إعادة تعيين كلمة المرور لـ <strong className="text-gray-900 font-semibold">{user?.full_name || user?.username}</strong>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">كلمة المرور الجديدة</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:border-gray-400"
            required
            minLength={6}
            placeholder="أدخل كلمة المرور الجديدة"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">تأكيد كلمة المرور</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:border-gray-400"
            required
            minLength={6}
            placeholder="أكد كلمة المرور"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
          >
            إعادة تعيين
          </button>
        </div>
      </form>
    </div>
  );
};

// Notification Modal
const NotificationModal = ({ user, onSubmit, onCancel }) => {
  const [message, setMessage] = useState('');
  const { toastError } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toastError('الرجاء كتابة رسالة');
      return;
    }
    onSubmit(message);
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">إرسال إشعار</h3>
      </div>
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        إرسال إشعار إلى <strong className="text-gray-900 font-semibold">{user?.full_name || user?.username}</strong>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">الرسالة</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:border-gray-400 resize-none"
            required
            placeholder="اكتب رسالة الإشعار هنا..."
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
          >
            إرسال
          </button>
        </div>
      </form>
    </div>
  );
};

// Activity Log Modal
const ActivityLogModal = ({ user, onClose }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await userAPI.getUserActivityLog(user.id);
        setActivities(data);
      } catch (error) {
        console.error('Error fetching activity log:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [user.id]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">سجل نشاط المستخدم</h3>
      </div>
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        سجل نشاط <strong className="text-gray-900 font-semibold">{user?.full_name || user?.username}</strong>
      </p>
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-200 border-t-teal-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-3">جاري التحميل...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 font-medium">لا توجد نشاطات مسجلة</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {activities.map((activity, index) => (
            <div key={index} className="border-r-4 border-teal-500 bg-gradient-to-l from-teal-50 to-transparent pr-4 py-3 rounded-r-lg hover:from-teal-100 transition-colors duration-200">
              <p className="text-sm font-semibold text-gray-900">{activity.action}</p>
              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(activity.timestamp).toLocaleString('en-GB')}
              </p>
              {activity.details && (
                <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-6">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};

// User Form Modal (for Add/Edit)
const UserFormModal = ({ user, roles, onSubmit, onCancel }) => {
  const { toastError } = useToast();
  const existingRoleIds = useMemo(() => {
    if (!user || !Array.isArray(user.roles)) {
      return [];
    }

    const userRoles = user.roles;
    return roles
      .filter((role) =>
        userRoles.some((assignedRole) => {
          if (!assignedRole) return false;
          if (typeof assignedRole === 'string') {
            return assignedRole === role.name;
          }
          if (typeof assignedRole === 'object') {
            if (assignedRole?.id != null && assignedRole.id === role.id) {
              return true;
            }
            if (assignedRole?.name && assignedRole.name === role.name) {
              return true;
            }
          }
          return false;
        })
      )
      .map((role) => role.id);
  }, [user, roles]);

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    password: '',
    role_ids: user ? existingRoleIds : []
  });

  useEffect(() => {
    if (!user) return;

    setFormData((prev) => {
      const prevIds = Array.isArray(prev.role_ids) ? prev.role_ids : [];
      const nextIds = existingRoleIds;

      if (prevIds.length === nextIds.length) {
        const sortedPrev = [...prevIds].sort();
        const sortedNext = [...nextIds].sort();
        const isSame = sortedPrev.every((id, index) => id === sortedNext[index]);
        if (isSame) {
          return prev;
        }
      }

      return { ...prev, role_ids: nextIds };
    });
  }, [user, existingRoleIds]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedRoleIds = formData.role_ids || [];

    if (selectedRoleIds.length === 0) {
      toastError('الرجاء اختيار دور واحد على الأقل');
      return;
    }

    if (user) {
      // Editing - send only role IDs
      onSubmit(selectedRoleIds);
    } else {
      onSubmit({
        ...formData,
        role_ids: selectedRoleIds
      });
    }
  };

  const handleRoleToggle = (roleId) => {
    setFormData(prev => {
      const currentIds = Array.isArray(prev.role_ids) ? prev.role_ids : [];
      return {
        ...prev,
        role_ids: currentIds.includes(roleId)
          ? currentIds.filter(id => id !== roleId)
          : [...currentIds, roleId]
      };
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={user ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"} />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          {user ? 'تعديل أدوار المستخدم' : 'إضافة مستخدم جديد'}
        </h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {!user && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-400"
                required
                placeholder="أدخل اسم المستخدم"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-400"
                required
                placeholder="example@domain.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                الاسم الكامل
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-400"
                required
                placeholder="أدخل الاسم الكامل"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-400"
                required
                minLength={6}
                placeholder="كلمة المرور (6 أحرف على الأقل)"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            الأدوار
          </label>
          {roles.length === 0 ? (
            <div className="text-center py-8 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <svg className="w-12 h-12 text-yellow-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-yellow-800 font-medium text-sm">لا توجد أدوار متاحة</p>
              <p className="text-yellow-700 text-xs mt-1">الرجاء التحقق من اتصال الخادم أو تسجيل الدخول مجدداً</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center p-2.5 rounded-lg hover:bg-white transition-colors duration-150 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.role_ids.includes(role.id)}
                    onChange={() => handleRoleToggle(role.id)}
                    className="ml-2 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{role.name}</span>
                    {role.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
          >
            {user ? 'حفظ التغييرات' : 'إضافة المستخدم'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Permissions Modal
const PermissionsModal = ({ user, permissions, onSubmit, onCancel }) => {
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        const userPerms = await userAPI.getUserPermissions(user.id);
        setSelectedPermissions(userPerms.map(p => p.id));
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        setSelectedPermissions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUserPermissions();
  }, [user.id]);

  const handleTogglePermission = (permId) => {
    setSelectedPermissions(prev =>
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(selectedPermissions);
  };

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const groups = {};
    permissions.forEach(perm => {
      const category = perm.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(perm);
    });
    return groups;
  }, [permissions]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">إدارة الصلاحيات</h3>
      </div>
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        إدارة صلاحيات <strong className="text-gray-900 font-semibold">{user?.full_name || user?.username}</strong>
      </p>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-3">جاري التحميل...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
            {Object.keys(groupedPermissions).length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-gray-500 font-medium">لا توجد صلاحيات متاحة</p>
              </div>
            ) : (
              Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category} className="border-2 border-purple-200 rounded-xl p-4 bg-gradient-to-br from-purple-50 to-white shadow-sm hover:shadow-md transition-all duration-200">
                  <h4 className="font-bold text-purple-900 mb-3 text-base capitalize flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {category}
                  </h4>
                  <div className="space-y-2.5">
                    {perms.map((perm) => (
                      <label key={perm.id} className="flex items-start p-2.5 rounded-lg hover:bg-white transition-colors duration-150 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={() => handleTogglePermission(perm.id)}
                          className="mt-0.5 ml-2 h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{perm.name}</span>
                          {perm.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
            >
              حفظ الصلاحيات
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserManagement;






