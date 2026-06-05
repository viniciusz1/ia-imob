from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from app.services.llm import LlmClient


class _RecordingChat:
    def __init__(self) -> None:
        self.messages = []

    async def ainvoke(self, messages):
        self.messages = messages
        return SimpleNamespace(
            content=json.dumps(
                {
                    "strategy": "sitemap",
                    "name": "Itaivan",
                    "extractors": [
                        {
                            "field_name": "bairro",
                            "source_type": "og",
                            "selector_value": "title",
                            "pipeline": "split:, :1 | split: - :0 | strip",
                            "output_type": "text",
                            "priority": 1,
                            "is_optional": False,
                        }
                    ],
                }
            )
        )


class _PromptClient(LlmClient):
    def __init__(self, chat: _RecordingChat) -> None:
        super().__init__(api_key="test", base_url="https://llm.test", model="test")
        self.chat = chat

    def _chat(self, *, temperature=0.1, max_tokens=None):
        return self.chat


@pytest.mark.asyncio
async def test_synthesis_prompt_teaches_og_suffixes_and_dsl_pipelines():
    chat = _RecordingChat()
    client = _PromptClient(chat)

    proposal = await client.synthesize(
        htmls=[
            """
            <html><head>
              <meta property="og:title" content="Apartamento, Vila Baependi - Jaraguá do Sul/SC">
              <meta property="og:image" content="https://cdn.test/1.jpg">
            </head></html>
            """
        ],
        fields=["bairro"],
        prior_failures={},
        execution_model="sitemap",
    )

    system_prompt = chat.messages[0]["content"]
    user_prompt = chat.messages[1]["content"]

    assert proposal is not None
    assert client.last_messages == chat.messages
    assert "selector_value=image" in system_prompt
    assert "never selector_value=og:image" in system_prompt
    assert "DSL Pipeline" in system_prompt
    assert "split:<delimiter>:<index>" in system_prompt
    assert "do not convert Brazilian decimal commas" in system_prompt
    assert "return two area" in system_prompt
    assert "set is_optional=true" in system_prompt
    assert "Prefer split pipelines over regex for title/h1 location patterns" in system_prompt
    assert "Do not leave prefixes" in system_prompt
    assert "Avoid literal \"|\" alternation" in system_prompt
    assert "visible feature blocks" in system_prompt
    assert "\"0,00 m²\"" in system_prompt
    assert "pipeline" in user_prompt


@pytest.mark.asyncio
async def test_synthesis_prompt_includes_html_evidence_before_raw_samples():
    chat = _RecordingChat()
    client = _PromptClient(chat)

    await client.synthesize(
        htmls=[
            """
            <html><head>
              <title>Apartamento para alugar, Vila Baependi - Jaraguá do Sul/SC</title>
              <meta property="og:title" content="Apartamento para alugar, Vila Baependi - Jaraguá do Sul/SC">
              <meta property="og:image" content="https://cdn.test/1.jpg">
            </head><body>
              <h6 class="preco-imovel">R$ 2.400,00</h6>
            </body></html>
            """
        ],
        fields=["valor", "bairro", "cidade", "imagem"],
        prior_failures={},
        execution_model="sitemap",
    )

    user_prompt = chat.messages[1]["content"]

    assert "HTML evidence:" in user_prompt
    assert "og:title: Apartamento para alugar, Vila Baependi - Jaraguá do Sul/SC" in user_prompt
    assert "og:image: https://cdn.test/1.jpg" in user_prompt
    assert "price-like text: R$ 2.400,00" in user_prompt
    assert user_prompt.index("HTML evidence:") < user_prompt.index("HTML samples:")


@pytest.mark.asyncio
async def test_synthesis_prompt_includes_feature_pairs_outside_raw_sample_window():
    chat = _RecordingChat()
    client = _PromptClient(chat)
    long_prefix = "<div>menu filler</div>" * 500

    await client.synthesize(
        htmls=[
            f"""
            <html><head>
              <title>Apartamento para alugar, Vila Baependi - Jaraguá do Sul/SC</title>
            </head><body>
              {long_prefix}
              <div class="icon_detalhes">
                <span>2</span>
                <span>Quarto(s)</span>
              </div>
            </body></html>
            """
        ],
        fields=["quartos"],
        prior_failures={},
        execution_model="sitemap",
    )

    system_prompt = chat.messages[0]["content"]
    user_prompt = chat.messages[1]["content"]

    assert "feature-like pairs" in system_prompt
    assert "numeric value and a label" in system_prompt
    assert (
        "feature-like pair: field=quartos value=2 label=Quarto(s) "
        "(in <div class=\"icon_detalhes\">; "
        "suggested_xpath=//div[contains(@class,'icon_detalhes')]"
        "[.//span[contains(normalize-space(.),'Quarto')]]/span[1])"
    ) in user_prompt


@pytest.mark.asyncio
async def test_synthesis_prompt_marks_hidden_zero_feature_pairs_as_valid_counts():
    chat = _RecordingChat()
    client = _PromptClient(chat)

    await client.synthesize(
        htmls=[
            """
            <html><body>
              <div class="icon_detalhes hide">
                <span>0</span>
                <span>Quarto(s)</span>
              </div>
            </body></html>
            """
        ],
        fields=["quartos"],
        prior_failures={},
        execution_model="sitemap",
    )

    system_prompt = chat.messages[0]["content"]
    user_prompt = chat.messages[1]["content"]

    assert "value 0 is valid" in system_prompt
    assert "hidden_zero=true" in system_prompt
    assert "suggested_xpath" in system_prompt
    assert (
        "feature-like pair: field=quartos value=0 label=Quarto(s) "
        "hidden_zero=true (in <div class=\"icon_detalhes hide\">; "
        "suggested_xpath=//div[contains(@class,'icon_detalhes')]"
        "[.//span[contains(normalize-space(.),'Quarto')]]/span[1])"
    ) in user_prompt


@pytest.mark.asyncio
async def test_synthesis_prompt_handles_inline_numeric_feature_text():
    chat = _RecordingChat()
    client = _PromptClient(chat)

    await client.synthesize(
        htmls=[
            """
            <html><body>
              <div class="icon_detalhes">
                <i class="fa-solid fa-bed"></i>
                <p>4 quarto(s)</p>
              </div>
            </body></html>
            """
        ],
        fields=["quartos"],
        prior_failures={},
        execution_model="sitemap",
    )

    user_prompt = chat.messages[1]["content"]

    assert (
        "feature-like pair: field=quartos value=4 label=4 quarto(s) "
        "(in <div class=\"icon_detalhes\">; "
        "suggested_xpath=//div[contains(@class,'icon_detalhes')]"
        "[.//p[contains(normalize-space(.),'quarto')]]/p[1])"
    ) in user_prompt


@pytest.mark.asyncio
async def test_synthesis_prompt_includes_area_from_og_description():
    chat = _RecordingChat()
    client = _PromptClient(chat)

    await client.synthesize(
        htmls=[
            """
            <html><head>
              <meta property="og:description" content="Linda casa. 152,51 m de área construída.">
            </head><body>
              <div><p>0,00 m²</p></div>
            </body></html>
            """
        ],
        fields=["area"],
        prior_failures={},
        execution_model="sitemap",
    )

    user_prompt = chat.messages[1]["content"]

    assert "area-like text: 0,00 m²" in user_prompt
    assert "area-like text: 152,51 m de área construída" in user_prompt


@pytest.mark.asyncio
async def test_synthesis_prompt_biases_toward_the_requested_source_strategy():
    chat = _RecordingChat()
    client = _PromptClient(chat)

    await client.synthesize(
        htmls=["<html></html>"],
        fields=["valor"],
        prior_failures={},
        execution_model="sitemap",
        strategy="structured",
    )
    structured_prompt = chat.messages[0]["content"]

    await client.synthesize(
        htmls=["<html></html>"],
        fields=["valor"],
        prior_failures={},
        execution_model="sitemap",
        strategy="dom",
    )
    dom_prompt = chat.messages[0]["content"]

    assert "structured data sources" in structured_prompt
    assert "omit the field" in structured_prompt
    assert "DOM selectors" in dom_prompt
    assert structured_prompt != dom_prompt
