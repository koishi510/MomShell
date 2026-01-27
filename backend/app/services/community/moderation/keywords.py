"""Sensitive keyword filter for content moderation."""

from ..enums import SensitiveCategory


class KeywordFilter:
    """Sensitive keyword filter using keyword matching."""

    # Sensitive keyword dictionary
    KEYWORDS: dict[SensitiveCategory, list[str]] = {
        SensitiveCategory.PSEUDOSCIENCE: [
            "偏方",
            "土方子",
            "民间秘方",
            "祖传秘方",
            "包治百病",
            "排毒养颜",
            "清宫表",
            "酸碱体质",
            "以形补形",
            "神药",
            "祖传",
            "秘制",
            "包好",
            "根治",
        ],
        SensitiveCategory.DEPRESSION_TRIGGER: [
            "不想活",
            "想死",
            "活着没意思",
            "自杀",
            "自残",
            "割腕",
            "跳楼",
            "解脱",
            "了结",
            "轻生",
            "死了算了",
            "不如死",
            "活不下去",
            "去死",
            "寻死",
        ],
        SensitiveCategory.SELF_HARM: [
            "自我伤害",
            "伤害自己",
            "划手臂",
            "烫伤自己",
            "故意受伤",
        ],
        SensitiveCategory.SPAM: [
            "加微信",
            "加VX",
            "加v",
            "加QQ",
            "私聊",
            "免费领取",
            "限时优惠",
            "代购",
            "招代理",
            "兼职赚钱",
            "躺赚",
            "日入过万",
            "扫码领取",
            "点击链接",
        ],
        SensitiveCategory.SOFT_PORNOGRAPHY: [
            "约炮",
            "一夜情",
            "找小姐",
            "开房",
            "裸聊",
            "色情",
            "成人视频",
        ],
        SensitiveCategory.VIOLENCE: [
            "打死",
            "杀了",
            "弄死",
            "虐待",
            "殴打",
            "暴打",
        ],
        SensitiveCategory.HARASSMENT: [
            "傻逼",
            "脑残",
            "智障",
            "垃圾",
            "废物",
            "去死",
            "滚蛋",
            "贱人",
        ],
        SensitiveCategory.MISINFORMATION: [
            "不用吃药",
            "不用去医院",
            "医生都是骗子",
            "疫苗有毒",
            "转基因致癌",
        ],
        SensitiveCategory.POLITICAL: [
            # Intentionally minimal - most political content needs manual review
        ],
    }

    def scan(self, content: str) -> list[SensitiveCategory]:
        """
        Scan text content for sensitive keywords.

        Args:
            content: Text content to scan

        Returns:
            List of detected sensitive categories
        """
        detected: list[SensitiveCategory] = []
        content_lower = content.lower()

        for category, keywords in self.KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in content_lower:
                    detected.append(category)
                    break  # One match per category is enough

        return detected

    def get_matched_keywords(self, content: str) -> dict[SensitiveCategory, list[str]]:
        """
        Get all matched keywords for each category.

        Args:
            content: Text content to scan

        Returns:
            Dictionary mapping categories to matched keywords
        """
        matched: dict[SensitiveCategory, list[str]] = {}
        content_lower = content.lower()

        for category, keywords in self.KEYWORDS.items():
            category_matches = []
            for keyword in keywords:
                if keyword.lower() in content_lower:
                    category_matches.append(keyword)
            if category_matches:
                matched[category] = category_matches

        return matched
