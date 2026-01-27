"""Postpartum recovery exercise library.

This module defines a curated library of exercises specifically designed
for postpartum recovery, focusing on:
- Diastasis recti repair
- Pelvic floor strengthening
- Core rehabilitation
- Posture correction
"""

from app.schemas.exercise import (
    AngleRequirement,
    Difficulty,
    Exercise,
    ExerciseCategory,
    ExercisePhase,
    ExerciseSession,
    PhaseRequirement,
)

# =============================================================================
# BREATHING EXERCISES
# =============================================================================

DIAPHRAGMATIC_BREATHING = Exercise(
    id="diaphragmatic_breathing",
    name="腹式呼吸",
    name_en="Diaphragmatic Breathing",
    category=ExerciseCategory.BREATHING,
    difficulty=Difficulty.BEGINNER,
    description="通过深度腹式呼吸激活横膈膜，帮助放松身心，是所有康复训练的基础。",
    benefits=[
        "激活横膈膜和深层核心肌群",
        "减轻焦虑和压力",
        "改善氧气供应",
        "为盆底肌训练做准备",
    ],
    contraindications=[],
    phases=[
        PhaseRequirement(
            phase=ExercisePhase.PREPARATION,
            duration_seconds=3,
            description="仰卧，双膝弯曲，双脚平放在地面上，一只手放在胸口，一只手放在腹部。",
            cues=["找一个舒适的姿势", "放松肩膀"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.INHALE,
            duration_seconds=4,
            description="用鼻子缓慢吸气，感受腹部向上隆起，胸部保持不动。",
            cues=["用鼻子吸气", "感受腹部隆起", "胸部不要动"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.HOLD,
            duration_seconds=2,
            description="短暂屏息，感受腹部的扩张。",
            cues=["轻轻屏住呼吸"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.EXHALE,
            duration_seconds=6,
            description="用嘴巴缓慢呼气，感受腹部向内收缩。",
            cues=["用嘴巴呼气", "腹部向内收", "完全呼出"],
        ),
    ],
    repetitions=10,
    sets=3,
    rest_between_sets=30,
)

CORE_ACTIVATION_BREATH = Exercise(
    id="core_activation_breath",
    name="核心激活呼吸",
    name_en="Core Activation Breath",
    category=ExerciseCategory.BREATHING,
    difficulty=Difficulty.BEGINNER,
    description="结合呼吸与轻柔的腹部收缩，安全地激活深层核心肌群。",
    benefits=[
        "安全激活腹横肌",
        "建立核心意识",
        "为更高级的训练做准备",
    ],
    contraindications=["严重腹直肌分离（>3指宽）建议先咨询医生"],
    phases=[
        PhaseRequirement(
            phase=ExercisePhase.PREPARATION,
            duration_seconds=3,
            description="仰卧，双膝弯曲，脊柱保持自然曲度。",
            cues=["放松身体", "保持自然呼吸"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.INHALE,
            duration_seconds=4,
            description="深吸气，让腹部自然扩张。",
            cues=["用鼻子吸气", "腹部放松"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.EXHALE,
            duration_seconds=6,
            description="呼气时，想象肚脐向脊柱方向轻轻靠近，同时轻轻收紧盆底肌。",
            cues=["呼气", "肚脐向内收", "轻轻提起盆底肌", "不要憋气"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.HOLD,
            duration_seconds=3,
            description="保持这个轻柔的收缩，继续正常呼吸。",
            cues=["保持收缩", "继续呼吸"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.RELEASE,
            duration_seconds=2,
            description="缓慢放松。",
            cues=["慢慢放松"],
        ),
    ],
    repetitions=10,
    sets=3,
    rest_between_sets=30,
)

# =============================================================================
# PELVIC FLOOR EXERCISES
# =============================================================================

KEGEL_EXERCISE = Exercise(
    id="kegel_exercise",
    name="凯格尔运动",
    name_en="Kegel Exercise",
    category=ExerciseCategory.PELVIC_FLOOR,
    difficulty=Difficulty.BEGINNER,
    description="收缩和放松盆底肌群，增强盆底支撑力，改善尿失禁。",
    benefits=[
        "增强盆底肌力量",
        "改善尿失禁",
        "加速产后恢复",
        "提高性生活质量",
    ],
    contraindications=[
        "盆底肌过度紧张者",
        "盆腔炎症期间",
    ],
    phases=[
        PhaseRequirement(
            phase=ExercisePhase.PREPARATION,
            duration_seconds=3,
            description="找到一个舒适的姿势，可以躺着、坐着或站着。放松臀部和大腿肌肉。",
            cues=["放松臀部", "放松大腿", "只关注盆底肌"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.INHALE,
            duration_seconds=2,
            description="深吸一口气准备。",
            cues=["深吸气"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.EXHALE,
            duration_seconds=5,
            description="呼气时，想象要憋住尿或者阻止放屁，收紧盆底肌向上提。",
            cues=["呼气", "向上提起盆底肌", "像憋尿一样", "不要收紧臀部"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.HOLD,
            duration_seconds=5,
            description="保持收缩，继续正常呼吸。",
            cues=["保持住", "继续呼吸", "不要憋气"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.RELEASE,
            duration_seconds=5,
            description="缓慢完全放松盆底肌。",
            cues=["慢慢放松", "完全放松"],
        ),
    ],
    repetitions=10,
    sets=3,
    rest_between_sets=60,
)

PELVIC_TILT = Exercise(
    id="pelvic_tilt",
    name="骨盆倾斜",
    name_en="Pelvic Tilt",
    category=ExerciseCategory.PELVIC_FLOOR,
    difficulty=Difficulty.BEGINNER,
    description="通过轻柔的骨盆运动，激活深层核心和下背部肌肉。",
    benefits=[
        "缓解下背痛",
        "激活深层核心肌群",
        "改善骨盆灵活性",
        "安全的产后早期运动",
    ],
    contraindications=[],
    phases=[
        PhaseRequirement(
            phase=ExercisePhase.PREPARATION,
            duration_seconds=3,
            description="仰卧，双膝弯曲，双脚平放在地面上，与臀部同宽。",
            angles=[
                AngleRequirement(
                    joint_name="knee",
                    min_angle=80,
                    max_angle=100,
                    ideal_angle=90,
                ),
            ],
            cues=["躺平", "双膝弯曲", "双脚与臀部同宽"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.INHALE,
            duration_seconds=3,
            description="吸气，让下背部自然地离开地面，形成一个小小的弧度。",
            cues=["吸气", "下背部轻轻离开地面"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.EXHALE,
            duration_seconds=4,
            description="呼气，将下背部压向地面，骨盆向后倾斜，收紧腹部。",
            cues=["呼气", "下背部贴地", "骨盆后倾", "收紧小腹"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.HOLD,
            duration_seconds=3,
            description="保持这个位置。",
            cues=["保持住"],
        ),
    ],
    repetitions=15,
    sets=3,
    rest_between_sets=30,
)

# =============================================================================
# DIASTASIS RECTI EXERCISES
# =============================================================================

DEAD_BUG_MODIFIED = Exercise(
    id="dead_bug_modified",
    name="死虫式（简化版）",
    name_en="Dead Bug Modified",
    category=ExerciseCategory.DIASTASIS_RECTI,
    difficulty=Difficulty.BEGINNER,
    description="安全的核心训练动作，在保护腹直肌的同时增强核心稳定性。",
    benefits=[
        "安全修复腹直肌分离",
        "增强核心稳定性",
        "改善身体协调性",
        "保护脊柱",
    ],
    contraindications=[
        "做动作时感到腹部鼓起（圆顶现象）",
        "下背部疼痛",
    ],
    phases=[
        PhaseRequirement(
            phase=ExercisePhase.PREPARATION,
            duration_seconds=3,
            description="仰卧，双膝弯曲90度，小腿与地面平行（桌面位置），双臂向天花板伸直。",
            angles=[
                AngleRequirement(
                    joint_name="hip",
                    min_angle=85,
                    max_angle=95,
                    ideal_angle=90,
                ),
                AngleRequirement(
                    joint_name="knee",
                    min_angle=85,
                    max_angle=95,
                    ideal_angle=90,
                ),
            ],
            cues=["膝盖弯曲90度", "小腿与地面平行", "双臂伸向天花板"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.INHALE,
            duration_seconds=3,
            description="吸气准备，保持下背部贴地。",
            cues=["吸气", "下背部贴地"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.EXHALE,
            duration_seconds=4,
            description="呼气，慢慢将一只脚向前滑动（脚跟贴地），同时收紧核心。",
            cues=["呼气", "一只脚向前滑", "脚跟贴地", "核心收紧", "下背部不要离开地面"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.INHALE,
            duration_seconds=3,
            description="吸气，将腿收回起始位置。",
            cues=["吸气", "收回"],
        ),
    ],
    repetitions=8,
    sets=3,
    rest_between_sets=45,
)

ABDOMINAL_BRACING = Exercise(
    id="abdominal_bracing",
    name="腹部支撑",
    name_en="Abdominal Bracing",
    category=ExerciseCategory.DIASTASIS_RECTI,
    difficulty=Difficulty.BEGINNER,
    description="学习正确的腹部收缩方式，保护腹直肌，为日常活动打好基础。",
    benefits=[
        "建立正确的核心激活模式",
        "保护腹直肌",
        "为日常活动提供支撑",
    ],
    contraindications=[],
    phases=[
        PhaseRequirement(
            phase=ExercisePhase.PREPARATION,
            duration_seconds=3,
            description="可以仰卧、坐着或站着，脊柱保持自然中立位。",
            cues=["找到舒适的姿势", "脊柱自然"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.INHALE,
            duration_seconds=3,
            description="深吸气，放松腹部。",
            cues=["深吸气", "腹部放松"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.EXHALE,
            duration_seconds=5,
            description="呼气，想象要轻轻收紧腰带，腹部360度向内收紧，但不是用力吸肚子。",
            cues=["呼气", "想象收紧腰带", "360度收紧", "不是吸肚子"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.HOLD,
            duration_seconds=10,
            description="保持这个轻柔的张力，继续正常呼吸。",
            cues=["保持张力", "正常呼吸", "不要憋气"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.RELEASE,
            duration_seconds=3,
            description="完全放松。",
            cues=["放松"],
        ),
    ],
    repetitions=8,
    sets=3,
    rest_between_sets=30,
)

# =============================================================================
# POSTURE EXERCISES
# =============================================================================

CAT_COW = Exercise(
    id="cat_cow",
    name="猫牛式",
    name_en="Cat-Cow Stretch",
    category=ExerciseCategory.POSTURE,
    difficulty=Difficulty.BEGINNER,
    description="经典的脊柱灵活性练习，缓解背部紧张，改善脊柱灵活性。",
    benefits=[
        "缓解背部紧张",
        "改善脊柱灵活性",
        "放松肩颈",
        "配合呼吸促进放松",
    ],
    contraindications=[
        "手腕疼痛（可以用前臂支撑代替）",
    ],
    phases=[
        PhaseRequirement(
            phase=ExercisePhase.PREPARATION,
            duration_seconds=3,
            description="四点跪姿，手腕在肩膀正下方，膝盖在臀部正下方。",
            angles=[
                AngleRequirement(
                    joint_name="shoulder",
                    min_angle=85,
                    max_angle=95,
                    ideal_angle=90,
                ),
            ],
            cues=["四点跪姿", "手腕在肩膀下方", "膝盖在臀部下方"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.INHALE,
            duration_seconds=4,
            description="吸气，腹部下沉，抬头看向天花板，臀部翘起（牛式）。",
            cues=["吸气", "腹部下沉", "抬头", "臀部翘起"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.EXHALE,
            duration_seconds=4,
            description="呼气，背部拱起像猫咪一样，低头看向肚脐（猫式）。",
            cues=["呼气", "背部拱起", "低头", "肚脐向脊柱靠近"],
        ),
    ],
    repetitions=10,
    sets=2,
    rest_between_sets=30,
)

GLUTE_BRIDGE = Exercise(
    id="glute_bridge",
    name="肩桥",
    name_en="Glute Bridge",
    category=ExerciseCategory.STRENGTH,
    difficulty=Difficulty.BEGINNER,
    description="增强臀部和后侧链力量，改善骨盆稳定性。",
    benefits=[
        "增强臀部力量",
        "改善骨盆稳定性",
        "缓解下背痛",
        "激活后侧链",
    ],
    contraindications=[
        "严重耻骨联合分离",
    ],
    phases=[
        PhaseRequirement(
            phase=ExercisePhase.PREPARATION,
            duration_seconds=3,
            description="仰卧，双膝弯曲，双脚平放地面与臀部同宽，双臂放在身体两侧。",
            angles=[
                AngleRequirement(
                    joint_name="knee",
                    min_angle=80,
                    max_angle=100,
                    ideal_angle=90,
                ),
            ],
            cues=["躺平", "双膝弯曲", "双脚与臀部同宽"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.EXHALE,
            duration_seconds=4,
            description="呼气，收紧核心和臀部，将臀部抬离地面，直到身体从肩膀到膝盖成一条直线。",
            angles=[
                AngleRequirement(
                    joint_name="hip",
                    min_angle=170,
                    max_angle=180,
                    ideal_angle=175,
                ),
            ],
            cues=["呼气", "收紧臀部", "臀部抬起", "肩到膝成一条线", "不要过度拱背"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.HOLD,
            duration_seconds=3,
            description="在顶部保持，继续挤压臀部。",
            cues=["保持", "挤压臀部"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.INHALE,
            duration_seconds=3,
            description="吸气，缓慢将臀部放回地面。",
            cues=["吸气", "慢慢放下"],
        ),
    ],
    repetitions=12,
    sets=3,
    rest_between_sets=45,
)

SIDE_LYING_LEG_LIFT = Exercise(
    id="side_lying_leg_lift",
    name="侧卧抬腿",
    name_en="Side-Lying Leg Lift",
    category=ExerciseCategory.STRENGTH,
    difficulty=Difficulty.BEGINNER,
    description="增强臀中肌和髋部稳定性，改善行走和站立的稳定性。",
    benefits=[
        "增强臀中肌",
        "改善髋部稳定性",
        "预防和缓解髋部疼痛",
    ],
    contraindications=[],
    phases=[
        PhaseRequirement(
            phase=ExercisePhase.PREPARATION,
            duration_seconds=3,
            description="侧卧，下方手臂支撑头部，上方手放在髋部或地面上保持稳定，双腿伸直叠放。",
            cues=["侧卧", "身体成一条直线", "双腿叠放"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.EXHALE,
            duration_seconds=3,
            description="呼气，收紧核心，将上方腿向上抬起约30-45度，保持脚尖朝前。",
            angles=[
                AngleRequirement(
                    joint_name="hip_abduction",
                    min_angle=25,
                    max_angle=50,
                    ideal_angle=35,
                ),
            ],
            cues=["呼气", "抬起上方腿", "脚尖朝前", "不要旋转骨盆"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.HOLD,
            duration_seconds=2,
            description="在顶部短暂保持。",
            cues=["保持"],
        ),
        PhaseRequirement(
            phase=ExercisePhase.INHALE,
            duration_seconds=3,
            description="吸气，缓慢放下腿部。",
            cues=["吸气", "慢慢放下"],
        ),
    ],
    repetitions=12,
    sets=3,
    rest_between_sets=30,
)

# =============================================================================
# EXERCISE LIBRARY
# =============================================================================

EXERCISE_LIBRARY: dict[str, Exercise] = {
    # Breathing
    DIAPHRAGMATIC_BREATHING.id: DIAPHRAGMATIC_BREATHING,
    CORE_ACTIVATION_BREATH.id: CORE_ACTIVATION_BREATH,
    # Pelvic Floor
    KEGEL_EXERCISE.id: KEGEL_EXERCISE,
    PELVIC_TILT.id: PELVIC_TILT,
    # Diastasis Recti
    DEAD_BUG_MODIFIED.id: DEAD_BUG_MODIFIED,
    ABDOMINAL_BRACING.id: ABDOMINAL_BRACING,
    # Posture & Strength
    CAT_COW.id: CAT_COW,
    GLUTE_BRIDGE.id: GLUTE_BRIDGE,
    SIDE_LYING_LEG_LIFT.id: SIDE_LYING_LEG_LIFT,
}

# =============================================================================
# TRAINING SESSIONS
# =============================================================================

BEGINNER_CORE_SESSION = ExerciseSession(
    id="beginner_core",
    name="初级核心训练",
    description="适合产后早期的温和核心训练，专注于呼吸和核心激活。",
    exercises=[
        "diaphragmatic_breathing",
        "core_activation_breath",
        "pelvic_tilt",
        "abdominal_bracing",
    ],
    total_duration_minutes=15,
    focus_areas=[ExerciseCategory.BREATHING, ExerciseCategory.DIASTASIS_RECTI],
)

PELVIC_FLOOR_SESSION = ExerciseSession(
    id="pelvic_floor",
    name="盆底肌训练",
    description="专注于盆底肌恢复的训练计划。",
    exercises=[
        "diaphragmatic_breathing",
        "kegel_exercise",
        "pelvic_tilt",
        "glute_bridge",
    ],
    total_duration_minutes=20,
    focus_areas=[ExerciseCategory.PELVIC_FLOOR],
)

FULL_BODY_RECOVERY = ExerciseSession(
    id="full_body_recovery",
    name="全身恢复训练",
    description="综合性的产后恢复训练，涵盖核心、盆底和体态。",
    exercises=[
        "diaphragmatic_breathing",
        "core_activation_breath",
        "kegel_exercise",
        "pelvic_tilt",
        "dead_bug_modified",
        "cat_cow",
        "glute_bridge",
        "side_lying_leg_lift",
    ],
    total_duration_minutes=30,
    focus_areas=[
        ExerciseCategory.BREATHING,
        ExerciseCategory.PELVIC_FLOOR,
        ExerciseCategory.DIASTASIS_RECTI,
        ExerciseCategory.POSTURE,
        ExerciseCategory.STRENGTH,
    ],
)

SESSION_LIBRARY: dict[str, ExerciseSession] = {
    BEGINNER_CORE_SESSION.id: BEGINNER_CORE_SESSION,
    PELVIC_FLOOR_SESSION.id: PELVIC_FLOOR_SESSION,
    FULL_BODY_RECOVERY.id: FULL_BODY_RECOVERY,
}


def get_exercise(exercise_id: str) -> Exercise | None:
    """Get an exercise by ID."""
    return EXERCISE_LIBRARY.get(exercise_id)


def get_exercises_by_category(category: ExerciseCategory) -> list[Exercise]:
    """Get all exercises in a category."""
    return [ex for ex in EXERCISE_LIBRARY.values() if ex.category == category]


def get_session(session_id: str) -> ExerciseSession | None:
    """Get a training session by ID."""
    return SESSION_LIBRARY.get(session_id)


def get_all_exercises() -> list[Exercise]:
    """Get all exercises."""
    return list(EXERCISE_LIBRARY.values())


def get_all_sessions() -> list[ExerciseSession]:
    """Get all training sessions."""
    return list(SESSION_LIBRARY.values())
