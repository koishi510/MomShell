export type DadChatStyle = 'terminal' | 'ambient'

export const DEFAULT_DAD_CHAT_STYLE: DadChatStyle = 'terminal'

export const DAD_CHAT_STYLE_OPTIONS: Array<{
  value: DadChatStyle
  label: string
}> = [
  {
    value: 'terminal',
    label: '终端模式'
  },
  {
    value: 'ambient',
    label: '氛围模式'
  },
]

export function normalizeDadChatStyle(value?: string | null): DadChatStyle {
  return value === 'ambient' ? 'ambient' : DEFAULT_DAD_CHAT_STYLE
}
