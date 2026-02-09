'use client';

// frontend/app/community/certification/page.tsx
/**
 * 专业认证申请页面
 * 医护人员可以提交认证申请
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getMyCertification,
  createCertification,
  type CertificationStatus,
  type CertificationType,
} from '../../../lib/api/community';
import CommunityBackground from '../../../components/community/CommunityBackground';
import { AuthGuard } from '../../../components/AuthGuard';

// Certification type options
const certificationTypes = [
  { value: 'certified_doctor', label: '医生' },
  { value: 'certified_therapist', label: '康复师' },
  { value: 'certified_nurse', label: '护士' },
] as const;

// Status display config
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待审核', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  approved: { label: '已通过', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  rejected: { label: '已拒绝', color: 'text-red-700', bgColor: 'bg-red-100' },
  expired: { label: '已过期', color: 'text-stone-700', bgColor: 'bg-stone-100' },
};

function CertificationContent() {
  const [certification, setCertification] = useState<CertificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ show: boolean; success: boolean; text: string }>({
    show: false,
    success: true,
    text: '',
  });
  const hasFetched = useRef(false);

  // Form state
  const [formData, setFormData] = useState({
    certification_type: 'certified_doctor' as CertificationType,
    real_name: '',
    id_card_number: '',
    license_number: '',
    hospital_or_institution: '',
    department: '',
    title: '',
  });

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function loadCertification() {
      try {
        const data = await getMyCertification();
        setCertification(data);
      } catch (err) {
        console.error('Failed to load certification:', err);
        setError('加载失败，请刷新重试');
      } finally {
        setIsLoading(false);
      }
    }
    loadCertification();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const showError = (text: string) => {
    setSubmitMessage({ show: true, success: false, text });
    setTimeout(() => setSubmitMessage({ show: false, success: true, text: '' }), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - match backend constraints
    const realName = formData.real_name.trim();
    const licenseNumber = formData.license_number.trim();
    const hospital = formData.hospital_or_institution.trim();
    const idCard = formData.id_card_number.trim();
    const department = formData.department.trim();
    const title = formData.title.trim();

    if (realName.length < 2) {
      showError('真实姓名至少需要2个字符');
      return;
    }

    if (licenseNumber.length < 5) {
      showError('执业证号至少需要5个字符');
      return;
    }

    if (hospital.length < 2) {
      showError('医院/机构名称至少需要2个字符');
      return;
    }

    // ID card must be exactly 18 chars if provided
    if (idCard && idCard.length !== 18) {
      showError('身份证号必须是18位');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCertification({
        certification_type: formData.certification_type,
        real_name: realName,
        id_card_number: idCard || undefined,
        license_number: licenseNumber,
        hospital_or_institution: hospital,
        department: department || undefined,
        title: title || undefined,
        license_image_url: 'pending', // Placeholder for now
      });
      setCertification(result);
      setSubmitMessage({ show: true, success: true, text: '认证申请已提交，请等待审核' });
      setTimeout(() => setSubmitMessage({ show: false, success: true, text: '' }), 3000);
    } catch (err: unknown) {
      console.error('Failed to submit certification:', err);
      let errorMessage = '提交失败，请重试';

      // Handle axios error response
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string | Array<{ msg: string }> } } };
        const detail = axiosErr.response?.data?.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          // Pydantic validation errors
          errorMessage = detail.map(e => e.msg).join('; ');
        }
      }

      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !certification || certification.status === 'rejected' || certification.status === 'expired';

  return (
    <div className="relative min-h-screen overflow-hidden">
      <CommunityBackground />

      {/* Submit message toast */}
      <AnimatePresence>
        {submitMessage.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-lg backdrop-blur-md ${
              submitMessage.success
                ? 'bg-emerald-500/90 text-white'
                : 'bg-red-500/90 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {submitMessage.success ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{submitMessage.text}</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>{submitMessage.text}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200/50"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/profile"
            className="text-stone-500 hover:text-stone-700 transition-colors"
          >
            &larr; 个人中心
          </Link>
          <span className="text-2xl">🏥</span>
          <span className="text-lg font-medium text-stone-700">专业认证</span>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="text-stone-500">加载中...</div>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center py-16">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-stone-800 text-white text-sm rounded-full hover:bg-stone-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Current certification status */}
            {certification && (
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-stone-100/50">
                <h3 className="text-stone-700 font-medium mb-4">认证状态</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-stone-500">状态：</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${statusConfig[certification.status]?.bgColor} ${statusConfig[certification.status]?.color}`}>
                      {statusConfig[certification.status]?.label || certification.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-500">认证类型：</span>
                    <span className="text-stone-700">
                      {certificationTypes.find((t) => t.value === certification.certification_type)?.label || certification.certification_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-500">姓名：</span>
                    <span className="text-stone-700">{certification.real_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-500">医院/机构：</span>
                    <span className="text-stone-700">{certification.hospital_or_institution}</span>
                  </div>
                  {certification.department && (
                    <div className="flex items-center gap-3">
                      <span className="text-stone-500">科室：</span>
                      <span className="text-stone-700">{certification.department}</span>
                    </div>
                  )}
                  {certification.title && (
                    <div className="flex items-center gap-3">
                      <span className="text-stone-500">职称：</span>
                      <span className="text-stone-700">{certification.title}</span>
                    </div>
                  )}
                  {certification.review_comment && (
                    <div className="mt-4 p-3 bg-stone-50 rounded-xl">
                      <span className="text-stone-500 text-sm">审核备注：</span>
                      <p className="text-stone-700 mt-1">{certification.review_comment}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Application form */}
            {canSubmit && (
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-stone-100/50">
                <h3 className="text-stone-700 font-medium mb-4">
                  {certification ? '重新申请认证' : '申请专业认证'}
                </h3>
                <p className="text-stone-500 text-sm mb-6">
                  认证通过后，您可以在专业频道回答问题，您的回答将显示专业身份标识。
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Certification type */}
                  <div className="space-y-2">
                    <label className="text-sm text-stone-600">认证类型 *</label>
                    <div className="flex gap-2">
                      {certificationTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleInputChange('certification_type', type.value)}
                          className={`px-4 py-2 rounded-full text-sm transition-colors ${
                            formData.certification_type === type.value
                              ? 'bg-[#e8a4b8] text-white'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Real name */}
                  <div className="space-y-2">
                    <label className="text-sm text-stone-600">真实姓名 *</label>
                    <input
                      type="text"
                      value={formData.real_name}
                      onChange={(e) => handleInputChange('real_name', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700"
                      placeholder="请输入真实姓名（至少2个字符）"
                      maxLength={50}
                    />
                  </div>

                  {/* ID card number (optional) */}
                  <div className="space-y-2">
                    <label className="text-sm text-stone-600">身份证号（可选）</label>
                    <input
                      type="text"
                      value={formData.id_card_number}
                      onChange={(e) => handleInputChange('id_card_number', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700"
                      placeholder="请输入18位身份证号（可不填）"
                      maxLength={18}
                    />
                  </div>

                  {/* License number */}
                  <div className="space-y-2">
                    <label className="text-sm text-stone-600">执业证号 *</label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => handleInputChange('license_number', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700"
                      placeholder="请输入执业证号（至少5个字符）"
                      maxLength={100}
                    />
                  </div>

                  {/* Hospital / Institution */}
                  <div className="space-y-2">
                    <label className="text-sm text-stone-600">医院/机构 *</label>
                    <input
                      type="text"
                      value={formData.hospital_or_institution}
                      onChange={(e) => handleInputChange('hospital_or_institution', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700"
                      placeholder="请输入所在医院或机构名称（至少2个字符）"
                      maxLength={200}
                    />
                  </div>

                  {/* Department (optional) */}
                  <div className="space-y-2">
                    <label className="text-sm text-stone-600">科室（可选）</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700"
                      placeholder="请输入科室名称"
                      maxLength={100}
                    />
                  </div>

                  {/* Title (optional) */}
                  <div className="space-y-2">
                    <label className="text-sm text-stone-600">职称（可选）</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700"
                      placeholder="如：主治医师、副主任医师等"
                      maxLength={50}
                    />
                  </div>

                  {/* Submit button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#e8a4b8] text-white font-medium rounded-full hover:bg-[#d88a9f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? '提交中...' : '提交认证申请'}
                    </button>
                  </div>

                  <p className="text-stone-400 text-xs text-center">
                    提交后将由管理员审核，审核结果将在此页面显示
                  </p>
                </form>
              </div>
            )}

            {/* Already approved message */}
            {certification && certification.status === 'approved' && (
              <div className="bg-emerald-50/70 backdrop-blur-sm rounded-3xl p-6 border border-emerald-100/50 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <h3 className="text-emerald-700 font-medium mb-2">恭喜您已通过认证！</h3>
                <p className="text-emerald-600 text-sm">
                  您现在可以在专业频道回答问题，帮助更多的家庭。
                </p>
              </div>
            )}

            {/* Pending message */}
            {certification && certification.status === 'pending' && (
              <div className="bg-amber-50/70 backdrop-blur-sm rounded-3xl p-6 border border-amber-100/50 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <h3 className="text-amber-700 font-medium mb-2">认证申请审核中</h3>
                <p className="text-amber-600 text-sm">
                  请耐心等待管理员审核，通常会在1-3个工作日内完成。
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}


export default function CertificationPage() {
  return (
    <AuthGuard>
      <CertificationContent />
    </AuthGuard>
  );
}
