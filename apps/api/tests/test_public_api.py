"""
Tests for the public marketplace API.

These tests rely on the session-scoped `db_ready` fixture from conftest
(Test Corp VERIFIED company, IT category, Bakı region, 6 PENDING_REVIEW
jobs, 1 APPROVED job — none publicly visible) and add their own seed
rows with unique slugs so tests are order-independent.
"""

import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.admin.models import (
    Job,
    JobStatus,
    JobCategory,
    Region,
    Industry,
    Company,
    CompanyStatus,
    EmploymentType,
    WorkMode,
)


def _now():
    return datetime.now(timezone.utc)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


async def _seed_job(
    status=JobStatus.PUBLISHED,
    title="Public Job",
    slug=None,
    expiration_days=30,
    category=None,
    region=None,
    industry=None,
    employment_type=EmploymentType.FULL_TIME,
    work_mode=WorkMode.ON_SITE,
    experience_level="mid",
    salary_min=1000,
    salary_max=2000,
    company_status=CompanyStatus.VERIFIED,
    company=None,
):
    from app.core.database import AsyncSessionLocal

    suffix = _suffix()
    async with AsyncSessionLocal() as db:
        if company is None:
            company = Company(
                name=f"Test Co {suffix}",
                slug=f"test-co-{suffix}",
                status=company_status,
                industry="IT",
            )
        db.add(company)
        if category is None:
            category = JobCategory(name=f"Cat {suffix}", slug=f"cat-{suffix}", is_active=True)
        else:
            db.add(category)
        if region is None:
            region = Region(name=f"Region {suffix}", slug=f"region-{suffix}", country="AZ", is_active=True)
        else:
            db.add(region)
        if industry is None:
            industry = Industry(name=f"Ind {suffix}", slug=f"ind-{suffix}", is_active=True)
        else:
            db.add(industry)
        await db.flush()

        job = Job(
            company_id=company.id,
            category_id=category.id,
            region_id=region.id,
            industry_id=industry.id,
            industry="IT",
            title=title,
            slug=slug or f"public-job-{suffix}",
            description="Description text",
            requirements="Requirement lines",
            responsibilities="Responsibility lines",
            benefits="Benefit lines",
            location="Bakı",
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency="AZN",
            salary_visible=True,
            employment_type=employment_type,
            work_mode=work_mode,
            experience_level=experience_level,
            status=status,
            publication_date=_now(),
            expiration_date=_now() + timedelta(days=expiration_days) if expiration_days else None,
            views=0,
            applications_count=0,
            favorites_count=0,
        )
        db.add(job)
        await db.commit()
        return {
            "slug": job.slug,
            "company_id": str(company.id),
            "category_id": str(category.id),
            "region_id": str(region.id),
            "industry_id": str(industry.id),
            "company_slug": company.slug,
        }


async def _public_job_slugs(client) -> set[str]:
    res = await client.get("/api/v1/jobs", params={"limit": 100})
    assert res.status_code == 200, res.text
    return {item["slug"] for item in res.json()["data"]}


async def _public_company_slugs(client) -> set[str]:
    res = await client.get("/api/v1/companies", params={"limit": 100})
    assert res.status_code == 200, res.text
    return {item["slug"] for item in res.json()["data"]}


# ---------- Jobs list visibility ----------

@pytest.mark.asyncio
async def test_jobs_list_only_published_visible(client):
    published = await _seed_job(slug=f"vis-published-{_suffix()}")
    hidden = []
    for status in (JobStatus.PENDING_REVIEW, JobStatus.REJECTED, JobStatus.PAUSED,
                   JobStatus.ARCHIVED, JobStatus.EXPIRED, JobStatus.DRAFT, JobStatus.APPROVED):
        row = await _seed_job(status=status, slug=f"vis-{status.value.lower()}-{_suffix()}")
        hidden.append(row["slug"])
    expired = await _seed_job(slug=f"vis-expired-{_suffix()}", expiration_days=-1)
    hidden.append(expired["slug"])

    slugs = await _public_job_slugs(client)
    assert published["slug"] in slugs
    for s in hidden:
        assert s not in slugs, f"{s} must not be public"


# ---------- Job detail ----------

@pytest.mark.asyncio
async def test_job_detail_published_200(client):
    row = await _seed_job(slug=f"detail-pub-{_suffix()}")
    res = await client.get(f"/api/v1/jobs/{row['slug']}")
    assert res.status_code == 200
    body = res.json()
    assert body["slug"] == row["slug"]
    assert body["company"]["name"].startswith("Test Co")
    assert body["requirements"] == "Requirement lines"
    assert body["company_profile"]["active_jobs_count"] == 1
    raw = json.dumps(body)
    for forbidden in ("admin_note", "moderation", "actor", "audit", "verified_by"):
        assert forbidden not in raw, f"internal field leaked: {forbidden}"


@pytest.mark.asyncio
async def test_job_detail_non_public_404(client):
    for status in (JobStatus.PENDING_REVIEW, JobStatus.REJECTED, JobStatus.PAUSED,
                   JobStatus.ARCHIVED, JobStatus.EXPIRED):
        row = await _seed_job(status=status, slug=f"detail-{status.value.lower()}-{_suffix()}")
        res = await client.get(f"/api/v1/jobs/{row['slug']}")
        assert res.status_code == 404, f"{status.value} must be 404"


@pytest.mark.asyncio
async def test_job_detail_unknown_slug_404(client):
    res = await client.get("/api/v1/jobs/does-not-exist-xyz")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_job_detail_hidden_when_company_not_public(client):
    row = await _seed_job(
        slug=f"detail-suspended-{_suffix()}",
        company_status=CompanyStatus.SUSPENDED,
    )
    res = await client.get(f"/api/v1/jobs/{row['slug']}")
    assert res.status_code == 404
    slugs = await _public_job_slugs(client)
    assert row["slug"] not in slugs


# ---------- Filters ----------

@pytest.mark.asyncio
async def test_jobs_filters(client):
    cat_a = JobCategory(name=f"CatA {_suffix()}", slug=f"cata-{_suffix()}", is_active=True)
    cat_b = JobCategory(name=f"CatB {_suffix()}", slug=f"catb-{_suffix()}", is_active=True)
    reg_a = Region(name=f"RegA {_suffix()}", slug=f"rega-{_suffix()}", country="AZ", is_active=True)
    reg_b = Region(name=f"RegB {_suffix()}", slug=f"regb-{_suffix()}", country="AZ", is_active=True)

    j1 = await _seed_job(title="UniqueTitleAlpha", slug=f"f1-{_suffix()}", category=cat_a, region=reg_a,
                         work_mode=WorkMode.REMOTE, employment_type=EmploymentType.CONTRACT)
    j2 = await _seed_job(title="Other Job", slug=f"f2-{_suffix()}", category=cat_b, region=reg_b,
                         work_mode=WorkMode.HYBRID, employment_type=EmploymentType.FULL_TIME)

    res = await client.get("/api/v1/jobs", params={"q": "UniqueTitleAlpha"})
    assert {i["slug"] for i in res.json()["data"]} == {j1["slug"]}

    res = await client.get("/api/v1/jobs", params={"category": cat_a.slug})
    assert {i["slug"] for i in res.json()["data"]} == {j1["slug"]}

    res = await client.get("/api/v1/jobs", params={"region": reg_b.slug})
    assert {i["slug"] for i in res.json()["data"]} == {j2["slug"]}

    res = await client.get("/api/v1/jobs", params={"work_mode": "remote"})
    assert {i["slug"] for i in res.json()["data"]} == {j1["slug"]}

    res = await client.get("/api/v1/jobs", params={"employment_type": "contract"})
    assert {i["slug"] for i in res.json()["data"]} == {j1["slug"]}

    res = await client.get("/api/v1/jobs", params={"company": j1["company_slug"]})
    assert {i["slug"] for i in res.json()["data"]} == {j1["slug"]}

    res = await client.get("/api/v1/jobs", params={"salary_min": 1500})
    assert j1["slug"] in {i["slug"] for i in res.json()["data"]}


@pytest.mark.asyncio
async def test_jobs_pagination(client):
    for i in range(5):
        await _seed_job(title=f"Paging Job {i}", slug=f"paging-{i}-{_suffix()}")
    res = await client.get("/api/v1/jobs", params={"limit": 2, "page": 1})
    body = res.json()
    assert len(body["data"]) == 2
    assert body["meta"]["total"] >= 5
    assert body["meta"]["page"] == 1
    assert body["meta"]["limit"] == 2
    assert body["meta"]["totalPages"] == (body["meta"]["total"] + 1) // 2
    res2 = await client.get("/api/v1/jobs", params={"limit": 2, "page": 2})
    page1_slugs = {i["slug"] for i in body["data"]}
    page2_slugs = {i["slug"] for i in res2.json()["data"]}
    assert not page2_slugs.intersection(page1_slugs)


# ---------- Companies ----------

@pytest.mark.asyncio
async def test_companies_only_public(client):
    for status in (CompanyStatus.SUSPENDED, CompanyStatus.REJECTED,
                   CompanyStatus.ARCHIVED, CompanyStatus.PENDING):
        await _seed_job(company_status=status)
    public = await _seed_job(company_status=CompanyStatus.ACTIVE)

    slugs = await _public_company_slugs(client)
    assert public["company_slug"] in slugs
    for status in ("suspended", "rejected", "archived", "pending"):
        assert not any(status in s for s in slugs), f"company of status {status} leaked"


@pytest.mark.asyncio
async def test_companies_active_jobs_count(client):
    first = await _seed_job(slug=f"co-count-1-{_suffix()}")
    company_slug = first["company_slug"]
    await _seed_job(slug=f"co-count-2-{_suffix()}", company=None)
    # find the company row for the first job's company by its slug
    res = await client.get("/api/v1/companies", params={"limit": 100})
    by_slug = {r["slug"]: r for r in res.json()["data"]}
    # seed a second PUBLISHED job into the same company via DB
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        company = (await db.execute(select(Company).where(Company.slug == company_slug))).scalar_one()
        category = JobCategory(name=f"Cat2 {_suffix()}", slug=f"cat2-{_suffix()}", is_active=True)
        db.add(category)
        await db.flush()
        db.add(Job(
            company_id=company.id, category_id=category.id, title="Second job same co",
            slug=f"co-count-3-{_suffix()}", description="d", status=JobStatus.PUBLISHED,
            publication_date=_now(), expiration_date=_now() + timedelta(days=30),
            employment_type=EmploymentType.FULL_TIME, views=0, applications_count=0, favorites_count=0,
        ))
        await db.commit()

    res = await client.get("/api/v1/companies", params={"limit": 100})
    target = next(r for r in res.json()["data"] if r["slug"] == company_slug)
    assert target["active_jobs_count"] == 2, f"expected 2, got {target['active_jobs_count']}"


@pytest.mark.asyncio
async def test_company_detail(client):
    row = await _seed_job(slug=f"co-detail-{_suffix()}")
    res = await client.get(f"/api/v1/companies/{row['company_slug']}")
    assert res.status_code == 200
    body = res.json()
    assert body["slug"] == row["company_slug"]
    assert body["active_jobs_count"] == 1
    assert body["verified"] is True


@pytest.mark.asyncio
async def test_company_jobs_via_jobs_filter(client):
    row = await _seed_job(slug=f"co-jobs-{_suffix()}")
    res = await client.get("/api/v1/jobs", params={"company_id": row["company_id"]})
    assert {i["slug"] for i in res.json()["data"]} == {row["slug"]}


# ---------- Categories / Industries / Regions ----------

@pytest.mark.asyncio
async def test_categories_active_only_and_counts(client):
    inactive = JobCategory(name=f"InactiveCat {_suffix()}", slug=f"inactive-cat-{_suffix()}", is_active=False)
    await _seed_job(category=inactive)
    cat = JobCategory(name=f"CountCat {_suffix()}", slug=f"count-cat-{_suffix()}", is_active=True)
    await _seed_job(category=cat)
    await _seed_job(category=cat)
    await _seed_job(category=cat, status=JobStatus.PAUSED)

    res = await client.get("/api/v1/categories", params={"limit": 500})
    assert res.status_code == 200
    rows = res.json()["data"]
    assert not any(r["slug"] == inactive.slug for r in rows)
    target = next(r for r in rows if r["slug"] == cat.slug)
    assert target["active_jobs_count"] == 2


@pytest.mark.asyncio
async def test_industries_endpoint(client):
    ind = Industry(name=f"IndAct {_suffix()}", slug=f"ind-act-{_suffix()}", is_active=True)
    await _seed_job(industry=ind)
    res = await client.get("/api/v1/industries", params={"limit": 500})
    assert res.status_code == 200
    rows = res.json()["data"]
    target = next((r for r in rows if r["slug"] == ind.slug), None)
    assert target is not None
    assert target["active_jobs_count"] == 1


@pytest.mark.asyncio
async def test_regions_endpoint(client):
    reg = Region(name=f"RegAct {_suffix()}", slug=f"reg-act-{_suffix()}", country="AZ", is_active=True)
    await _seed_job(region=reg)
    res = await client.get("/api/v1/regions", params={"limit": 500})
    assert res.status_code == 200
    rows = res.json()["data"]
    target = next((r for r in rows if r["slug"] == reg.slug), None)
    assert target is not None
    assert target["active_jobs_count"] == 1