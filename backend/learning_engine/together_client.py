from __future__ import annotations

import asyncio
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional

from openai import AsyncOpenAI

from utils.config import TOGETHER_API_KEY

logger = logging.getLogger("contextflow")

together_client = AsyncOpenAI(
    api_key=TOGETHER_API_KEY,
    base_url="https://api.together.xyz/v1",
)

MODEL_DEEPSEEK = "deepseek-ai/DeepSeek-V3"
MODEL_LLAMA = "meta-llama/Llama-3.3-70B-Instruct-Turbo"
MODEL_QWEN = "Qwen/Qwen2.5-72B-Instruct-Turbo-Free"
ALL_MODELS = [MODEL_DEEPSEEK, MODEL_LLAMA, MODEL_QWEN]


async def call_model(
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> Optional[str]:
    try:
        response = await together_client.chat.completions.create(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content
    except Exception as exc:
        logger.error("call_model failed model=%s: %s", model, exc)
        return None


async def call_model_n_times(
    model: str,
    system_prompt: str,
    user_prompt: str,
    n: int = 3,
    temperature: float = 0.5,
) -> list[Optional[str]]:
    tasks = [
        call_model(
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=round(temperature + i * 0.1, 2),
        )
        for i in range(n)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [
        r if not isinstance(r, Exception) else None
        for r in results
    ]
