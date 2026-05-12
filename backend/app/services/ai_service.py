import re
import json
import httpx


PROTOCOL_PRESETS = {
    "responses": {
        "endpointPath": "/v1/responses",
        "desc": "OpenAI Responses API",
    },
    "chat-completions": {
        "endpointPath": "/v1/chat/completions",
        "desc": "OpenAI Chat Completions / 兼容网关",
    },
    "anthropic": {
        "endpointPath": "/v1/messages",
        "desc": "Anthropic Messages API",
    },
}


def normalize_config(config: dict) -> dict:
    return {
        **config,
        "providerName": config.get("providerName", "").strip(),
        "baseUrl": re.sub(r"/+$", "", config.get("baseUrl", "").strip()),
        "endpointPath": (
            config.get("endpointPath", "").strip()
            if config.get("endpointPath", "").strip().startswith("/")
            else f"/{config.get('endpointPath', '').strip()}"
        ),
        "apiKey": config.get("apiKey", "").strip(),
        "model": config.get("model", "").strip(),
    }


def validate_config(config: dict):
    if not config.get("apiKey"):
        raise ValueError("请先在 AI 设置中填写 API Key。")
    if not config.get("baseUrl"):
        raise ValueError("请先在 AI 设置中填写基础地址。")
    if not config.get("endpointPath"):
        raise ValueError("请先在 AI 设置中填写请求接口路径。")
    if not config.get("model"):
        raise ValueError("请先在 AI 设置中填写模型名称。")


def format_currency_delta(value: float) -> str:
    if value > 0:
        return f"预计每月可节省约{value:.0f}元"
    if value < 0:
        return f"预计每月需多投入约{abs(value):.0f}元"
    return "预计账单基本持平"


def build_prompt(result: dict) -> str:
    user = result["user"]
    plan = result["recommendedPlan"]
    reason = result.get("reason", "")
    risk_level = result.get("riskLevel", "low")
    save_amount = result.get("saveAmount", 0)
    review_note = result.get("reviewNote", "")
    selection_mode = result.get("selectionMode", "auto")

    lines = [
        "请基于以下用户与套餐信息，生成一段适合中国移动外呼场景的中文营销话术。",
        "要求：",
        "1. 语气自然、口语化、专业，不要夸张推销。",
        "2. 只输出最终话术，不要解释，不要加标题，不要使用项目符号。",
        "3. 120字到180字，1段完成。",
        "4. 必须围绕推荐套餐的核心利益点，可结合资费、流量、通话、宽带、FTTR、权益变化。",
        "5. 不要编造未提供的信息，不要承诺免费，不要承诺立刻生效。",
        "6. 如果风险较高，要用更稳妥表达，避免强推。",
        "",
        f"用户手机号：{user.get('phone', '')}",
        f"归属地：{user.get('province', '') or '未知'}",
        f"当前套餐：{user.get('currentPlanName', '')}",
        f"当前档位：{user.get('currentPrice', 0)}元",
        f"近三个月ARPU：{user.get('arpu3Month', 0)}元",
        f"月均流量：{user.get('avgData', 0)}GB",
        f"月均通话：{user.get('avgVoice', 0)}分钟",
        f"是否有宽带：{'是' if user.get('hasBroadband') else '否'}",
        f"当前宽带速率：{f'{user.get('broadbandSpeed', 0)}Mbps' if user.get('hasBroadband') else '无'}",
        f"是否FTTR：{'是' if user.get('isFTTR') else '否'}",
        f"备注：{user.get('remark', '') or '无'}",
        f"系统/当前推荐套餐：{plan.get('name', '')}",
        f"推荐档位：{plan.get('price', 0)}元",
        f"推荐流量：{plan.get('data', 0)}GB",
        f"推荐语音：{plan.get('voice', 0)}分钟",
        f"推荐宽带：{f'{plan.get('broadbandSpeed', 0)}Mbps' if plan.get('hasBroadband') else '无'}",
        f"推荐FTTR：{'是' if plan.get('isFTTR') else '否'}",
        f"套餐权益：{plan.get('extras', '') or '无额外权益说明'}",
        f"推荐理由：{reason}",
        f"风险等级：{risk_level}",
        f"费用变化提示：{format_currency_delta(save_amount)}",
        f"当前结论来源：{'人工校正后方案' if selection_mode == 'manual' else '系统推荐方案'}",
        f"审核备注：{review_note or '无'}",
    ]
    return "\n".join(lines)


# --- Response extractors ---

def extract_output_text(response: dict) -> str:
    """OpenAI Responses API: output_text or output[].content[].text"""
    if isinstance(response.get("output_text"), str) and response["output_text"].strip():
        return response["output_text"].strip()

    output = response.get("output", [])
    if not isinstance(output, list):
        return ""

    texts = []
    for item in output:
        content = item.get("content", [])
        if not isinstance(content, list):
            continue
        for c in content:
            if c.get("type") == "output_text" and isinstance(c.get("text"), str):
                texts.append(c["text"].strip())

    return "\n".join(texts).strip()


def extract_chat_completion_text(response: dict) -> str:
    """OpenAI Chat Completions: choices[0].message.content"""
    choices = response.get("choices", [])
    if not choices:
        return ""
    content = choices[0].get("message", {}).get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        return "\n".join(
            item.get("text", "") for item in content if item.get("type") == "text"
        ).strip()
    return ""


def extract_anthropic_text(response: dict) -> str:
    """Anthropic Messages API: content[0].text"""
    content = response.get("content", [])
    if not isinstance(content, list):
        return ""
    texts = []
    for block in content:
        if block.get("type") == "text" and isinstance(block.get("text"), str):
            texts.append(block["text"].strip())
    return "\n".join(texts).strip()


def extract_response_text(response: dict, protocol: str) -> str:
    if protocol == "anthropic":
        return extract_anthropic_text(response)
    if protocol == "chat-completions":
        return extract_chat_completion_text(response)
    return extract_output_text(response)


# --- Request builders ---

def build_request_url(config: dict) -> str:
    base = re.sub(r"/+$", "", config.get("baseUrl", "").strip())
    path = config.get("endpointPath", "").strip()
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{base}{path}"


def build_request_headers(config: dict) -> dict:
    protocol = config.get("protocol", "chat-completions")

    if protocol == "anthropic":
        return {
            "Content-Type": "application/json",
            "x-api-key": config["apiKey"],
            "anthropic-version": "2023-06-01",
        }

    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['apiKey']}",
    }


def build_request_body(config: dict, prompt: str, *, is_test: bool = False) -> dict:
    protocol = config.get("protocol", "chat-completions")
    model = config.get("model", "")
    max_tokens = 16 if is_test else 1024

    if protocol == "anthropic":
        body: dict = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if not is_test:
            body["system"] = (
                "你是一个专业的中国移动客服话术助手。"
                "根据用户信息和推荐套餐，生成自然、口语化、专业的营销话术。"
                "只输出话术本身，120-180字。"
            )
        return body

    if protocol == "chat-completions":
        body: dict = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
        }
        if not is_test:
            body["max_completion_tokens"] = max_tokens
        return body

    # responses
    body = {
        "model": model,
        "input": prompt,
    }
    if is_test:
        body["max_output_tokens"] = max_tokens
    return body


def parse_error_payload_message(payload: dict, status_code: int = 0, raw_text: str = "") -> str:
    if isinstance(payload.get("error"), dict):
        err = payload["error"]
        msg = err.get("message", "")
        param = err.get("param", "")
        if msg and param:
            return f"HTTP {status_code}: {msg} (param: {param})"
        if msg:
            return f"HTTP {status_code}: {msg}"
    if isinstance(payload.get("error"), str):
        return f"HTTP {status_code}: {payload['error']}"
    msg = payload.get("message", "") or payload.get("msg", "")
    if msg:
        return f"HTTP {status_code}: {msg}"
    if raw_text:
        return f"HTTP {status_code}: {raw_text[:300]}"
    return f"HTTP {status_code}: 接口调用失败，请检查地址、密钥、模型和跨域设置。"


# --- Public API ---

async def generate_recommendation_script(result: dict, config: dict) -> str:
    config = normalize_config(config)
    validate_config(config)

    prompt = build_prompt(result)
    url = build_request_url(config)
    body = build_request_body(config, prompt)
    headers = build_request_headers(config)

    safe_headers = {k: ("***" if k.lower() in ("authorization", "x-api-key") else v) for k, v in headers.items()}
    print(f"AI request → {config.get('protocol')} {url}")
    print(f"  Headers: {safe_headers}")
    print(f"  Body: {json.dumps(body, ensure_ascii=False)}")

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, json=body, headers=headers)

    print(f"AI response ← {response.status_code} {response.text[:500]}")

    try:
        payload = response.json()
    except Exception:
        payload = {}

    if response.status_code >= 400:
        raise ValueError(parse_error_payload_message(payload, response.status_code, response.text))

    script = extract_response_text(payload, config.get("protocol", "chat-completions"))
    if not script:
        raise ValueError("模型未返回可用话术，请重试。")

    return script


async def test_provider_connection(config: dict) -> str:
    config = normalize_config(config)
    validate_config(config)

    test_prompt = '请回复"连接成功"，不要输出其他内容。'
    url = build_request_url(config)
    body = build_request_body(config, test_prompt, is_test=True)
    headers = build_request_headers(config)

    safe_headers = {k: ("***" if k.lower() in ("authorization", "x-api-key") else v) for k, v in headers.items()}
    print(f"AI test → {config.get('protocol')} {url}")
    print(f"  Headers: {safe_headers}")
    print(f"  Body: {json.dumps(body, ensure_ascii=False)}")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=body, headers=headers)
    except Exception as e:
        raise ValueError(f"连接失败：{e}")

    print(f"AI test ← {response.status_code} {response.text[:500]}")

    try:
        payload = response.json()
    except Exception:
        payload = {}

    if response.status_code >= 400:
        raise ValueError(parse_error_payload_message(payload, response.status_code, response.text))

    text = extract_response_text(payload, config.get("protocol", "chat-completions"))
    return text or "连接成功"
