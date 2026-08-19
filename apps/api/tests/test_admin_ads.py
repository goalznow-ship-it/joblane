import io

import pytest
from conftest import login, csrf_headers, ADMIN_EMAIL

PLACEMENTS = [
    "TOP_LEADERBOARD",
    "LEFT_SKIN",
    "RIGHT_SKIN",
    "RIGHT_SIDEBAR",
    "INLINE_FEED",
    "MOBILE_BANNER",
]

FORMATS = {
    "TOP_LEADERBOARD": "970x90",
    "LEFT_SKIN": "160x600",
    "RIGHT_SKIN": "120x600",
    "RIGHT_SIDEBAR": "300x250",
    "INLINE_FEED": "728x90",
    "MOBILE_BANNER": "320x100",
}


def make_payload(placement: str, **overrides) -> dict:
    payload = {
        "advertiser_name": "Test Advertiser",
        "campaign_name": f"Campaign {placement}",
        "industry": "banking",
        "headline": "Special offer",
        "description": "Limited time offer",
        "cta_label": "Apply now",
        "destination_url": "https://example.com/offer",
        "alt_text": "alt text",
        "placement": placement,
        "format": FORMATS[placement],
        "background": "navy",
        "accent_color": "#2563EB",
        "priority": 5,
        "status": "DRAFT",
    }
    payload.update(overrides)
    return payload


async def upload_creative(client, token: str, mobile: bool = False) -> str:
    data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    res = await client.post(
        "/api/v1/admin/ads/upload",
        params={"mobile": "true" if mobile else "false"},
        files={"file": ("creative.png", io.BytesIO(data), "image/png")},
        headers={"X-CSRF-Token": token},
    )
    assert res.status_code == 200, res.text
    return res.json()["url"]


@pytest.mark.asyncio
async def test_ads_crud_and_status_workflow(client):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    # Create a draft ad for every placement
    created_ids = []
    for placement in PLACEMENTS:
        res = await client.post(
            "/api/v1/admin/ads",
            json=make_payload(placement),
            headers=headers,
        )
        assert res.status_code == 201, res.text
        body = res.json()
        assert body["status"] == "DRAFT"
        assert body["placement"] == placement
        assert body["format"] == FORMATS[placement]
        created_ids.append(body["id"])

    # Upload creatives for the first ad
    ad_id = created_ids[0]
    desktop_url = await upload_creative(client, token, mobile=False)
    mobile_url = await upload_creative(client, token, mobile=True)

    # Edit the ad with all editable fields
    res = await client.patch(
        f"/api/v1/admin/ads/{ad_id}",
        json={
            "headline": "Updated headline",
            "cta_label": "Buy now",
            "priority": 9,
            "creative_image_url": desktop_url,
            "mobile_image_url": mobile_url,
            "format": "970x90",
        },
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["headline"] == "Updated headline"
    assert body["priority"] == 9
    assert body["creative_image_url"] == desktop_url
    assert body["mobile_image_url"] == mobile_url

    # Full status lifecycle
    transitions = [
        ("schedule", "SCHEDULED"),
        ("activate", "ACTIVE"),
        ("pause", "PAUSED"),
        ("resume", "ACTIVE"),
        ("pause", "PAUSED"),
        ("archive", "ARCHIVED"),
    ]
    for action, expected in transitions:
        res = await client.post(
            f"/api/v1/admin/ads/{ad_id}/status",
            json={"action": action, "reason": f"test {action}"},
            headers=headers,
        )
        assert res.status_code == 200, res.text
        assert res.json()["status"] == expected

    # Moderation history recorded for each transition
    res = await client.get(f"/api/v1/admin/ads/{ad_id}", headers=headers)
    assert res.status_code == 200
    assert len(res.json()["moderation_history"]) == len(transitions)

    # List with filters
    res = await client.get(
        "/api/v1/admin/ads",
        params={"status": "ARCHIVED", "placement": PLACEMENTS[0], "limit": 50},
        headers=headers,
    )
    assert res.status_code == 200
    listed = [a["id"] for a in res.json()["items"]]
    assert ad_id in listed

    # Invalid transition is rejected
    res = await client.post(
        f"/api/v1/admin/ads/{ad_id}/status",
        json={"action": "activate"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "keçid mümkün deyil" in res.json()["detail"]

    # Invalid format rejected
    res = await client.post(
        "/api/v1/admin/ads",
        json=make_payload("TOP_LEADERBOARD", format="FORMAT_970x90"),
        headers=headers,
    )
    assert res.status_code == 400
    assert "Bilinməyən format" in res.json()["detail"]

    # Invalid placement rejected
    res = await client.post(
        "/api/v1/admin/ads",
        json={**make_payload("TOP_LEADERBOARD"), "placement": "NOPE"},
        headers=headers,
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_public_active_ads_only_serve_active_scheduled_within_window(client):
    token = await login(client, ADMIN_EMAIL)
    headers = await csrf_headers(token)

    # Active ad for TOP_LEADERBOARD
    res = await client.post(
        "/api/v1/admin/ads",
        json=make_payload("TOP_LEADERBOARD", priority=10),
        headers=headers,
    )
    active_id = res.json()["id"]
    res = await client.post(
        f"/api/v1/admin/ads/{active_id}/status",
        json={"action": "activate"},
        headers=headers,
    )
    assert res.json()["status"] == "ACTIVE"

    # Draft ad must not appear
    res = await client.post(
        "/api/v1/admin/ads",
        json=make_payload("TOP_LEADERBOARD", priority=20),
        headers=headers,
    )
    draft_id = res.json()["id"]

    # Paused ad must not appear
    res = await client.post(
        "/api/v1/admin/ads",
        json=make_payload("TOP_LEADERBOARD", priority=30),
        headers=headers,
    )
    paused_id = res.json()["id"]
    await client.post(
        f"/api/v1/admin/ads/{paused_id}/status",
        json={"action": "activate"},
        headers=headers,
    )
    await client.post(
        f"/api/v1/admin/ads/{paused_id}/status",
        json={"action": "pause"},
        headers=headers,
    )

    res = await client.get(
        "/api/v1/admin/public/ads/active",
        params={"placement": "TOP_LEADERBOARD", "limit": 10},
    )
    assert res.status_code == 200
    served = [a["id"] for a in res.json()["items"]]
    assert active_id in served
    assert draft_id not in served
    assert paused_id not in served

    # Active ad must be served for its own placement only
    for placement in PLACEMENTS[1:]:
        res = await client.get(
            "/api/v1/admin/public/ads/active",
            params={"placement": placement, "limit": 10},
        )
        served = [a["id"] for a in res.json()["items"]]
        assert active_id not in served