'use client';

// frontend/app/community/admin/certifications/page.tsx
/**
 * 管理员认证审核页面
 * 查看和审核用户的专业认证申请
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../../../lib/apiClient';
import CommunityBackground from '../../../../components/community/CommunityBackground';

const COMMUNITY_API = '/api/v1/community';

// Certification types
const certificationTypeNames: Record<string, string> = {
  certified_doctor: '医生',
  certified_therapist: '康复师',
  certified_nurse: '护士',
};

// Status config
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待审核', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  approved: { label: '已通过', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  rejected: { label: '已拒绝', color: 'text-red-700', bgColor: 'bg-red-100' },
  expired: { label: '已过期', color: 'text-stone-700', bgColor: 'bg-stone-100' },
  revoked: { label: '已撤销', color: 'text-orange-700', bgColor: 'bg-orange-100' },
};

interface CertificationItem {
  id: string;
  user_id: string;
  user_nickname: string;
  certification_type: string;
  real_name: string;
  license_number: string;
  hospital_or_institution: string;
  status: string;
  created_at: string;
}

interface PaginatedResponse {
  items: CertificationItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function AdminCertificationsPage() {
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCert, setSelectedCert] = useState<CertificationItem | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<CertificationItem | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [message, setMessage] = useState<{ show: boolean; success: boolean; text: string }>({
    show: false,
    success: true,
    text: '',
  });
  const hasFetched = useRef(false);

  const fetchCertifications = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await apiClient.get<PaginatedResponse>(`${COMMUNITY_API}/certifications/`, { params });
      setCertifications(response.data.items);
      setTotalPages(response.data.total_pages);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load certifications:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 403) {
          setError('无权限访问，仅管理员可用');
        } else {
          setError('加载失败，请刷新重试');
        }
      } else {
        setError('加载失败，请刷新重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchCertifications();
  }, []);

  useEffect(() => {
    if (hasFetched.current) {
      fetchCertifications();
    }
  }, [statusFilter, page]);

  const showMessage = (success: boolean, text: string) => {
    setMessage({ show: true, success, text });
    setTimeout(() => setMessage({ show: false, success: true, text: '' }), 3000);
  };

  const handleReview = async (certId: string, status: 'approved' | 'rejected') => {
    setIsReviewing(true);
    try {
      await apiClient.put(`${COMMUNITY_API}/certifications/${certId}/review`, {
        status,
        review_comment: reviewComment.trim() || null,
      });
      showMessage(true, status === 'approved' ? '已通过认证' : '已拒绝认证');
      setSelectedCert(null);
      setReviewComment('');
      await fetchCertifications();
    } catch (err: unknown) {
      console.error('Failed to review certification:', err);
      let errorMessage = '审核失败，请重试';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        if (axiosErr.response?.data?.detail) {
          errorMessage = axiosErr.response.data.detail;
        }
      }
      showMessage(false, errorMessage);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRevoke = async (certId: string) => {
    setIsReviewing(true);
    try {
      await apiClient.put(`${COMMUNITY_API}/certifications/${certId}/revoke`, null, {
        params: { reason: revokeReason.trim() || null },
      });
      showMessage(true, '已撤销认证');
      setRevokeTarget(null);
      setRevokeReason('');
      await fetchCertifications();
    } catch (err: unknown) {
      console.error('Failed to revoke certification:', err);
      let errorMessage = '撤销失败，请重试';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        if (axiosErr.response?.data?.detail) {
          errorMessage = axiosErr.response.data.detail;
        }
      }
      showMessage(false, errorMessage);
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <CommunityBackground />

      {/* Message toast */}
      <AnimatePresence>
        {message.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-lg backdrop-blur-md ${
              message.success ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedCert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedCert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-stone-800 mb-4">审核认证申请</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-stone-500">用户昵称:</span>
                  <span className="text-stone-700">{selectedCert.user_nickname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">认证类型:</span>
                  <span className="text-stone-700">{certificationTypeNames[selectedCert.certification_type] || selectedCert.certification_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">真实姓名:</span>
                  <span className="text-stone-700">{selectedCert.real_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">执业证号:</span>
                  <span className="text-stone-700">{selectedCert.license_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">医院/机构:</span>
                  <span className="text-stone-700">{selectedCert.hospital_or_institution}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm text-stone-600 mb-2 block">审核备注（可选）</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700 resize-none"
                  rows={3}
                  placeholder="输入审核备注..."
                  maxLength={500}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleReview(selectedCert.id, 'approved')}
                  disabled={isReviewing}
                  className="flex-1 py-2.5 bg-emerald-500 text-white font-medium rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isReviewing ? '处理中...' : '通过'}
                </button>
                <button
                  onClick={() => handleReview(selectedCert.id, 'rejected')}
                  disabled={isReviewing}
                  className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isReviewing ? '处理中...' : '拒绝'}
                </button>
                <button
                  onClick={() => setSelectedCert(null)}
                  disabled={isReviewing}
                  className="px-6 py-2.5 bg-stone-100 text-stone-600 font-medium rounded-full hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revoke Modal */}
      <AnimatePresence>
        {revokeTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setRevokeTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-stone-800 mb-4">撤销认证</h3>

              <div className="mb-4 p-4 bg-orange-50 rounded-xl text-orange-700 text-sm">
                确定要撤销 <strong>{revokeTarget.user_nickname}</strong> 的
                <strong>{certificationTypeNames[revokeTarget.certification_type]}</strong>认证吗？
                撤销后该用户将失去专业认证身份。
              </div>

              <div className="mb-6">
                <label className="text-sm text-stone-600 mb-2 block">撤销原因（可选）</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 text-stone-700 resize-none"
                  rows={3}
                  placeholder="输入撤销原因..."
                  maxLength={500}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleRevoke(revokeTarget.id)}
                  disabled={isReviewing}
                  className="flex-1 py-2.5 bg-orange-500 text-white font-medium rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {isReviewing ? '处理中...' : '确认撤销'}
                </button>
                <button
                  onClick={() => setRevokeTarget(null)}
                  disabled={isReviewing}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-600 font-medium rounded-full hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-stone-200/50"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/community"
            className="text-stone-500 hover:text-stone-700 transition-colors"
          >
            &larr; 社区
          </Link>
          <span className="text-2xl">🛡️</span>
          <span className="text-lg font-medium text-stone-700">认证审核</span>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Status filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {[
            { value: 'pending', label: '待审核' },
            { value: 'approved', label: '已通过' },
            { value: 'rejected', label: '已拒绝' },
            { value: 'revoked', label: '已撤销' },
            { value: '', label: '全部' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatusFilter(filter.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                statusFilter === filter.value
                  ? 'bg-[#e8a4b8] text-white'
                  : 'bg-white/70 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="text-stone-500">加载中...</div>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center py-16">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={() => fetchCertifications()}
              className="px-4 py-2 bg-stone-800 text-white text-sm rounded-full hover:bg-stone-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {!isLoading && !error && certifications.length === 0 && (
          <div className="text-center py-16 text-stone-500">
            暂无{statusFilter ? statusConfig[statusFilter]?.label : ''}认证申请
          </div>
        )}

        {!isLoading && !error && certifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {certifications.map((cert) => (
              <div
                key={cert.id}
                className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-stone-100/50"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-800">{cert.user_nickname}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[cert.status]?.bgColor} ${statusConfig[cert.status]?.color}`}>
                        {statusConfig[cert.status]?.label || cert.status}
                      </span>
                    </div>
                    <div className="text-sm text-stone-500 space-y-1">
                      <div>认证类型: {certificationTypeNames[cert.certification_type] || cert.certification_type}</div>
                      <div>真实姓名: {cert.real_name}</div>
                      <div>执业证号: {cert.license_number}</div>
                      <div>医院/机构: {cert.hospital_or_institution}</div>
                      <div>申请时间: {new Date(cert.created_at).toLocaleString('zh-CN')}</div>
                    </div>
                  </div>
                  {cert.status === 'pending' && (
                    <button
                      onClick={() => setSelectedCert(cert)}
                      className="px-4 py-2 bg-[#e8a4b8] text-white text-sm rounded-full hover:bg-[#d88a9f] transition-colors"
                    >
                      审核
                    </button>
                  )}
                  {cert.status === 'approved' && (
                    <button
                      onClick={() => setRevokeTarget(cert)}
                      className="px-4 py-2 bg-orange-500 text-white text-sm rounded-full hover:bg-orange-600 transition-colors"
                    >
                      撤销
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 bg-white/70 text-stone-600 rounded-full disabled:opacity-50 hover:bg-stone-100 transition-colors"
                >
                  上一页
                </button>
                <span className="px-4 py-2 text-stone-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 bg-white/70 text-stone-600 rounded-full disabled:opacity-50 hover:bg-stone-100 transition-colors"
                >
                  下一页
                </button>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
