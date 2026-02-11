// frontend/components/echo/mom/IdentityTagEditor.tsx
/**
 * 身份标签编辑器组件
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ECHO_COLORS, GLASS_STYLES } from "../../../lib/design-tokens";
import { createIdentityTag, deleteIdentityTag } from "../../../lib/api/echo";
import type { IdentityTagList, TagType } from "../../../types/echo";
import {
  TAG_TYPE_LABELS,
  TAG_TYPE_PLACEHOLDERS,
  TAG_TYPE_ICONS,
} from "../../../types/echo";

interface IdentityTagEditorProps {
  tags: IdentityTagList | null;
  onUpdate: () => void;
}

export function IdentityTagEditor({ tags, onUpdate }: IdentityTagEditorProps) {
  const [activeType, setActiveType] = useState<TagType>("music");
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tagTypes: TagType[] = ["music", "sound", "literature", "memory"];

  const handleAddTag = async () => {
    if (!inputValue.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await createIdentityTag({
        tag_type: activeType,
        content: inputValue.trim(),
      });
      setInputValue("");
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteIdentityTag(tagId);
      onUpdate();
    } catch (err) {
      console.error("Failed to delete tag:", err);
    }
  };

  const currentTags = tags ? tags[activeType] : [];

  return (
    <div className={`${GLASS_STYLES.medium} rounded-2xl p-6`}>
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: ECHO_COLORS.mom.text }}
      >
        我的身份标签
      </h3>

      {/* 标签类型切换 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {tagTypes.map((type) => (
          <motion.button
            key={type}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveType(type)}
            className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap transition-colors ${
              activeType === type
                ? "bg-white shadow-md"
                : "bg-white/30 hover:bg-white/50"
            }`}
            style={{
              color:
                activeType === type
                  ? ECHO_COLORS.mom.text
                  : ECHO_COLORS.mom.text + "99",
            }}
          >
            <span>{TAG_TYPE_ICONS[type]}</span>
            <span className="text-sm">{TAG_TYPE_LABELS[type]}</span>
            {tags && tags[type].length > 0 && (
              <span className="ml-1 text-xs bg-amber-200/50 rounded-full px-1.5">
                {tags[type].length}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* 输入区域 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
          placeholder={TAG_TYPE_PLACEHOLDERS[activeType]}
          className="flex-1 px-4 py-2 rounded-xl bg-white/50 border-0 outline-none placeholder:text-gray-400"
          style={{ color: ECHO_COLORS.mom.text }}
          disabled={submitting}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleAddTag}
          disabled={submitting || !inputValue.trim()}
          className="px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50"
          style={{ backgroundColor: ECHO_COLORS.mom.accent }}
        >
          {submitting ? "..." : "添加"}
        </motion.button>
      </div>

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-red-500 text-sm mb-4"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* 当前类型的标签列表 */}
      <div className="space-y-2">
        <p
          className="text-sm opacity-70"
          style={{ color: ECHO_COLORS.mom.text }}
        >
          {TAG_TYPE_LABELS[activeType]}
        </p>

        {currentTags.length === 0 ? (
          <p
            className="text-center opacity-50 py-4"
            style={{ color: ECHO_COLORS.mom.text }}
          >
            还没有添加标签
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {currentTags.map((tag) => (
                <motion.div
                  key={tag.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/60 rounded-full group"
                >
                  <span style={{ color: ECHO_COLORS.mom.text }}>
                    {tag.content}
                  </span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-100 rounded-full"
                  >
                    <svg
                      className="w-3 h-3 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 提示文字 */}
      <p
        className="text-xs opacity-50 mt-4 text-center"
        style={{ color: ECHO_COLORS.mom.text }}
      >
        添加的标签将用于匹配专属场景和音频
      </p>
    </div>
  );
}
