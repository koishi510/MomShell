# app/services/chat/router.py
"""
Soulful Companion 情感交互模块路由层

提供 RESTful API 接口：
- POST /chat: 情感对话接口
"""

import sys
import traceback
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from .schemas import UserMessage, UserProfile, VisualResponse
from .service import CompanionService, get_companion_service

router = APIRouter(prefix="/companion", tags=["Soulful Companion"])

ServiceDep = Annotated[CompanionService, Depends(get_companion_service)]


@router.post("/chat", response_model=VisualResponse)
async def chat(
    message: UserMessage,
    service: ServiceDep,
) -> VisualResponse:
    """
    情感对话接口

    接收用户消息，返回包含文字和视觉元数据的情感响应。

    - **content**: 用户输入的文字内容
    - **session_id**: 可选的会话标识符，用于关联同一对话会话

    返回：
    - **text**: Agent 的温暖回复
    - **visual_metadata**: 视觉效果元数据（effect_type, intensity, color_tone）
    - **memory_updated**: 是否更新了用户记忆
    """
    try:
        return await service.chat(message)
    except ValueError as e:
        print("[Router] ValueError:", str(e), file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        print(f"[Router] Unexpected error: {type(e).__name__}: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"服务暂时不可用，请稍后再试: {type(e).__name__}",
        ) from e


@router.get("/profile/{session_id}", response_model=UserProfile | None)
async def get_profile(
    session_id: str,
    service: ServiceDep,
) -> UserProfile | None:
    """
    获取用户画像

    返回指定会话的用户画像信息，包括：
    - 称呼偏好
    - 宠物信息
    - 兴趣爱好
    - 担忧事项
    - 重要日期
    - 宝宝年龄
    """
    return service.get_session_profile(session_id)
