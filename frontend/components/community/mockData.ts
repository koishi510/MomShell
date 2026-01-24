// frontend/components/community/mockData.ts
/**
 * Mock 数据用于 UI 展示
 */

import { type Question, type HotTopic } from '../../types/community';

export const mockQuestions: Question[] = [
  {
    id: '1',
    title: '产后两个月了，腹直肌分离还能恢复吗？',
    content:
      '生完宝宝两个月了，发现肚子还是很大，去医院检查说是腹直肌分离两指宽。想问问大家这种情况还能恢复吗？需要做手术吗？平时有什么锻炼方法可以帮助恢复？',
    content_preview:
      '生完宝宝两个月了，发现肚子还是很大，去医院检查说是腹直肌分离两指宽。想问问大家这种情况还能恢复吗...',
    channel: 'experience',
    status: 'published',
    author: {
      id: 'u1',
      nickname: '小雨妈妈',
      avatar_url: null,
      role: 'mom',
      is_certified: false,
    },
    tags: [
      { id: 't1', name: '腹直肌分离', slug: 'diastasis-recti' },
      { id: 't2', name: '产后恢复', slug: 'postpartum-recovery' },
    ],
    image_urls: [],
    view_count: 1234,
    answer_count: 8,
    like_count: 56,
    collection_count: 23,
    is_liked: false,
    is_collected: false,
    professional_answer_count: 2,
    experience_answer_count: 6,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2小时前
    has_accepted_answer: false,
  },
  {
    id: '2',
    title: '关于产后抑郁，我想分享一下我的经历',
    content:
      '生完宝宝第三周的时候，我开始感觉到一种难以言喻的低落情绪。当时我以为只是太累了，但后来情况越来越严重...',
    content_preview:
      '生完宝宝第三周的时候，我开始感觉到一种难以言喻的低落情绪。当时我以为只是太累了，但后来情况越来越严重...',
    channel: 'experience',
    status: 'published',
    author: {
      id: 'u2',
      nickname: '阳光妈咪',
      avatar_url: null,
      role: 'mom',
      is_certified: false,
    },
    tags: [
      { id: 't3', name: '产后抑郁', slug: 'postpartum-depression' },
      { id: 't4', name: '心理健康', slug: 'mental-health' },
    ],
    image_urls: [],
    view_count: 3456,
    answer_count: 24,
    like_count: 189,
    collection_count: 78,
    is_liked: true,
    is_collected: true,
    professional_answer_count: 3,
    experience_answer_count: 21,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(), // 5小时前
    has_accepted_answer: true,
  },
  {
    id: '3',
    title: '产后盆底肌修复的科学方法有哪些？',
    content:
      '作为一名从业15年的康复科医生，我想跟大家分享一些关于产后盆底肌修复的专业知识。盆底肌损伤是产后非常常见的问题...',
    content_preview:
      '作为一名从业15年的康复科医生，我想跟大家分享一些关于产后盆底肌修复的专业知识...',
    channel: 'professional',
    status: 'published',
    author: {
      id: 'u3',
      nickname: '张医生',
      avatar_url: null,
      role: 'certified_doctor',
      is_certified: true,
      certification_title: '北京协和医院 康复科 主任医师',
    },
    tags: [
      { id: 't5', name: '盆底肌', slug: 'pelvic-floor' },
      { id: 't2', name: '产后恢复', slug: 'postpartum-recovery' },
    ],
    image_urls: [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=2',
    ],
    view_count: 5678,
    answer_count: 12,
    like_count: 234,
    collection_count: 156,
    is_liked: false,
    is_collected: false,
    professional_answer_count: 5,
    experience_answer_count: 7,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(), // 1天前
    has_accepted_answer: false,
  },
  {
    id: '4',
    title: '剖腹产后多久可以开始运动？',
    content:
      '我是剖腹产，现在产后6周了，伤口已经愈合得差不多了。想开始做一些轻度运动，但不知道什么时候开始比较合适，有没有专业的建议？',
    content_preview:
      '我是剖腹产，现在产后6周了，伤口已经愈合得差不多了。想开始做一些轻度运动...',
    channel: 'professional',
    status: 'published',
    author: {
      id: 'u4',
      nickname: '豆豆麻麻',
      avatar_url: null,
      role: 'mom',
      is_certified: false,
    },
    tags: [
      { id: 't6', name: '剖腹产', slug: 'c-section' },
      { id: 't7', name: '产后运动', slug: 'postpartum-exercise' },
    ],
    image_urls: [],
    view_count: 2345,
    answer_count: 6,
    like_count: 45,
    collection_count: 32,
    is_liked: false,
    is_collected: false,
    professional_answer_count: 4,
    experience_answer_count: 2,
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(), // 8小时前
    has_accepted_answer: true,
  },
  {
    id: '5',
    title: '母乳喂养遇到的问题，求助！',
    content:
      '宝宝出生15天了，母乳喂养一直不太顺利。乳头皲裂特别疼，而且感觉奶水不够宝宝吃。有经验的妈妈能分享一下吗？',
    content_preview:
      '宝宝出生15天了，母乳喂养一直不太顺利。乳头皲裂特别疼，而且感觉奶水不够宝宝吃...',
    channel: 'experience',
    status: 'pending_review',
    author: {
      id: 'u5',
      nickname: '新手妈妈小白',
      avatar_url: null,
      role: 'mom',
      is_certified: false,
    },
    tags: [
      { id: 't8', name: '母乳喂养', slug: 'breastfeeding' },
    ],
    image_urls: [],
    view_count: 0,
    answer_count: 0,
    like_count: 0,
    collection_count: 0,
    is_liked: false,
    is_collected: false,
    professional_answer_count: 0,
    experience_answer_count: 0,
    created_at: new Date(Date.now() - 60000 * 5).toISOString(), // 5分钟前
    has_accepted_answer: false,
  },
  {
    id: '6',
    title: '产后康复师告诉你：这些常见误区要避开',
    content:
      '作为一名产后康复师，我在工作中遇到过很多新手妈妈对产后恢复存在误解。今天就来给大家讲讲最常见的几个误区...',
    content_preview:
      '作为一名产后康复师，我在工作中遇到过很多新手妈妈对产后恢复存在误解...',
    channel: 'professional',
    status: 'published',
    author: {
      id: 'u6',
      nickname: '李康复师',
      avatar_url: null,
      role: 'certified_therapist',
      is_certified: true,
      certification_title: '北京妇产医院 产后康复中心 高级康复师',
    },
    tags: [
      { id: 't2', name: '产后恢复', slug: 'postpartum-recovery' },
      { id: 't9', name: '康复知识', slug: 'rehab-knowledge' },
    ],
    image_urls: [
      'https://picsum.photos/400/300?random=3',
      'https://picsum.photos/400/300?random=4',
      'https://picsum.photos/400/300?random=5',
    ],
    view_count: 8901,
    answer_count: 18,
    like_count: 456,
    collection_count: 234,
    is_liked: true,
    is_collected: false,
    professional_answer_count: 6,
    experience_answer_count: 12,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(), // 2天前
    has_accepted_answer: false,
  },
];

export const mockHotTopics: HotTopic[] = [
  { id: 'ht1', name: '产后抑郁如何自我调节', question_count: 156, trend: 'up' },
  { id: 'ht2', name: '腹直肌分离恢复训练', question_count: 134, trend: 'up' },
  { id: 'ht3', name: '母乳喂养技巧分享', question_count: 98, trend: 'stable' },
  { id: 'ht4', name: '产后减重经验', question_count: 87, trend: 'down' },
  { id: 'ht5', name: '盆底肌修复方法', question_count: 76, trend: 'up' },
];

export const mockCollections = [
  { id: 'c1', title: '产后盆底肌修复的科学方法有哪些？' },
  { id: 'c2', title: '关于产后抑郁，我想分享一下我的经历' },
  { id: 'c3', title: '产后康复师告诉你：这些常见误区要避开' },
];
