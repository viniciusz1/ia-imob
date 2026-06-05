from __future__ import annotations

from app.services.anchors import anchor_values


def test_valor_anchor_detects_price_text():
    html = '<html><body><h6 class="preco">R$ 500.000</h6></body></html>'

    assert "R$ 500.000" in anchor_values("valor", html)


def test_link_imovel_anchor_is_the_known_url():
    html = "<html><body>anything</body></html>"

    assert anchor_values("link_imovel", html, url="https://x.test/imovel/1") == {
        "https://x.test/imovel/1"
    }


def test_area_anchor_detects_area_text():
    html = '<html><body><p>152,51 m de área construída</p></body></html>'

    assert any("152,51" in value for value in anchor_values("area", html))


def test_non_anchored_field_has_no_anchor():
    html = '<html><body><span>Centro</span></body></html>'

    assert anchor_values("bairro", html) == set()


def test_quartos_anchor_detects_feature_pair_value():
    html = (
        '<html><body><div class="d">'
        '<span>2</span><span>Quarto(s)</span>'
        '</div></body></html>'
    )

    assert "2" in anchor_values("quartos", html)


def test_feature_anchor_is_field_specific():
    html = (
        '<html><body><div class="d">'
        '<span>3</span><span>Banheiro(s)</span>'
        '</div></body></html>'
    )

    assert "3" in anchor_values("banheiros", html)
    assert anchor_values("quartos", html) == set()
