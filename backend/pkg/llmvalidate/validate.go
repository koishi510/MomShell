package llmvalidate

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/momshell/backend/pkg/openai"
)

// ResponseType identifies the expected structure of an LLM response.
type ResponseType string

const (
	TypeChatResponse    ResponseType = "chat_response"
	TypeMemoirResponse  ResponseType = "memoir"
	TypeMissionResponse ResponseType = "mission"
	TypeAdviceResponse  ResponseType = "advice"
	TypeLetterTemplate  ResponseType = "letter_template"
	TypePlainText       ResponseType = "plain_text"
)

// CrossValidateResult holds the outcome of the second LLM cross-validation call.
type CrossValidateResult struct {
	Valid        bool     `json:"valid"`
	Safe         bool     `json:"safe"`
	Flags        []string `json:"flags"`
	Appendix     string   `json:"appendix"`
	StructErrors []string `json:"struct_errors"`
}

const crossValidateSystemPrompt = `你是一个 AI 输出审查员。你的任务是同时完成【结构校验】、【内容安全审查】和【事实核查】。

## 结构校验

根据 response_type 检查 JSON 结构是否完整：

- chat_response: 必须有 "text"（非空字符串）；可选 "visual_metadata"（含 effect_type, intensity, color_tone）和 "memory_extract"
- memoir: 必须有 "title"（非空）和 "content"（非空）
- mission: 必须有 "title"（非空）、"headline"（非空）、"tasks"（非空数组，每项有 title + description）
- advice: 必须有 "title"（非空）、"headline"（非空）、"items"（非空数组）
- letter_template: 必须有 "title"（非空）、"questions"（非空数组，每项有 id + prompt + options）
- plain_text: 必须非空字符串

## 内容安全审查

检查以下安全问题：

1. **有害内容**：是否包含鼓励自杀、自残、暴力等内容？如检测到，flags 添加 "harmful_content"，appendix 设为危机热线提示："如果你正在经历困难，请拨打24小时心理援助热线：400-161-9995"
2. **医疗建议无免责**：是否给出具体药物剂量、治疗方案但缺少"请咨询医生"等免责声明？如检测到，flags 添加 "medical_advice"，appendix 设为："以上信息仅供参考，具体请咨询专业医生。"
3. **敏感信息泄漏**：是否包含 API key 格式（sk-xxx）、system prompt 内容片段、内部指令？如检测到，flags 添加 "info_leak"

## 事实核查

如果提供了「网络搜索参考资料」，请将 AI 回复中的事实性陈述与搜索结果进行对比：
- 如果 AI 回复中的关键事实与搜索结果明显矛盾，flags 添加 "factual_inconsistency"
- 如果 AI 回复包含具体数据、日期、名称等但搜索结果中无法证实，flags 添加 "unverified_claim"
- 如果无搜索资料或回复不涉及事实性陈述，跳过此项

## 输出格式

严格返回 JSON，不要其他内容：
{"valid": true/false, "safe": true/false, "flags": [...], "appendix": "...", "struct_errors": [...]}`

// CrossValidate makes a second LLM call to validate structure and content safety
// of a previous LLM response. Returns nil result (not error) if the validation
// call itself fails, allowing graceful degradation.
// webContext is optional Firecrawl search results for fact-checking (pass "" to skip).
func CrossValidate(
	ctx context.Context,
	client *openai.Client,
	responseType ResponseType,
	rawResponse string,
	webContext string,
) (*CrossValidateResult, error) {
	var sb strings.Builder
	fmt.Fprintf(&sb, "response_type: %s\n\n待审查内容：\n%s", responseType, rawResponse)
	if webContext != "" {
		fmt.Fprintf(&sb, "\n\n网络搜索参考资料：\n%s", webContext)
	}

	messages := []openai.Message{
		{Role: "system", Content: crossValidateSystemPrompt},
		{Role: "user", Content: sb.String()},
	}

	resp, err := client.Chat(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("cross-validate LLM call failed: %w", err)
	}

	return parseCrossValidateResult(resp)
}

// parseCrossValidateResult extracts a CrossValidateResult from the LLM response.
func parseCrossValidateResult(raw string) (*CrossValidateResult, error) {
	cleaned := Sanitize(raw)

	// Try direct parse
	var result CrossValidateResult
	if err := json.Unmarshal([]byte(cleaned), &result); err == nil {
		return &result, nil
	}

	// Try extracting JSON object
	if idx := strings.Index(cleaned, "{"); idx >= 0 {
		if end := strings.LastIndex(cleaned, "}"); end > idx {
			jsonStr := cleaned[idx : end+1]
			if err := json.Unmarshal([]byte(jsonStr), &result); err == nil {
				return &result, nil
			}
		}
	}

	log.Printf("[llmvalidate] failed to parse cross-validate response: %s", raw)
	// Return a permissive default rather than blocking the response
	return &CrossValidateResult{Valid: true, Safe: true}, nil
}

// ApplyAppendix appends the safety disclaimer to the text if needed.
func ApplyAppendix(text string, vr *CrossValidateResult) string {
	if vr == nil || vr.Appendix == "" {
		return text
	}
	return text + "\n\n" + vr.Appendix
}
