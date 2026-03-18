package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/momshell/backend/internal/dto"
	"github.com/momshell/backend/internal/model"
	"github.com/momshell/backend/internal/repository"
	"github.com/momshell/backend/pkg/openai"
)

const (
	futureLetterCodeOverview   = "future-self-v1"
	futureLetterCodePrenatal   = "future-prenatal-v1"
	futureLetterCodeVaccine    = "future-vaccine-v1"
	futureLetterCodeSafetySeat = "future-safety-seat-v1"
)

type futureLetterOptionDef struct {
	ID    string
	Label string
	Hint  string
	Tag   string
}

type futureLetterTemplate struct {
	Code       string
	Title      string
	Intro      string
	Outro      string
	Signature  string
	WishPrompt string
	SceneHint  string
	Questions  []dto.FutureLetterQuestion
}

type dadMissionTaskDef struct {
	Title       string
	Description string
	Category    string
	Priority    string
	Difficulty  int
}

type dadMissionTemplate struct {
	Code      string
	Title     string
	Headline  string
	Summary   string
	Tasks     []dadMissionTaskDef
	ImageTone string
}

type futureLetterAIMission struct {
	Title    string       `json:"title"`
	Headline string       `json:"headline"`
	Summary  string       `json:"summary"`
	Tasks    []AITaskData `json:"tasks"`
}

type dadAdviceItemDef struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Kind        string `json:"kind"`
}

type dadAdviceSourceDef struct {
	Label  string `json:"label"`
	Detail string `json:"detail"`
}

type dadAdviceTemplate struct {
	Code     string
	Title    string
	Headline string
	Summary  string
	Sources  []dadAdviceSourceDef
	Items    []dadAdviceItemDef
}

type futureLetterAIAdvice struct {
	Title    string               `json:"title"`
	Headline string               `json:"headline"`
	Summary  string               `json:"summary"`
	Sources  []dadAdviceSourceDef `json:"sources"`
	Items    []dadAdviceItemDef   `json:"items"`
}

type futureLetterAdviceContext struct {
	Template       futureLetterTemplate
	AgeStage       string
	AgeLabel       string
	PrimaryTag     string
	PrimaryLabel   string
	SecondaryTag   string
	SecondaryLabel string
	Wish           string
	MemorySummary  string
	TurnLines      []string
	FactLines      []string
	WhisperLines   []string
	ResponseLines  []string
}

var overviewStageOptions = []futureLetterOptionDef{
	{ID: "pregnancy", Label: "还在“合体”中，数着 TA 的胎动", Hint: "孕期", Tag: "PREGNANCY"},
	{ID: "infant_0_12m", Label: "TA 还很软糯，世界中心就是我的怀抱", Hint: "0-1岁", Tag: "INFANT_0_12M"},
	{ID: "toddler_2y", Label: "已是“满地跑”的探险家，每天奇思妙想", Hint: "2岁+", Tag: "TODDLER_2Y"},
}

var overviewStateOptions = []futureLetterOptionDef{
	{ID: "physical_pain", Label: "像生锈的机器，只想关机重启", Hint: "身体疼痛/需修复", Tag: "PHYSICAL_PAIN"},
	{ID: "exhausted", Label: "整体还行，但想舒展下筋骨，喘口气", Hint: "极度疲惫/需补觉", Tag: "EXHAUSTED"},
	{ID: "mental_space", Label: "状态不错，但想脱下“妈妈”的身份，去透透气", Hint: "精神压力/需社交空间", Tag: "MENTAL_SPACE"},
}

var vaccineProgressOptions = []futureLetterOptionDef{
	{ID: "vaccine_observing", Label: "正在按部就班：刚打完上一针，正在观察期", Hint: "确定当前进度", Tag: "VACCINE_ON_TRACK"},
	{ID: "vaccine_key_node", Label: "到了关键节点：下周似乎有好几个“大家伙”要接种", Hint: "识别近期任务", Tag: "VACCINE_KEY_NODE"},
	{ID: "vaccine_confused", Label: "略显迷茫：疫苗本密密麻麻，还没理清接下来该去哪", Hint: "触发整理需求", Tag: "VACCINE_CONFUSED"},
}

var vaccineSupportOptions = []futureLetterOptionDef{
	{ID: "vaccine_support", Label: "物理防御：现场人多手乱，我需要能够带娃、排队、拿药的辅助", Hint: "接种日陪同", Tag: "VACCINE_PHYSICAL_SUPPORT"},
	{ID: "vaccine_booking", Label: "脑力搜索：我对疫苗预约的注意事项很困惑", Hint: "预约和资料整理", Tag: "VACCINE_BOOKING_CONFUSION"},
}

var prenatalProgressOptions = []futureLetterOptionDef{
	{ID: "prenatal_regular", Label: "按节奏推进：产检在计划里，只是每次准备都很碎", Hint: "常规产检支持", Tag: "PRENATAL_REGULAR"},
	{ID: "prenatal_key_node", Label: "到了关键节点：最近有重要产检或检查要做", Hint: "临近关键检查", Tag: "PRENATAL_KEY_NODE"},
	{ID: "prenatal_bag", Label: "开始慌了：越靠近生产，待产包和证件越理不清", Hint: "待产准备混乱", Tag: "PRENATAL_BAG_CONFUSED"},
}

var prenatalSupportOptions = []futureLetterOptionDef{
	{ID: "prenatal_companion", Label: "我需要有人替我记路线、排队、盯流程，别让我一个人跑", Hint: "现场陪同", Tag: "PRENATAL_COMPANION_SUPPORT"},
	{ID: "prenatal_prepare", Label: "我更需要有人把证件、物品和注意事项先整理好", Hint: "资料和物品整理", Tag: "PRENATAL_PREP_SUPPORT"},
}

var safetySeatProgressOptions = []futureLetterOptionDef{
	{ID: "seat_not_bought", Label: "还没买定：参数太多，越看越没有把握", Hint: "选购阶段", Tag: "SAFETY_SEAT_NOT_BOUGHT"},
	{ID: "seat_installed", Label: "已经买了，但总担心安装角度和固定方式不对", Hint: "安装阶段", Tag: "SAFETY_SEAT_INSTALLING"},
	{ID: "seat_short_trip", Label: "短途偶尔会松懈，想着抱一会儿也许没事", Hint: "执行松动", Tag: "SAFETY_SEAT_ROUTINE_LOOSE"},
}

var safetySeatSupportOptions = []futureLetterOptionDef{
	{ID: "seat_research", Label: "我需要有人把车型、接口和孩子体型对应的参数研究明白", Hint: "选购研究", Tag: "SAFETY_SEAT_RESEARCH_SUPPORT"},
	{ID: "seat_install", Label: "我需要有人亲自装好，并把每次上车前检查做成固定动作", Hint: "安装和执行", Tag: "SAFETY_SEAT_INSTALL_SUPPORT"},
}

var infantAgeStages = map[string]bool{
	"0-3m":  true,
	"3-6m":  true,
	"6-12m": true,
}

var toddlerAgeStages = map[string]bool{
	"1-2y": true,
	"2-3y": true,
	"3-4y": true,
	"4-5y": true,
}

var overviewMissionTemplates = map[string]dadMissionTemplate{
	"PREGNANCY:PHYSICAL_PAIN": {
		Code:     "pregnancy-edema",
		Title:    "消肿计划工单",
		Headline: "[核心指令] 今晚请执行消肿计划。",
		Summary:  "她现在更需要被温柔地修复，而不是一句“多喝水”。先从腿脚、皮肤和站立负担开始减压。",
		Tasks: []dadMissionTaskDef{
			{Title: "检查脚踝水肿", Description: "先看脚踝和小腿是否明显发紧，问一句今天站得久不久。", Category: "health", Priority: "T0", Difficulty: 2},
			{Title: "涂抹防纹霜", Description: "洗净双手后慢慢帮她涂抹防妊娠纹霜，动作放轻，别赶进度。", Category: "health", Priority: "T1", Difficulty: 2},
			{Title: "10 分钟足部放松", Description: "准备温热毛巾或靠垫，给她做 10 分钟足部放松，让腿真正歇一下。", Category: "emotional", Priority: "T1", Difficulty: 2},
		},
		ImageTone: "温暖、轻盈、能被海风安抚的孕期散步感",
	},
	"PREGNANCY:EXHAUSTED": {
		Code:     "pregnancy-rest",
		Title:    "静养补觉工单",
		Headline: "[核心指令] 今晚请把她的体力还回去一点。",
		Summary:  "孕期的累不是忍一忍就过去。把琐事抽走，给她一段不被打断的休息，比口头安慰更有效。",
		Tasks: []dadMissionTaskDef{
			{Title: "接管晚间杂务", Description: "把厨房收尾、外卖、洗漱前准备一并接走，别让她再站着忙。", Category: "housework", Priority: "T0", Difficulty: 2},
			{Title: "守住 40 分钟闭眼时间", Description: "把手机、门铃、碎事拦在外面，给她一段完整安静的补觉窗口。", Category: "health", Priority: "T1", Difficulty: 2},
			{Title: "准备热饮和靠枕", Description: "把水杯、靠枕、毛毯放到手边，让她不用起身找任何东西。", Category: "emotional", Priority: "T2", Difficulty: 1},
		},
		ImageTone: "安静海风、暖色灯光、终于能慢下来的一点喘息",
	},
	"PREGNANCY:MENTAL_SPACE": {
		Code:     "pregnancy-space",
		Title:    "留白陪伴工单",
		Headline: "[核心指令] 今晚请替她挡掉一点世界的声音。",
		Summary:  "她不是不需要你，而是需要一个不用继续做决定、解释和撑场的晚上。",
		Tasks: []dadMissionTaskDef{
			{Title: "接管外界回应", Description: "家务安排、家人消息、临时沟通先由你挡下，让她先退出调度位。", Category: "housework", Priority: "T0", Difficulty: 2},
			{Title: "陪走 20 分钟慢路", Description: "陪她在楼下或小区慢慢走一段，不追问，不讲大道理，只让呼吸变松。", Category: "emotional", Priority: "T1", Difficulty: 2},
			{Title: "留出独处时间", Description: "准备热水澡、音乐或一本书，明确告诉她这段时间不用管任何事。", Category: "health", Priority: "T1", Difficulty: 1},
		},
		ImageTone: "海边黄昏、风很轻、允许一个人安静待着的留白",
	},
	"INFANT_0_12M:PHYSICAL_PAIN": {
		Code:     "infant-relief",
		Title:    "抱睡减负工单",
		Headline: "[核心指令] 今晚请把她的腰背和手腕接过去一会儿。",
		Summary:  "新生儿阶段的身体负荷很具体。减一段抱娃时间、少一次弯腰，都会让她好过很多。",
		Tasks: []dadMissionTaskDef{
			{Title: "承包一轮抱哄", Description: "今晚主动接手一轮抱哄、拍嗝或安抚，把她的手腕先放下来。", Category: "parenting", Priority: "T0", Difficulty: 3},
			{Title: "准备肩颈热敷", Description: "给她热敷肩颈或后腰 10 分钟，让持续紧绷的地方松一点。", Category: "health", Priority: "T1", Difficulty: 2},
			{Title: "清空补给动线", Description: "把尿布、湿巾、口水巾和水杯补齐到手边，减少她来回起身。", Category: "housework", Priority: "T1", Difficulty: 1},
		},
		ImageTone: "被海风抚平的疲惫，新生儿时期也能有一点身体缓冲",
	},
	"INFANT_0_12M:EXHAUSTED": {
		Code:     "infant-night-shift",
		Title:    "深夜静音作战工单",
		Headline: "[核心指令] 承包零点后的护理。",
		Summary:  "她现在最缺的不是建议，是一段真实可落地的睡眠。今晚请把最容易把人拖垮的那段夜班接过去。",
		Tasks: []dadMissionTaskDef{
			{Title: "承包零点后换尿布", Description: "零点后先由你处理换尿布和安抚，让她少醒一次是一次。", Category: "parenting", Priority: "T0", Difficulty: 3},
			{Title: "执行标准拍嗝", Description: "宝宝喝完奶后，请把手掌微微扣起成空心掌，一手扶住下巴和胸部，另一只手由下向上轻拍或转圈揉搓。", Category: "parenting", Priority: "T1", Difficulty: 4},
			{Title: "维持卧室静音", Description: "提前把尿布、奶瓶、纸巾备齐，关掉会发声的提示音，让整个流程尽量无噪完成。", Category: "housework", Priority: "T1", Difficulty: 2},
		},
		ImageTone: "深夜也有微光，安静、柔软、像海浪一样替她接班",
	},
	"INFANT_0_12M:MENTAL_SPACE": {
		Code:     "infant-breathing-room",
		Title:    "换班透气工单",
		Headline: "[核心指令] 请给她腾出一段完整不抱娃的时间。",
		Summary:  "她不是不爱孩子，她只是需要一小段重新做回自己的空当。你要做的是稳稳接班，而不是在门口等她回来继续上岗。",
		Tasks: []dadMissionTaskDef{
			{Title: "完整接班 45 分钟", Description: "明确接手哄娃、换尿布和观察状态，让她离开这条照护链 45 分钟。", Category: "parenting", Priority: "T0", Difficulty: 3},
			{Title: "准备出门或独处选项", Description: "把钥匙、水杯、外套或热水澡先备好，让她想出门或想发呆都能直接开始。", Category: "housework", Priority: "T1", Difficulty: 1},
			{Title: "别追问休息成果", Description: "这段时间别问她“休息够了吗”，只告诉她：这边有我，你慢一点。", Category: "emotional", Priority: "T1", Difficulty: 1},
		},
		ImageTone: "海风吹开的缝隙感，短暂逃离也没有负担",
	},
	"TODDLER_2Y:PHYSICAL_PAIN": {
		Code:     "toddler-low-impact",
		Title:    "低冲击接管工单",
		Headline: "[核心指令] 今晚请把高强度体力活从她身上拆下来。",
		Summary:  "两岁以上的高频追跑、抱起和收拾最磨人。你接手的不是一件事，是那种停不下来的消耗。",
		Tasks: []dadMissionTaskDef{
			{Title: "接管跑跳陪玩", Description: "晚饭后 20 分钟高能陪玩由你来，减少她跟着追、蹲、抱。", Category: "parenting", Priority: "T0", Difficulty: 3},
			{Title: "清掉玩具战场", Description: "把客厅、餐桌和地垫上的零碎先收掉，让她少弯几次腰。", Category: "housework", Priority: "T1", Difficulty: 2},
			{Title: "准备热敷和伸展", Description: "等孩子安静后，给她热敷肩背或提醒她做两组简单伸展。", Category: "health", Priority: "T1", Difficulty: 1},
		},
		ImageTone: "孩子闹腾过后，海风把身体的紧绷慢慢吹开",
	},
	"TODDLER_2Y:EXHAUSTED": {
		Code:     "toddler-bedtime-cover",
		Title:    "早睡护航工单",
		Headline: "[核心指令] 今晚请一口气护送她下班。",
		Summary:  "成长期的累往往来自一整天不停切换。你要做的是把睡前那段最吵、最碎的流程整段接走。",
		Tasks: []dadMissionTaskDef{
			{Title: "接管睡前高频流程", Description: "洗澡、换衣、讲故事、关灯前安抚，今晚尽量由你连着做完。", Category: "parenting", Priority: "T0", Difficulty: 4},
			{Title: "压缩临睡前噪音", Description: "把零食收尾、玩具归位、睡衣和水杯提前准备好，不临时找东西。", Category: "housework", Priority: "T1", Difficulty: 2},
			{Title: "守住她的提前休息", Description: "孩子交给你后，明确让她先洗澡或躺下，不再临时喊她回来收尾。", Category: "emotional", Priority: "T1", Difficulty: 1},
		},
		ImageTone: "夜色下来以后，终于能顺着海风慢慢降噪",
	},
	"TODDLER_2Y:MENTAL_SPACE": {
		Code:     "toddler-energy-takeover",
		Title:    "能量接管计划工单",
		Headline: "[核心指令] 启动能量接管计划。",
		Summary:  "她现在需要的不是“你去休息吧”这句话，而是你真的把孩子高能量的那一面接住，让她短暂退出妈妈模式。",
		Tasks: []dadMissionTaskDef{
			{Title: "接管睡前 15 分钟高能运动", Description: "带娃在客厅或户外做 15 分钟跑跳游戏，把剩余电量消耗掉。", Category: "parenting", Priority: "T0", Difficulty: 3},
			{Title: "强制留出热水澡窗口", Description: "孩子这边由你继续接住，明确让她去洗热水澡或安静待一会儿。", Category: "health", Priority: "T1", Difficulty: 1},
			{Title: "处理后续收尾", Description: "运动后擦汗、喝水、收玩具和哄回床上都由你继续，不要半程交还。", Category: "housework", Priority: "T1", Difficulty: 2},
		},
		ImageTone: "风把人从喧闹里带开一点，终于能重新呼吸",
	},
}

func (s *WhisperService) GetFutureLetterView(callerID string) (*dto.FutureLetterView, error) {
	user, err := s.userRepo.FindByID(callerID)
	if err != nil {
		return nil, errors.New(errWhisperUserNotFound)
	}

	var items []model.FutureLetterResponse
	if s.futureLetterRepo != nil {
		if user.Role == model.RoleDad {
			items, err = s.futureLetterRepo.FindRecentByRecipientID(user.ID, 30)
		} else {
			items, err = s.futureLetterRepo.FindRecentByAuthorID(user.ID, 30)
		}
		if err != nil {
			items = nil
		}
	}

	currentAgeStage := resolvedFutureLetterAgeStage(user, s.userRepo, s.chatRepo)

	// Use AI to generate template dynamically
	var template futureLetterTemplate
	if s.aiClient != nil {
		prompt := fmt.Sprintf(`你是一个家庭情感伴侣系统，现在的用户是一位妈妈。她目前处于宝宝成长阶段：%s。请为她生成一封互动问卷信。
请严格输出JSON格式，包含以下字段：
{
  "title": "信件标题",
  "intro": "信件开场白，温暖贴心",
  "outro": "结尾的寄语",
  "scene_hint": "比如：海风吹过信角...",
  "wish_prompt": "引导她写下一句心愿的话，如：补一句最想被接住的心愿。",
  "questions": [
    {
      "id": "stage",
      "prompt": "第一题：关于你当前的阶段或感受",
      "options": [
        {"id": "stage_1", "label": "选项1的描述", "hint": "简短提示"},
        {"id": "stage_2", "label": "选项2的描述", "hint": "简短提示"},
        {"id": "stage_3", "label": "选项3的描述", "hint": "简短提示"}
      ]
    },
    {
      "id": "state",
      "prompt": "第二题：眼下最想伴侣替你接走哪部分？",
      "options": [
        {"id": "state_1", "label": "选项1的描述", "hint": "简短提示"},
        {"id": "state_2", "label": "选项2的描述", "hint": "简短提示"},
        {"id": "state_3", "label": "选项3的描述", "hint": "简短提示"}
      ]
    }
  ]
}`, currentAgeStage)

		respStr, err := s.aiClient.Chat(context.Background(), []openai.Message{
			{Role: "user", Content: prompt},
		})
		if err == nil {
			var aiTemplate struct {
				Title      string                     `json:"title"`
				Intro      string                     `json:"intro"`
				Outro      string                     `json:"outro"`
				SceneHint  string                     `json:"scene_hint"`
				WishPrompt string                     `json:"wish_prompt"`
				Questions  []dto.FutureLetterQuestion `json:"questions"`
			}
			if err := json.Unmarshal([]byte(strings.TrimPrefix(strings.TrimSuffix(strings.TrimSpace(respStr), "```"), "```json")), &aiTemplate); err == nil {
				template = futureLetterTemplate{
					Code:       fmt.Sprintf("ai-dynamic-%d", time.Now().Unix()),
					Title:      aiTemplate.Title,
					Intro:      aiTemplate.Intro,
					Outro:      aiTemplate.Outro,
					Signature:  "小石光",
					WishPrompt: aiTemplate.WishPrompt,
					SceneHint:  aiTemplate.SceneHint,
					Questions:  aiTemplate.Questions,
				}
			}
		}
	}

	if template.Code == "" {
		template = buildFutureLetterTemplate(selectFutureLetterCode(items, currentAgeStage, time.Now()))
	}

	view := &dto.FutureLetterView{
		LetterCode:      template.Code,
		Title:           template.Title,
		Intro:           template.Intro,
		Outro:           template.Outro,
		Signature:       template.Signature,
		WishPrompt:      template.WishPrompt,
		PaperTheme:      "paper",
		SceneHint:       template.SceneHint,
		Questions:       template.Questions,
		RecentResponses: []dto.FutureLetterResponseItem{},
	}

	if len(items) > 0 {
		view.RecentResponses = toFutureLetterResponseItems(items)
		view.LatestResponse = &view.RecentResponses[0]
	}

	return view, nil
}

func (s *WhisperService) RespondFutureLetter(authorID string, req dto.FutureLetterRespondRequest) (*dto.FutureLetterResponseItem, error) {
	author, err := s.userRepo.FindByID(authorID)
	if err != nil {
		return nil, errors.New(errWhisperUserNotFound)
	}
	if author.Role != model.RoleMom {
		return nil, fmt.Errorf("只有妈妈角色可以发送心语情报")
	}
	if author.PartnerID == nil {
		return nil, errors.New(errWhisperPartnerRequired)
	}
	if s.futureLetterRepo == nil || s.taskRepo == nil {
		return nil, fmt.Errorf("心语情报系统暂未就绪，请稍后再试")
	}

	wish := strings.TrimSpace(req.WishContent)
	mission, err := s.buildDadMission(
		author,
		req.LetterCode,
		req.StageOptionID,
		req.StageOptionLabel,
		req.StateOptionID,
		req.StateOptionLabel,
		wish,
	)
	if err != nil {
		return nil, fmt.Errorf("心语情报生成失败，请稍后再试")
	}
	advice := s.buildDadAdvice(
		author,
		req.LetterCode,
		req.StageOptionID,
		req.StageOptionLabel,
		req.StateOptionID,
		req.StateOptionLabel,
		wish,
		mission,
	)

	if err := s.syncDadMissionTasks(*author.PartnerID, author.ID, mission); err != nil {
		return nil, fmt.Errorf("心语情报生成失败，请重试")
	}

	record := buildFutureLetterResponseRecord(
		author,
		req.LetterCode,
		req.StageOptionID,
		req.StageOptionLabel,
		req.StateOptionID,
		req.StateOptionLabel,
		advice,
		buildFutureLetterImagePrompt(req.LetterCode, req.StageOptionLabel, req.StateOptionLabel, mission.ImageTone, wish),
		wish,
	)

	return s.saveFutureLetterResponse(author.ID, record)
}

// Removing obsolete switch-case respond methods:

func buildFutureLetterResponseRecord(
	author *model.User,
	letterCode string,
	primaryTag string,
	primaryLabel string,
	secondaryTag string,
	secondaryLabel string,
	advice dadAdviceTemplate,
	imagePrompt string,
	wish string,
) *model.FutureLetterResponse {
	itemsJSON, _ := json.Marshal(advice.Items)
	sourcesJSON, _ := json.Marshal(advice.Sources)
	record := &model.FutureLetterResponse{
		AuthorID:             author.ID,
		RecipientID:          *author.PartnerID,
		LetterCode:           letterCode,
		StageTag:             primaryTag,
		StageLabel:           primaryLabel,
		StateTag:             secondaryTag,
		StateLabel:           secondaryLabel,
		DadPlanCode:          advice.Code,
		DadPlanTitle:         advice.Title,
		DadHeadline:          advice.Headline,
		DadSummary:           advice.Summary,
		DadTasksJSON:         string(itemsJSON),
		DadAdviceSourcesJSON: string(sourcesJSON),
		ImagePrompt:          imagePrompt,
	}
	if wish != "" {
		record.WishContent = &wish
	}
	return record
}

func (s *WhisperService) saveFutureLetterResponse(authorID string, record *model.FutureLetterResponse) (*dto.FutureLetterResponseItem, error) {
	if record.WishContent != nil {
		s.persistWish(authorID, *record.WishContent)
	}
	if err := s.futureLetterRepo.Create(record); err != nil {
		return nil, fmt.Errorf("保存回信失败，请稍后再试")
	}

	item := toFutureLetterResponseItem(*record)
	return &item, nil
}

func (s *WhisperService) buildDadMission(
	author *model.User,
	letterCode string,
	primaryTag string,
	primaryLabel string,
	secondaryTag string,
	secondaryLabel string,
	wish string,
) (dadMissionTemplate, error) {
	ageStage := resolvedFutureLetterAgeStage(author, s.userRepo, s.chatRepo)
	mission, err := s.translateDadMissionWithAI(
		author,
		letterCode,
		ageStage,
		primaryTag,
		primaryLabel,
		secondaryTag,
		secondaryLabel,
		wish,
	)
	if err != nil {
		log.Printf("[WhisperService] AI dad mission translation failed: %v", err)
		return dadMissionTemplate{}, err
	}
	return mission, nil
}

func (s *WhisperService) buildDadAdvice(
	author *model.User,
	letterCode string,
	primaryTag string,
	primaryLabel string,
	secondaryTag string,
	secondaryLabel string,
	wish string,
	mission dadMissionTemplate,
) dadAdviceTemplate {
	ctx := s.collectFutureLetterAdviceContext(
		author,
		letterCode,
		primaryTag,
		primaryLabel,
		secondaryTag,
		secondaryLabel,
		wish,
	)

	advice, err := s.translateDadAdviceWithAI(ctx, mission)
	if err != nil {
		log.Printf("[WhisperService] AI dad advice generation failed: %v", err)
		return buildFallbackDadAdvice(ctx)
	}

	return advice
}

func (s *WhisperService) collectFutureLetterAdviceContext(
	author *model.User,
	letterCode string,
	primaryTag string,
	primaryLabel string,
	secondaryTag string,
	secondaryLabel string,
	wish string,
) futureLetterAdviceContext {
	ageStage := resolvedFutureLetterAgeStage(author, s.userRepo, s.chatRepo)
	ageLabel := ageStageLabels[ageStage]
	if ageLabel == "" {
		ageLabel = ageStage
	}

	ctx := futureLetterAdviceContext{
		Template:       buildFutureLetterTemplate(letterCode),
		AgeStage:       ageStage,
		AgeLabel:       ageLabel,
		PrimaryTag:     primaryTag,
		PrimaryLabel:   primaryLabel,
		SecondaryTag:   secondaryTag,
		SecondaryLabel: secondaryLabel,
		Wish:           wish,
	}

	if s.chatRepo != nil {
		if memory, err := s.chatRepo.FindByUserID(author.ID); err == nil {
			ctx.MemorySummary = strings.TrimSpace(memory.ConversationSummary)
			turns := memory.GetTurns()
			start := 0
			if len(turns) > 6 {
				start = len(turns) - 6
			}
			for _, turn := range turns[start:] {
				role, _ := turn["role"].(string)
				content, _ := turn["content"].(string)
				if strings.TrimSpace(content) == "" {
					continue
				}
				ctx.TurnLines = append(ctx.TurnLines, fmt.Sprintf("- [%s] %s", role, strings.TrimSpace(content)))
			}
		}

		if facts, err := s.chatRepo.FindFactsByUserID(author.ID); err == nil {
			limit := min(len(facts), 12)
			for _, fact := range facts[:limit] {
				ctx.FactLines = append(ctx.FactLines, fmt.Sprintf("- [%s] %s", fact.Category, fact.Content))
			}
		}
	}

	if s.whisperRepo != nil {
		if whispers, err := s.whisperRepo.FindByAuthorID(author.ID, 8); err == nil {
			for _, whisper := range whispers {
				ctx.WhisperLines = append(ctx.WhisperLines, fmt.Sprintf("- %s（%s）", whisper.Content, whisper.CreatedAt.Format("01-02 15:04")))
			}
		}
	}

	if s.futureLetterRepo != nil {
		if responses, err := s.futureLetterRepo.FindRecentByAuthorID(author.ID, 4); err == nil {
			for _, item := range responses {
				ctx.ResponseLines = append(ctx.ResponseLines, fmt.Sprintf("- [%s] %s / %s -> %s", item.LetterCode, item.StageLabel, item.StateLabel, item.DadPlanTitle))
			}
		}
	}

	return ctx
}

func (s *WhisperService) translateDadAdviceWithAI(
	ctx futureLetterAdviceContext,
	mission dadMissionTemplate,
) (dadAdviceTemplate, error) {
	if s.aiClient == nil {
		return dadAdviceTemplate{}, fmt.Errorf("ai unavailable")
	}

	systemPrompt := `你是 MomShell 的“Dad 端心语情报顾问”。
你的任务是读取妈妈本次问卷、她补充的心愿、她与 AI 的聊天记录和记忆，生成一份给爸爸看的陪伴建议卡。

严格要求：
- 这不是 issue 工单，不要使用“工单、执行、指令、T0/T1/T2、优先级”这类语言
- 你会同时看到已经同步到任务系统的执行工单，请不要重复那些工单里的动作
- 这里不是任务区，禁止再给家务、育儿、陪诊、预约、整理、收纳、接管流程、跑腿、准备物品这类执行任务
- 输出 4 条建议，必须且只能包含 1 条 decode、1 条 opening、1 条 observe、1 条 avoid
- decode 是帮爸爸理解：她今天真正需要被接住的是什么
- opening 是一句更好的开口方式
- observe 是执行完任务后，今天要留意的细微信号
- avoid 是今天不要说或不要做的事
- kind 只能是 decode、opening、observe、avoid
- title 要短，4 到 10 个中文字符
- description 用 1 到 2 句话写具体建议，语气温和，不要训诫，不要空话
- 建议必须偏“理解、表达、观察、避坑”，而不是“再安排一个动作”
- summary 用 1 到 2 句话解释她此刻更需要什么
- headline 不要以“[核心指令]”开头，不要使用工单口吻
- sources 返回 2 到 4 条，必须真实对应你看到的依据，不要编造

只返回 JSON 对象，不要附加解释，不要使用 Markdown 代码块。
JSON 格式：
{
  "title": "建议卡标题",
  "headline": "一句温和的判断",
  "summary": "为什么今天该这样靠近她",
  "sources": [
    {
      "label": "问卷信号",
      "detail": "......"
    }
  ],
  "items": [
    {
      "title": "她在表达什么",
      "description": "......",
      "kind": "decode"
    }
  ]
}`

	var sb strings.Builder
	fmt.Fprintf(&sb, "今天投放给妈妈的情报主题：%s\n", ctx.Template.Title)
	fmt.Fprintf(&sb, "情报开场：%s\n", ctx.Template.Intro)
	if ctx.AgeLabel != "" {
		fmt.Fprintf(&sb, "宝宝当前年龄阶段：%s\n", ctx.AgeLabel)
	}
	fmt.Fprintf(&sb, "妈妈今天的第一层选择：%s（%s）\n", ctx.PrimaryLabel, ctx.PrimaryTag)
	fmt.Fprintf(&sb, "妈妈今天的第二层选择：%s（%s）\n", ctx.SecondaryLabel, ctx.SecondaryTag)
	if ctx.Wish != "" {
		fmt.Fprintf(&sb, "妈妈额外写下的心愿：%s\n", ctx.Wish)
	}
	if ctx.MemorySummary != "" {
		fmt.Fprintf(&sb, "\n妈妈与 AI 的聊天摘要：\n%s\n", ctx.MemorySummary)
	}
	if len(ctx.TurnLines) > 0 {
		sb.WriteString("\n妈妈与 AI 最近几轮聊天记录：\n")
		sb.WriteString(strings.Join(ctx.TurnLines, "\n"))
		sb.WriteString("\n")
	}
	if len(ctx.FactLines) > 0 {
		sb.WriteString("\n妈妈与 AI 聊天沉淀下来的记忆事实：\n")
		sb.WriteString(strings.Join(ctx.FactLines, "\n"))
		sb.WriteString("\n")
	}
	if len(ctx.WhisperLines) > 0 {
		sb.WriteString("\n妈妈最近留下的心愿/心声记录：\n")
		sb.WriteString(strings.Join(ctx.WhisperLines, "\n"))
		sb.WriteString("\n")
	}
	if len(ctx.ResponseLines) > 0 {
		sb.WriteString("\n历史情报记录：\n")
		sb.WriteString(strings.Join(ctx.ResponseLines, "\n"))
		sb.WriteString("\n")
	}
	if len(mission.Tasks) > 0 {
		sb.WriteString("\n已经同步到任务系统的执行工单（请不要重复这些动作）：\n")
		for _, task := range mission.Tasks {
			fmt.Fprintf(&sb, "- %s：%s\n", task.Title, task.Description)
		}
	}
	sb.WriteString("\n请基于这些信息，为 Dad 端生成一份非工单化的陪伴建议卡。")

	reqCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := s.aiClient.Chat(reqCtx, []openai.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: sb.String()},
	})
	if err != nil {
		return dadAdviceTemplate{}, err
	}

	cleaned := strings.TrimSpace(resp)
	if strings.HasPrefix(cleaned, "```") {
		if idx := strings.Index(cleaned[3:], "\n"); idx >= 0 {
			cleaned = cleaned[3+idx+1:]
		}
		cleaned = strings.TrimSuffix(cleaned, "```")
		cleaned = strings.TrimSpace(cleaned)
	}

	var payload futureLetterAIAdvice
	if err := json.Unmarshal([]byte(cleaned), &payload); err != nil {
		return dadAdviceTemplate{}, fmt.Errorf("failed to parse ai advice: %w", err)
	}
	if strings.TrimSpace(payload.Title) == "" || strings.TrimSpace(payload.Headline) == "" || len(payload.Items) == 0 {
		return dadAdviceTemplate{}, fmt.Errorf("ai advice payload incomplete")
	}

	items := normalizeDadAdviceItems(payload.Items)
	sources := normalizeDadAdviceSources(payload.Sources)
	if len(items) == 0 {
		return dadAdviceTemplate{}, fmt.Errorf("ai advice items empty")
	}
	if len(sources) == 0 {
		sources = buildAdviceSourceNotes(ctx)
	}

	return dadAdviceTemplate{
		Code:     "advice-" + ctx.Template.Code,
		Title:    strings.TrimSpace(payload.Title),
		Headline: strings.TrimSpace(payload.Headline),
		Summary:  strings.TrimSpace(payload.Summary),
		Sources:  sources,
		Items:    items,
	}, nil
}

func (s *WhisperService) translateDadMissionWithAI(
	author *model.User,
	letterCode string,
	ageStage string,
	primaryTag string,
	primaryLabel string,
	secondaryTag string,
	secondaryLabel string,
	wish string,
) (dadMissionTemplate, error) {
	if s.aiClient == nil {
		return dadMissionTemplate{}, fmt.Errorf("ai unavailable")
	}

	template := buildFutureLetterTemplate(letterCode)
	ageLabel := ageStageLabels[ageStage]
	if ageLabel == "" {
		ageLabel = ageStage
	}

	var memorySummary string
	var turnLines []string
	if s.chatRepo != nil {
		if memory, err := s.chatRepo.FindByUserID(author.ID); err == nil {
			memorySummary = strings.TrimSpace(memory.ConversationSummary)
			turns := memory.GetTurns()
			start := 0
			if len(turns) > 6 {
				start = len(turns) - 6
			}
			for _, turn := range turns[start:] {
				role, _ := turn["role"].(string)
				content, _ := turn["content"].(string)
				if strings.TrimSpace(content) == "" {
					continue
				}
				turnLines = append(turnLines, fmt.Sprintf("- [%s] %s", role, strings.TrimSpace(content)))
			}
		}
	}

	var factLines []string
	if s.chatRepo != nil {
		if facts, err := s.chatRepo.FindFactsByUserID(author.ID); err == nil {
			limit := min(len(facts), 12)
			for _, fact := range facts[:limit] {
				factLines = append(factLines, fmt.Sprintf("- [%s] %s", fact.Category, fact.Content))
			}
		}
	}

	var whisperLines []string
	if s.whisperRepo != nil {
		if whispers, err := s.whisperRepo.FindByAuthorID(author.ID, 8); err == nil {
			for _, whisper := range whispers {
				whisperLines = append(whisperLines, fmt.Sprintf("- %s（%s）", whisper.Content, whisper.CreatedAt.Format("01-02 15:04")))
			}
		}
	}

	var responseLines []string
	if s.futureLetterRepo != nil {
		if responses, err := s.futureLetterRepo.FindRecentByAuthorID(author.ID, 4); err == nil {
			for _, item := range responses {
				responseLines = append(responseLines, fmt.Sprintf("- [%s] %s / %s -> %s", item.LetterCode, item.StageLabel, item.StateLabel, item.DadPlanTitle))
			}
		}
	}

	systemPrompt := `你是 MomShell 的“心语情报编译器”。
你的任务是：读取妈妈今天在心语情报问卷中的选择、她补充的心愿、她与 AI 的聊天记忆、过往心愿记录和历史情报，把这些信息转译成给爸爸的精准行动指令。

你需要参考以下示例的风格来生成：
[示例1]
条件：孕中晚期 / 还在“合体”中
输出：
headline: "[核心指令] 今晚请执行消肿计划。"
tasks: [{"title": "执行消肿计划", "description": "检查她的脚踝是否有水肿，帮她涂抹防妊娠纹霜，或者进行10分钟足部放松。这比说“多喝水”有效100倍。", "category": "health", "priority": "T0", "difficulty": 2}]

[示例2]
条件：0-12个月 / TA还很软糯
输出：
headline: "[核心指令] 承包零点后的护理。"
tasks: [{"title": "接管拍嗝与哄睡", "description": "宝宝喝完奶后，请把手掌微微扣起，呈“空心掌”（像握着一个蛋）。让宝宝坐在你的大腿上，身体略微前倾。一只手用虎口扶住宝宝的下巴和胸部（避开脖子），另一只手在背部由下向上轻拍或转圈揉搓。直到听见一声“隔”。", "category": "parenting", "priority": "T0", "difficulty": 3}]

[示例3]
条件：2岁+ / 已是“满地跑”
输出：
headline: "[核心指令] 启动能量接管计划。"
tasks: [{"title": "接管睡前大消耗", "description": "接管“睡前大消耗”环节，带娃在客厅进行15分钟跑跳游戏。把安静的时间留给老婆，让她去洗个热水澡或者放空一会儿。", "category": "parenting", "priority": "T0", "difficulty": 3}]

严格要求：
- 必须优先回应妈妈今天这份情报里的真实诉求，不能忽视当前主题。
- 必须贴合宝宝当前年龄阶段，不能脱离年龄乱提建议。
- 模仿示例的语气，指令要非常具体、有画面感、有步骤（如空心掌怎么拍、去哪散步等）。
- 输出 1 到 3 个任务。
- title 要短、像任务关键词，4 到 12 个中文字符即可。
- description 只写具体、操作性强的动作，直接告诉爸爸怎么做。
- category 只能是 housework、parenting、health、emotional。
- priority 只能是 T0、T1、T2。
- difficulty 只能是 1 到 4 的整数。
- headline 要以“[核心指令]”开头。
- summary 用 1 到 2 句话解释为什么要执行这个指令（例如：“这比说多喝水有效一百倍”）。

只返回 JSON 对象，不要附加解释，不要使用 Markdown 代码块。
JSON 格式：
{
  "title": "工单标题",
  "headline": "[核心指令] ...",
  "summary": "...",
  "tasks": [
    {
      "title": "任务关键词",
      "description": "具体行动",
      "category": "housework",
      "priority": "T0",
      "difficulty": 1
    }
  ]
}`

	var sb strings.Builder
	fmt.Fprintf(&sb, "今天投放给妈妈的情报主题：%s\n", template.Title)
	fmt.Fprintf(&sb, "情报开场：%s\n", template.Intro)
	if ageLabel != "" {
		fmt.Fprintf(&sb, "宝宝当前年龄阶段：%s\n", ageLabel)
	}
	fmt.Fprintf(&sb, "妈妈今天的第一层选择：%s（%s）\n", primaryLabel, primaryTag)
	fmt.Fprintf(&sb, "妈妈今天的第二层选择：%s（%s）\n", secondaryLabel, secondaryTag)
	if wish != "" {
		fmt.Fprintf(&sb, "妈妈额外写下的心愿：%s\n", wish)
	}
	if memorySummary != "" {
		fmt.Fprintf(&sb, "\n妈妈与 AI 的聊天摘要：\n%s\n", memorySummary)
	}
	if len(turnLines) > 0 {
		sb.WriteString("\n妈妈与 AI 最近几轮聊天记录：\n")
		sb.WriteString(strings.Join(turnLines, "\n"))
		sb.WriteString("\n")
	}
	if len(factLines) > 0 {
		sb.WriteString("\n妈妈与 AI 聊天沉淀下来的记忆事实：\n")
		sb.WriteString(strings.Join(factLines, "\n"))
		sb.WriteString("\n")
	}
	if len(whisperLines) > 0 {
		sb.WriteString("\n妈妈最近留下的心愿/心声记录：\n")
		sb.WriteString(strings.Join(whisperLines, "\n"))
		sb.WriteString("\n")
	}
	if len(responseLines) > 0 {
		sb.WriteString("\n历史情报与已生成工单记录：\n")
		sb.WriteString(strings.Join(responseLines, "\n"))
		sb.WriteString("\n")
	}
	sb.WriteString("\n请把这些信息编译成爸爸今天的执行工单。")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := s.aiClient.Chat(ctx, []openai.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: sb.String()},
	})
	if err != nil {
		return dadMissionTemplate{}, err
	}

	cleaned := strings.TrimSpace(resp)
	if strings.HasPrefix(cleaned, "```") {
		if idx := strings.Index(cleaned[3:], "\n"); idx >= 0 {
			cleaned = cleaned[3+idx+1:]
		}
		cleaned = strings.TrimSuffix(cleaned, "```")
		cleaned = strings.TrimSpace(cleaned)
	}

	var payload futureLetterAIMission
	if err := json.Unmarshal([]byte(cleaned), &payload); err != nil {
		return dadMissionTemplate{}, fmt.Errorf("failed to parse ai mission: %w", err)
	}
	if strings.TrimSpace(payload.Title) == "" || strings.TrimSpace(payload.Headline) == "" || len(payload.Tasks) == 0 {
		return dadMissionTemplate{}, fmt.Errorf("ai mission payload incomplete")
	}

	tasks := normalizeAITasks(payload.Tasks)
	missionTasks := make([]dadMissionTaskDef, 0, len(tasks))
	for _, task := range tasks {
		missionTasks = append(missionTasks, dadMissionTaskDef{
			Title:       strings.TrimSpace(task.Title),
			Description: strings.TrimSpace(task.Description),
			Category:    task.Category,
			Priority:    task.Priority,
			Difficulty:  task.Difficulty,
		})
	}

	return dadMissionTemplate{
		Code:      "ai-" + letterCode,
		Title:     strings.TrimSpace(payload.Title),
		Headline:  strings.TrimSpace(payload.Headline),
		Summary:   strings.TrimSpace(payload.Summary),
		Tasks:     missionTasks,
		ImageTone: "",
	}, nil
}

func normalizeDadAdviceItems(items []dadAdviceItemDef) []dadAdviceItemDef {
	validKinds := map[string]bool{
		"decode":  true,
		"opening": true,
		"observe": true,
		"avoid":   true,
	}

	normalized := make([]dadAdviceItemDef, 0, len(items))
	for _, item := range items {
		title := strings.TrimSpace(item.Title)
		description := strings.TrimSpace(item.Description)
		kind := strings.TrimSpace(strings.ToLower(item.Kind))
		if title == "" || description == "" {
			continue
		}
		if !validKinds[kind] {
			kind = "decode"
		}
		normalized = append(normalized, dadAdviceItemDef{
			Title:       truncateRunes(title, 12),
			Description: description,
			Kind:        kind,
		})
	}
	return reorderDadAdviceItems(normalized)
}

func normalizeDadAdviceSources(sources []dadAdviceSourceDef) []dadAdviceSourceDef {
	normalized := make([]dadAdviceSourceDef, 0, len(sources))
	for _, source := range sources {
		label := strings.TrimSpace(source.Label)
		detail := strings.TrimSpace(source.Detail)
		if label == "" || detail == "" {
			continue
		}
		normalized = append(normalized, dadAdviceSourceDef{
			Label:  truncateRunes(label, 12),
			Detail: truncateRunes(detail, 72),
		})
		if len(normalized) == 4 {
			break
		}
	}
	return normalized
}

func buildFallbackDadAdvice(ctx futureLetterAdviceContext) dadAdviceTemplate {
	return dadAdviceTemplate{
		Code:     "fallback-" + ctx.Template.Code,
		Title:    "小石光建议卡",
		Headline: fallbackAdviceHeadline(ctx.SecondaryTag),
		Summary:  fallbackAdviceSummary(ctx),
		Sources:  buildAdviceSourceNotes(ctx),
		Items:    buildFallbackAdviceItems(ctx),
	}
}

func (s *WhisperService) RegenerateFutureLetterForDad(callerID string) (*dto.FutureLetterResponseItem, error) {
	user, err := s.userRepo.FindByID(callerID)
	if err != nil {
		return nil, errors.New(errWhisperUserNotFound)
	}
	if user.Role != model.RoleDad {
		return nil, fmt.Errorf("只有爸爸角色可以重新生成情报")
	}
	if user.PartnerID == nil {
		return nil, errors.New(errWhisperPartnerRequired)
	}
	if s.futureLetterRepo == nil || s.taskRepo == nil {
		return nil, fmt.Errorf("心语情报系统暂未就绪，请稍后再试")
	}

	items, err := s.futureLetterRepo.FindRecentByRecipientID(user.ID, 1)
	if err != nil {
		return nil, fmt.Errorf("读取历史情报失败，请稍后再试")
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("还没有可重新生成的情报")
	}

	record := items[0]
	author, err := s.userRepo.FindByID(record.AuthorID)
	if err != nil {
		return nil, errors.New(errWhisperUserNotFound)
	}

	wish := ""
	if record.WishContent != nil {
		wish = strings.TrimSpace(*record.WishContent)
	}

	mission, err := s.buildDadMission(
		author,
		record.LetterCode,
		record.StageTag,
		record.StageLabel,
		record.StateTag,
		record.StateLabel,
		wish,
	)
	if err != nil {
		return nil, fmt.Errorf("重新生成工单失败，请稍后再试")
	}

	advice := s.buildDadAdvice(
		author,
		record.LetterCode,
		record.StageTag,
		record.StageLabel,
		record.StateTag,
		record.StateLabel,
		wish,
		mission,
	)

	if err := s.syncDadMissionTasks(user.ID, author.ID, mission); err != nil {
		return nil, fmt.Errorf("重新生成工单失败，请重试")
	}

	itemsJSON, _ := json.Marshal(advice.Items)
	sourcesJSON, _ := json.Marshal(advice.Sources)
	record.DadPlanCode = advice.Code
	record.DadPlanTitle = advice.Title
	record.DadHeadline = advice.Headline
	record.DadSummary = advice.Summary
	record.DadTasksJSON = string(itemsJSON)
	record.DadAdviceSourcesJSON = string(sourcesJSON)
	record.ImagePrompt = buildFutureLetterImagePrompt(
		record.LetterCode,
		record.StageLabel,
		record.StateLabel,
		mission.ImageTone,
		wish,
	)

	if err := s.futureLetterRepo.Update(&record); err != nil {
		return nil, fmt.Errorf("保存重生成情报失败，请稍后再试")
	}

	item := toFutureLetterResponseItem(record)
	return &item, nil
}

func buildAdviceSourceNotes(ctx futureLetterAdviceContext) []dadAdviceSourceDef {
	sources := []dadAdviceSourceDef{
		{
			Label:  "问卷信号",
			Detail: truncateRunes(fmt.Sprintf("%s / %s", ctx.PrimaryLabel, ctx.SecondaryLabel), 72),
		},
	}

	if ctx.Wish != "" {
		sources = append(sources, dadAdviceSourceDef{
			Label:  "她的心愿",
			Detail: truncateRunes(ctx.Wish, 72),
		})
	}
	if ctx.MemorySummary != "" {
		sources = append(sources, dadAdviceSourceDef{
			Label:  "聊天摘要",
			Detail: truncateRunes(firstNonEmptyLine(ctx.MemorySummary), 72),
		})
	} else if len(ctx.TurnLines) > 0 {
		sources = append(sources, dadAdviceSourceDef{
			Label:  "最近对话",
			Detail: truncateRunes(trimContextBullet(ctx.TurnLines[len(ctx.TurnLines)-1]), 72),
		})
	}
	if len(ctx.FactLines) > 0 {
		sources = append(sources, dadAdviceSourceDef{
			Label:  "AI 记忆",
			Detail: truncateRunes(trimContextBullet(ctx.FactLines[0]), 72),
		})
	}
	if len(ctx.WhisperLines) > 0 && ctx.Wish == "" {
		sources = append(sources, dadAdviceSourceDef{
			Label:  "最近心语",
			Detail: truncateRunes(trimContextBullet(ctx.WhisperLines[0]), 72),
		})
	}

	return normalizeDadAdviceSources(sources)
}

func buildFallbackAdviceItems(ctx futureLetterAdviceContext) []dadAdviceItemDef {
	items := []dadAdviceItemDef{
		{
			Title:       "她在表达什么",
			Description: fallbackDecodeAdvice(ctx),
			Kind:        "decode",
		},
		{
			Title:       "先这样开口",
			Description: fallbackOpeningAdvice(ctx),
			Kind:        "opening",
		},
		{
			Title:       "留意这个信号",
			Description: fallbackObserveAdvice(ctx),
			Kind:        "observe",
		},
		{
			Title:       "今天先别这样",
			Description: fallbackAvoidAdvice(ctx),
			Kind:        "avoid",
		},
	}

	return normalizeDadAdviceItems(items)
}

func reorderDadAdviceItems(items []dadAdviceItemDef) []dadAdviceItemDef {
	order := []string{"decode", "opening", "observe", "avoid"}
	byKind := make(map[string]dadAdviceItemDef, len(items))
	for _, item := range items {
		if _, exists := byKind[item.Kind]; !exists {
			byKind[item.Kind] = item
		}
	}

	reordered := make([]dadAdviceItemDef, 0, len(order))
	for _, kind := range order {
		if item, ok := byKind[kind]; ok {
			reordered = append(reordered, item)
		}
	}
	return reordered
}

func fallbackAdviceHeadline(stateTag string) string {
	switch stateTag {
	case "PHYSICAL_PAIN":
		return "她现在更需要被轻一点地对待，而不是再多解释一次自己的难受。"
	case "EXHAUSTED":
		return "她眼下最缺的不是安排，而是一段不用继续撑着运转的缓冲。"
	case "MENTAL_SPACE":
		return "她并不是想退开你，而是想先从持续被需要的状态里松一口气。"
	default:
		return "先别急着解决问题，先让她感觉到你真的看见了她今天的状态。"
	}
}

func fallbackAdviceSummary(ctx futureLetterAdviceContext) string {
	summary := "今天这份建议先围绕她刚在问卷里表达的状态来走。你要做的不是把事情做满，而是用更低负担的方式靠近她。"
	if ctx.Wish != "" {
		summary = "今天这份建议同时参考了她在问卷里的状态和她补充写下的心愿。先让她少解释一点、少承担一点，比急着给方案更有效。"
	}
	if ctx.MemorySummary != "" || len(ctx.FactLines) > 0 {
		summary = "今天这份建议除了参考问卷和心愿，也结合了她与 AI 的聊天摘要和记忆。重点不是重复工单，而是用她更能接住的方式靠近她。"
	}
	return summary
}

func fallbackDecodeAdvice(ctx futureLetterAdviceContext) string {
	switch ctx.SecondaryTag {
	case "PHYSICAL_PAIN":
		return "她今天更想被理解的，不是“事情太多”，而是身体已经在持续发出吃不消的信号。先把她的不舒服当成真实状态，而不是普通疲惫。"
	case "EXHAUSTED":
		return "她今天真正想被接住的，通常不是某一件具体小事，而是那种一直不能停下来的消耗感。她更需要的是有人替她关掉一点噪音，而不是继续追加决定。"
	case "MENTAL_SPACE":
		return "她今天表达的重点不是拒绝靠近，而是想暂时从“随时被需要”的位置退开一点。你越少追问她为什么，她越容易慢慢放松下来。"
	default:
		return "她今天更需要的不是被安排，而是先被读懂。先接住她眼前最重的感受，再谈你们接下来怎么配合。"
	}
}

func fallbackOpeningAdvice(ctx futureLetterAdviceContext) string {
	base := fmt.Sprintf("开口先复述她今天的状态，例如：“我看到你现在更像是在%s，我先不催你，你告诉我今天最想少做哪一件。”", ctx.SecondaryLabel)
	if ctx.Wish != "" {
		base = fmt.Sprintf("开口先接住她补充写下的那句心愿，例如：“你前面提到%s，这件事我记住了，今晚我们先把你最不想扛的那一段放下来。”", truncateRunes(ctx.Wish, 24))
	}
	return base
}

func fallbackObserveAdvice(ctx futureLetterAdviceContext) string {
	switch ctx.SecondaryTag {
	case "PHYSICAL_PAIN":
		return "留意她是不是连坐下、起身、弯腰这种小动作都明显变慢了。如果是，就别再把她的难受归到“普通累了”。"
	case "EXHAUSTED":
		return "留意她是不是已经开始用“都行”“随便”来结束对话。很多时候这不是没想法，而是已经没有多余力气继续做决定。"
	case "MENTAL_SPACE":
		return "留意她是不是刚安静一会儿就又被新的问题、安排或照看需求拉回去。如果她总是被打断，说明她还没真正离开高压位。"
	default:
		return "留意她今天最容易沉默的那一刻，那通常就是她最需要被接住的时候。"
	}
}

func fallbackAvoidAdvice(ctx futureLetterAdviceContext) string {
	switch ctx.SecondaryTag {
	case "PHYSICAL_PAIN":
		return "今天先别用“再坚持一下”“多休息就好了”这类话轻轻带过她的身体感受。先承认她真的不舒服，再决定你接下来做什么。"
	case "EXHAUSTED":
		return "今天先别把沟通变成流程复盘，比如追问她哪里没做好、为什么不早点说。她现在更需要被减负，而不是再负责说明。"
	case "MENTAL_SPACE":
		return "今天先别把她想安静一会儿理解成情绪疏远。给她一点不必解释的空间，反而更容易让她重新靠近。"
	default:
		return "今天先别急着给判断和大道理，先让她少解释一点，再谈你准备怎么帮。"
	}
}

func trimContextBullet(value string) string {
	trimmed := strings.TrimSpace(value)
	trimmed = strings.TrimPrefix(trimmed, "- ")
	return strings.TrimSpace(trimmed)
}

func firstNonEmptyLine(value string) string {
	for _, line := range strings.Split(value, "\n") {
		if trimmed := strings.TrimSpace(line); trimmed != "" {
			return trimmed
		}
	}
	return strings.TrimSpace(value)
}

func truncateRunes(value string, limit int) string {
	if limit <= 0 {
		return ""
	}
	runes := []rune(strings.TrimSpace(value))
	if len(runes) <= limit {
		return string(runes)
	}
	return string(runes[:limit]) + "..."
}

func selectFutureLetterCode(items []model.FutureLetterResponse, ageStage string, now time.Time) string {
	if ageStage == "" || needsStageRecheck(items, now) {
		return futureLetterCodeOverview
	}

	switch {
	case ageStage == "pregnancy":
		return futureLetterCodePrenatal
	case infantAgeStages[ageStage]:
		return futureLetterCodeVaccine
	case toddlerAgeStages[ageStage]:
		return futureLetterCodeSafetySeat
	default:
		return futureLetterCodeOverview
	}
}

func resolvedFutureLetterAgeStage(
	user *model.User,
	userRepo *repository.UserRepo,
	chatRepo *repository.ChatRepo,
) string {
	if stage := deriveAgeStageFromBirthDate(user.BabyBirthDate); stage != "" {
		return stage
	}

	if user.PartnerID != nil {
		if partner, err := userRepo.FindByID(*user.PartnerID); err == nil {
			if stage := deriveAgeStageFromBirthDate(partner.BabyBirthDate); stage != "" {
				return stage
			}
		}
	}

	stage, _ := resolveAgeStage(user, userRepo, chatRepo)
	return stage
}

func needsStageRecheck(items []model.FutureLetterResponse, now time.Time) bool {
	var lastOverview *time.Time
	for _, item := range items {
		if item.LetterCode == futureLetterCodeOverview {
			ts := item.CreatedAt
			lastOverview = &ts
			break
		}
	}

	if lastOverview == nil {
		return true
	}

	return now.Sub(*lastOverview) >= 30*24*time.Hour
}

func deriveAgeStageFromBirthDate(birthDate *time.Time) string {
	if birthDate == nil {
		return ""
	}

	now := time.Now()
	if birthDate.After(now) {
		return ""
	}

	days := int(now.Sub(*birthDate).Hours() / 24)
	switch {
	case days < 90:
		return "0-3m"
	case days < 180:
		return "3-6m"
	case days < 365:
		return "6-12m"
	case days < 730:
		return "1-2y"
	case days < 1095:
		return "2-3y"
	case days < 1460:
		return "3-4y"
	default:
		return "4-5y"
	}
}

func buildFutureLetterTemplate(code string) futureLetterTemplate {
	switch code {
	case futureLetterCodePrenatal:
		return futureLetterTemplate{
			Code:       futureLetterCodePrenatal,
			Title:      "心语情报：产检和待产准备",
			Intro:      "产检和待产准备最磨人的，往往不是某一件大事，而是那些会在一天里反复打断你的细碎安排。",
			Outro:      "把最耗神的那部分提前说出来，才能让他知道今天该先接走什么。",
			Signature:  "小石光",
			WishPrompt: "如果你还惦记着某个待办，比如证件、路线、待产包，也可以顺手补一句。",
			SceneHint:  "海风吹过信角，把临近产检和待产前的碎事慢慢摊平",
			Questions: []dto.FutureLetterQuestion{
				buildFutureLetterQuestion("stage", "最近的产检或待产准备，走到哪一步了？", prenatalProgressOptions),
				buildFutureLetterQuestion("state", "眼下最想有人替你接走的是哪一部分？", prenatalSupportOptions),
			},
		}
	case futureLetterCodeVaccine:
		return futureLetterTemplate{
			Code:       futureLetterCodeVaccine,
			Title:      "心语情报：疫苗小关卡",
			Intro:      "接种这件事看起来只是跑一次流程，但真正累人的，是预约、排队、留观和事后记录这些碎得停不下来的环节。",
			Outro:      "把眼下最头疼的那部分交代清楚，他才知道该在哪一段真正顶上来。",
			Signature:  "小石光",
			WishPrompt: "如果你对接种日还有一句担心，也可以顺手写下来。",
			SceneHint:  "海风翻动信纸，像把那些接种日前的慌乱一页页理顺",
			Questions: []dto.FutureLetterQuestion{
				buildFutureLetterQuestion("stage", "想问问此刻的你，关于宝宝的疫苗情况：", vaccineProgressOptions),
				buildFutureLetterQuestion("state", "关于接种这件事，你对什么最头疼？", vaccineSupportOptions),
			},
		}
	case futureLetterCodeSafetySeat:
		return futureLetterTemplate{
			Code:       futureLetterCodeSafetySeat,
			Title:      "心语情报：安全座椅这件事",
			Intro:      "孩子越长越大，越容易让人对“就这一小段路”放松警惕。真正让人安心的，不是运气，而是一次次被认真执行的安全动作。",
			Outro:      "把你最担心的那一段说清楚，他才知道该把哪一步做扎实。",
			Signature:  "小石光",
			WishPrompt: "如果你对出门、上车或安装还有额外担心，也可以补一句。",
			SceneHint:  "海边风很轻，像提醒人把每次出发前的安全动作都做扎实",
			Questions: []dto.FutureLetterQuestion{
				buildFutureLetterQuestion("stage", "关于安全座椅，现在最真实的状态是？", safetySeatProgressOptions),
				buildFutureLetterQuestion("state", "你更希望他接手哪一类支持？", safetySeatSupportOptions),
			},
		}
	default:
		return futureLetterTemplate{
			Code:       futureLetterCodeOverview,
			Title:      "本轮心语情报",
			Intro:      "先告诉我你现在正走到哪一阶段、最想被接住的是什么，我会把这些整理成一份更容易被看懂的情报。",
			Outro:      "别一个人硬撑。先把今天最想被接走的那部分说出来。",
			Signature:  "小石光",
			WishPrompt: "如果还想补一句最想让他接手的事，也可以写在这里。",
			SceneHint:  "海边散步、暖风、被晚霞轻轻托住的信纸",
			Questions: []dto.FutureLetterQuestion{
				buildFutureLetterQuestion("stage", "想问问当下的你：正牵着哪一阶段的小手呢？", overviewStageOptions),
				buildFutureLetterQuestion("state", "身体总会发出些诚实的信号。此刻的你，感觉还好吗？", overviewStateOptions),
			},
		}
	}
}

func buildFutureLetterQuestion(id, prompt string, defs []futureLetterOptionDef) dto.FutureLetterQuestion {
	options := make([]dto.FutureLetterOption, 0, len(defs))
	for _, item := range defs {
		options = append(options, dto.FutureLetterOption{
			ID:    item.ID,
			Label: item.Label,
			Hint:  item.Hint,
		})
	}

	return dto.FutureLetterQuestion{
		ID:      id,
		Prompt:  prompt,
		Options: options,
	}
}

func findFutureLetterOption(defs []futureLetterOptionDef, id string) (futureLetterOptionDef, bool) {
	for _, item := range defs {
		if item.ID == id {
			return item, true
		}
	}
	return futureLetterOptionDef{}, false
}

func compileOverviewMission(stageTag, stateTag string) dadMissionTemplate {
	if mission, ok := overviewMissionTemplates[stageTag+":"+stateTag]; ok {
		return mission
	}

	if mission, ok := overviewMissionTemplates[stageTag+":EXHAUSTED"]; ok {
		return mission
	}

	return dadMissionTemplate{
		Code:     "default-gentle-cover",
		Title:    "温柔接管工单",
		Headline: "[核心指令] 今晚请先替她接一段力。",
		Summary:  "先把最费神、最费体力的部分接过去，再问她还想要什么。",
		Tasks: []dadMissionTaskDef{
			{Title: "接走一段高消耗流程", Description: "找出今天最累的那一段，由你整段接手完成。", Category: "parenting", Priority: "T0", Difficulty: 2},
			{Title: "补齐手边资源", Description: "把水、热饮、纸巾、毛毯和常用物品放到她伸手就能拿到的位置。", Category: "housework", Priority: "T1", Difficulty: 1},
			{Title: "留一句明确承诺", Description: "告诉她：这段时间你不用管，我会处理完。", Category: "emotional", Priority: "T1", Difficulty: 1},
		},
		ImageTone: "被海风接住的轻盈感",
	}
}

func compilePrenatalMission(progressOpt futureLetterOptionDef, supportOpt futureLetterOptionDef) dadMissionTemplate {
	if supportOpt.Tag == "PRENATAL_PREP_SUPPORT" || progressOpt.Tag == "PRENATAL_BAG_CONFUSED" {
		headline := "[核心指令] 今晚请把待产和产检资料整理成一套清单。"
		summary := "她现在更需要的是把证件、物品和路线提前理顺，而不是临到出门才边走边想。你把准备拆成可执行动作，她就能省下很多体力。"
		if progressOpt.Tag == "PRENATAL_KEY_NODE" {
			headline = "[核心指令] 关键产检前，请把证件和物品全部提前备齐。"
			summary = "既然已经到了关键节点，就不要把证件、就诊资料和补给留到当天慌着找。先备齐，再谈从容。"
		}

		return dadMissionTemplate{
			Code:     "prenatal-prep-checklist",
			Title:    "待产准备清单",
			Headline: headline,
			Summary:  summary,
			Tasks: []dadMissionTaskDef{
				{Title: "证件整理", Description: "把身份证件、产检本、医保资料和就诊卡放进同一个透明文件袋，出门前只检查这一袋。", Category: "housework", Priority: "T0", Difficulty: 1},
				{Title: "物品备齐", Description: "把水杯、纸巾、充电线、外套和必要零食装进待产或产检包，别让她临走前一边站着一边找。", Category: "health", Priority: "T1", Difficulty: 1},
				{Title: "路线确认", Description: "把医院路线、停车点或打车下车点提前确认，并把出门时间写进提醒。", Category: "emotional", Priority: "T1", Difficulty: 1},
			},
			ImageTone: "把临近产检和待产的碎事理顺后，终于能安稳呼吸的松弛感",
		}
	}

	return dadMissionTemplate{
		Code:     "prenatal-companion-guide",
		Title:    "产检陪同指南",
		Headline: "[核心指令] 这次产检请你做全程陪同主力。",
		Summary:  "现场最消耗她的往往不是检查本身，而是排队、跑流程和反复确认。你把这些流程接走，她就能把体力留给自己和宝宝。",
		Tasks: []dadMissionTaskDef{
			{Title: "到院流程接管", Description: "到医院后由你负责挂号、排队、取单和问路，让她尽量少站、少来回走。", Category: "housework", Priority: "T0", Difficulty: 2},
			{Title: "现场补给", Description: "把温水、纸巾和随手能吃的小点心放到她手边，等待时别让她一直空着。", Category: "health", Priority: "T1", Difficulty: 1},
			{Title: "结果记录", Description: "检查结束后帮她把医生交代、复诊时间和需要补充的项目记成一条备忘。", Category: "emotional", Priority: "T1", Difficulty: 1},
		},
		ImageTone: "关键检查当天也有人稳稳接住流程的安心感",
	}
}

func compileVaccineMission(progressOpt futureLetterOptionDef, supportOpt futureLetterOptionDef) dadMissionTemplate {
	if supportOpt.Tag == "VACCINE_BOOKING_CONFUSION" {
		headline := "[核心指令] 顺手把下一针预约和资料提前备好。"
		summary := "她不是不关心，而是疫苗本、预约入口和证件要求太碎了。你来把路径理顺，她就能少耗掉很多脑力。"
		if progressOpt.Tag == "VACCINE_KEY_NODE" {
			headline = "[核心指令] 今晚把下周接种预约全部理顺。"
			summary = "既然已经到了关键节点，就别把预约、证件和注意事项留到最后一天。先整理清楚，接种日才不会手忙脚乱。"
		} else if progressOpt.Tag == "VACCINE_CONFUSED" {
			headline = "[核心指令] 今晚请把疫苗本和预约路径整理清楚。"
			summary = "现在最需要的是一个可执行的清单。你把时间线、预约入口和随身资料拆解出来，她就不用继续一个人对着密密麻麻的信息发愁。"
		}

		return dadMissionTemplate{
			Code:     "vaccine-booking-checklist",
			Title:    "疫苗预约清单",
			Headline: headline,
			Summary:  summary,
			Tasks: []dadMissionTaskDef{
				{Title: "对照疫苗本整理下一针", Description: "把疫苗本、社区接种记录和下一次计划接种时间整理成一页清单，别只停留在“差不多该打了”。", Category: "health", Priority: "T0", Difficulty: 2},
				{Title: "确认预约入口和证件", Description: "确认社区医院或小程序预约入口，提前备好身份证件、医保卡、疫苗本等需要携带的资料。", Category: "housework", Priority: "T1", Difficulty: 2},
				{Title: "建立接种日前提醒", Description: "把纸巾、水壶、口水巾、安抚玩具和证件写进提醒里，避免当天临出门才翻包。", Category: "parenting", Priority: "T1", Difficulty: 1},
			},
			ImageTone: "把琐碎流程理顺后，海风一样让人松口气的安心感",
		}
	}

	headline := "[核心指令] 这次接种请你做现场主力。"
	summary := "接种日最磨人的不是那一针，而是排队、抱娃、拿药、留观这些碎而密的流程。你接住现场，她才不会被忙乱压垮。"
	if progressOpt.Tag == "VACCINE_KEY_NODE" {
		headline = "[核心指令] 下周接种日由你全程陪同。"
		summary = "既然已经到了关键节点，就把现场那一整套流程都接过去。她负责安抚，你负责跑动和判断，节奏会轻很多。"
	} else if progressOpt.Tag == "VACCINE_CONFUSED" {
		headline = "[核心指令] 先把接种日流程扛到你肩上。"
		summary = "她现在担心的不是单一环节，而是“到现场之后会不会乱掉”。你先把排队、取号、拿药和留观节奏扛起来，她就能缓下来。"
	}

	return dadMissionTemplate{
		Code:     "vaccine-day-support",
		Title:    "接种日陪同指南",
		Headline: headline,
		Summary:  summary,
		Tasks: []dadMissionTaskDef{
			{Title: "提前准备接种随身包", Description: "把纸巾、水壶、口水巾、备用尿布、安抚玩具和身份证件统一装进同一个包里，出门前只检查一次。", Category: "housework", Priority: "T0", Difficulty: 1},
			{Title: "现场接管排队和拿药", Description: "到现场后由你负责带娃轮换、排队、取号、拿药和听护士交代，让她不必一边安抚一边找流程。", Category: "parenting", Priority: "T0", Difficulty: 3},
			{Title: "陪完留观并记录下一步", Description: "接种后陪留观 30 分钟，观察状态并把下一次接种时间或注意事项记进备忘录。", Category: "health", Priority: "T1", Difficulty: 2},
		},
		ImageTone: "接种现场也有人稳稳接住全局的安心感",
	}
}

func compileSafetySeatMission(progressOpt futureLetterOptionDef, supportOpt futureLetterOptionDef) dadMissionTemplate {
	if supportOpt.Tag == "SAFETY_SEAT_RESEARCH_SUPPORT" || progressOpt.Tag == "SAFETY_SEAT_NOT_BOUGHT" {
		headline := "[核心指令] 今晚请把安全座椅的选购条件研究清楚。"
		summary := "她需要的不是再刷十篇评测，而是一份和家里车型、孩子体型都对得上的结论。你把参数筛出来，选择才会真的轻松。"

		return dadMissionTemplate{
			Code:     "safety-seat-purchase-checklist",
			Title:    "安全座椅选购清单",
			Headline: headline,
			Summary:  summary,
			Tasks: []dadMissionTaskDef{
				{Title: "车型参数核对", Description: "先确认家里车型、接口类型和后排空间，别买回来才发现装不稳。", Category: "housework", Priority: "T0", Difficulty: 1},
				{Title: "体型区间筛选", Description: "按照孩子当前年龄、身高和体重筛掉不合适的型号，把候选控制在 2 到 3 个。", Category: "health", Priority: "T1", Difficulty: 1},
				{Title: "购买前清单", Description: "把是否支持反向安装、清洗拆卸和头枕调节这些关键点列成一张对比表，再下单。", Category: "parenting", Priority: "T1", Difficulty: 1},
			},
			ImageTone: "把出行安全的关键选择做扎实后的安稳感",
		}
	}

	headline := "[核心指令] 今晚请把安全座椅装对，并把检查动作固定下来。"
	summary := "真正能保命的不是“家里有一个座椅”，而是它每次都被正确安装、正确使用。你来负责这件事的执行标准。"
	if progressOpt.Tag == "SAFETY_SEAT_ROUTINE_LOOSE" {
		headline = "[核心指令] 从今天起，把每次上车前的安全检查变成固定动作。"
		summary = "松懈往往就发生在短途。把上车前检查做成不用思考的流程，才是真的在保护孩子。"
	}

	return dadMissionTemplate{
		Code:     "safety-seat-install-guide",
		Title:    "安全座椅安装指南",
		Headline: headline,
		Summary:  summary,
		Tasks: []dadMissionTaskDef{
			{Title: "安装固定", Description: "按照车型接口和说明书重新安装一遍，确认底座不晃动，别凭感觉算“差不多”。", Category: "housework", Priority: "T0", Difficulty: 2},
			{Title: "肩带检查", Description: "让孩子坐进去后，确认肩带高度、松紧和卡扣位置都合适，不勒脖子也不松垮。", Category: "parenting", Priority: "T1", Difficulty: 2},
			{Title: "上车前口令", Description: "把“坐好、扣好、再开车”变成固定口令，哪怕短途也不跳过。", Category: "emotional", Priority: "T1", Difficulty: 1},
		},
		ImageTone: "每次出发前都被认真保护着的笃定感",
	}
}

func enrichMissionWithAutoTasks(mission dadMissionTemplate, ageStage string, letterCode string) dadMissionTemplate {
	autoTasks := buildAutoSupportTasks(ageStage, letterCode)
	if len(autoTasks) == 0 {
		return mission
	}

	mission.Tasks = append(mission.Tasks, autoTasks...)
	return mission
}

func buildAutoSupportTasks(ageStage string, letterCode string) []dadMissionTaskDef {
	switch {
	case ageStage == "pregnancy":
		return []dadMissionTaskDef{
			{Title: "补给准备", Description: "每天固定把温水、纸巾和一份容易入口的小点心放在她最常坐的地方。", Category: "health", Priority: "T2", Difficulty: 1},
		}
	case infantAgeStages[ageStage]:
		if letterCode == futureLetterCodeVaccine {
			return []dadMissionTaskDef{
				{Title: "接种后记录", Description: "接种当天把时间、针次和观察到的状态记进备忘录，方便下次不再临时回忆。", Category: "health", Priority: "T2", Difficulty: 1},
			}
		}
		return []dadMissionTaskDef{
			{Title: "夜间补给检查", Description: "睡前把尿布、湿巾和口水巾补齐到床边或护理台，减少夜里手忙脚乱。", Category: "housework", Priority: "T2", Difficulty: 1},
		}
	case toddlerAgeStages[ageStage]:
		if letterCode == futureLetterCodeSafetySeat {
			return []dadMissionTaskDef{
				{Title: "出发前检查", Description: "每次开车前都看一眼肩带、卡扣和孩子坐姿，别因为“就一小段”跳过。", Category: "parenting", Priority: "T2", Difficulty: 1},
			}
		}
		return []dadMissionTaskDef{
			{Title: "高能释放", Description: "晚饭后主动接手 10 分钟跑跳游戏，把最吵的那段体力活先接过去。", Category: "parenting", Priority: "T2", Difficulty: 1},
		}
	default:
		return nil
	}
}

func (s *WhisperService) syncFamilyAgeStage(author *model.User, stageTag string) error {
	nextAgeStage := mapFutureLetterStageToAge(stageTag, author.BabyAgeStage)
	if nextAgeStage == "" {
		return nil
	}

	author.BabyAgeStage = &nextAgeStage
	if err := s.userRepo.Update(author); err != nil {
		return fmt.Errorf("保存阶段状态失败，请重试")
	}

	if author.PartnerID == nil {
		return nil
	}

	partner, err := s.userRepo.FindByID(*author.PartnerID)
	if err != nil {
		return nil
	}

	partnerStage := mapFutureLetterStageToAge(stageTag, partner.BabyAgeStage)
	if partnerStage == "" {
		partnerStage = nextAgeStage
	}
	partner.BabyAgeStage = &partnerStage
	if err := s.userRepo.Update(partner); err != nil {
		return fmt.Errorf("保存阶段状态失败，请重试")
	}

	return nil
}

func mapFutureLetterStageToAge(stageTag string, current *string) string {
	currentValue := ""
	if current != nil {
		currentValue = *current
	}

	switch stageTag {
	case "PREGNANCY":
		return "pregnancy"
	case "INFANT_0_12M":
		if infantAgeStages[currentValue] {
			return currentValue
		}
		return "0-3m"
	case "TODDLER_2Y":
		if toddlerAgeStages[currentValue] {
			return currentValue
		}
		return "2-3y"
	default:
		return currentValue
	}
}

func (s *WhisperService) syncDadMissionTasks(dadID, momID string, mission dadMissionTemplate) error {
	date := today()
	dateStr := date.Format("2006-01-02")
	ck := coupleKey(dadID, momID)

	if err := s.taskRepo.DeletePendingUserTasksByDate(dadID, date); err != nil {
		return err
	}
	_ = s.taskRepo.DeleteAICacheByCouple(ck, dateStr)

	for _, task := range mission.Tasks {
		ut := &model.UserTask{
			UserID:        dadID,
			Date:          date,
			Status:        model.TaskPending,
			Source:        model.TaskSourceWhisper,
			AITitle:       task.Title,
			AIDescription: task.Description,
			AICategory:    task.Category,
			AIDifficulty:  task.Difficulty,
			Priority:      model.TaskPriority(task.Priority),
		}
		if ut.Priority == "" {
			ut.Priority = model.PriorityT1
		}
		if err := s.taskRepo.CreateUserTask(ut); err != nil {
			return err
		}
	}

	return nil
}

func (s *WhisperService) persistWish(authorID, wish string) {
	if s.whisperRepo == nil || wish == "" {
		return
	}

	w := &model.Whisper{
		AuthorID: authorID,
		Content:  wish,
	}
	if err := s.whisperRepo.Create(w); err != nil {
		return
	}

	if s.ragService != nil {
		go func() {
			_ = s.ragService.IndexText(context.Background(), model.SourceWhisper, w.ID, &authorID, wish)
		}()
	}
}

func buildFutureLetterImagePrompt(letterCode, primaryLabel, secondaryLabel, missionTone, wish string) string {
	var sb strings.Builder
	switch letterCode {
	case futureLetterCodePrenatal:
		sb.WriteString("一张带着海风质感的中文信纸，孕期的妈妈站在海边，脑海里装着产检、待产包和临近生产前的琐碎准备。")
		fmt.Fprintf(&sb, "画面里要能感受到“%s”和“%s”这两种现实压力。", primaryLabel, secondaryLabel)
	case futureLetterCodeVaccine:
		sb.WriteString("一张带着海风质感的中文信纸，妈妈在沙滩边想着宝宝即将面对的疫苗小关卡。")
		fmt.Fprintf(&sb, "画面里要能感受到“%s”和“%s”这两种现实压力。", primaryLabel, secondaryLabel)
	case futureLetterCodeSafetySeat:
		sb.WriteString("一张带着海风质感的中文信纸，妈妈想到每一次出门上车前的安全动作，画面里有孩子、车门和被认真系好的安全感。")
		fmt.Fprintf(&sb, "画面里要能感受到“%s”和“%s”这两种现实压力。", primaryLabel, secondaryLabel)
	default:
		sb.WriteString("一张带着海风质感的中文信纸，漫步沙滩的妈妈被晚霞和海浪轻轻包住。")
		fmt.Fprintf(&sb, "她正处在“%s”的阶段，身体和情绪状态是“%s”。", primaryLabel, secondaryLabel)
	}
	if missionTone != "" {
		fmt.Fprintf(&sb, "画面气质要呈现%s。", missionTone)
	}
	if wish != "" {
		fmt.Fprintf(&sb, "把她此刻的小心愿也悄悄藏进画面里：%s。", wish)
	}
	sb.WriteString("整体温暖、细腻、轻盈，像被理解后终于能松一口气的瞬间。")
	return sb.String()
}

func toFutureLetterResponseItems(items []model.FutureLetterResponse) []dto.FutureLetterResponseItem {
	resp := make([]dto.FutureLetterResponseItem, len(items))
	for i, item := range items {
		resp[i] = toFutureLetterResponseItem(item)
	}
	return resp
}

func toFutureLetterResponseItem(item model.FutureLetterResponse) dto.FutureLetterResponseItem {
	adviceItems := make([]dto.FutureLetterAdviceItem, 0)
	if item.DadTasksJSON != "" {
		var raw []dadAdviceItemDef
		if err := json.Unmarshal([]byte(item.DadTasksJSON), &raw); err == nil {
			adviceItems = make([]dto.FutureLetterAdviceItem, 0, len(raw))
			for _, advice := range raw {
				adviceItems = append(adviceItems, dto.FutureLetterAdviceItem{
					Title:       advice.Title,
					Description: advice.Description,
					Kind:        advice.Kind,
				})
			}
		}
	}
	adviceSources := make([]dto.FutureLetterAdviceSource, 0)
	if item.DadAdviceSourcesJSON != "" {
		var raw []dadAdviceSourceDef
		if err := json.Unmarshal([]byte(item.DadAdviceSourcesJSON), &raw); err == nil {
			adviceSources = make([]dto.FutureLetterAdviceSource, 0, len(raw))
			for _, source := range raw {
				adviceSources = append(adviceSources, dto.FutureLetterAdviceSource{
					Label:  source.Label,
					Detail: source.Detail,
				})
			}
		}
	}

	return dto.FutureLetterResponseItem{
		ID:               item.ID,
		LetterCode:       item.LetterCode,
		StageTag:         item.StageTag,
		StageLabel:       item.StageLabel,
		StateTag:         item.StateTag,
		StateLabel:       item.StateLabel,
		WishContent:      item.WishContent,
		DadPlanCode:      item.DadPlanCode,
		DadPlanTitle:     item.DadPlanTitle,
		DadHeadline:      item.DadHeadline,
		DadSummary:       item.DadSummary,
		DadAdviceItems:   adviceItems,
		DadAdviceSources: adviceSources,
		ImagePrompt:      item.ImagePrompt,
		CreatedAt:        item.CreatedAt,
	}
}
