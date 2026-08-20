"""
Public marketplace API for Joblane.

All endpoints are read-only and require no authentication.
Only publicly visible content is served.
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.public import service
from app.public.schemas import (
    CategoryListResponse,
    CompanyListResponse,
    IndustryListResponse,
    JobListResponse,
    PublicCategory,
    PublicCompanyDetail,
    PublicIndustry,
    PublicJobDetail,
    PublicRegion,
    RegionListResponse,
)

router = APIRouter(prefix="/api/v1", tags=["public-marketplace"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    db: DbDep,
    q: Optional[str] = Query(None, max_length=200),
    keyword: Optional[str] = Query(None, max_length=200, deprecated=True),
    location: Optional[str] = Query(None, max_length=255),
    region: Optional[str] = Query(None, max_length=255),
    region_id: Optional[UUID] = None,
    category: Optional[str] = Query(None, max_length=255),
    category_id: Optional[UUID] = None,
    industry: Optional[str] = Query(None, max_length=255),
    industry_id: Optional[UUID] = None,
    employment_type: Optional[str] = Query(None, max_length=50),
    work_mode: Optional[str] = Query(None, max_length=50),
    experience_level: Optional[str] = Query(None, max_length=50),
    salary_min: Optional[float] = Query(None, ge=0),
    salary_max: Optional[float] = Query(None, ge=0),
    premium: Optional[bool] = None,
    featured: Optional[bool] = None,
    urgent: Optional[bool] = None,
    company: Optional[str] = Query(None, max_length=255),
    company_id: Optional[UUID] = None,
    sort: Optional[str] = Query(None, max_length=50),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> JobListResponse:
    search = q or keyword
    items, total = await service.list_jobs(
        db,
        q=search,
        location=location,
        region=region,
        region_id=region_id,
        category=category,
        category_id=category_id,
        industry=industry,
        industry_id=industry_id,
        employment_type=employment_type,
        work_mode=work_mode,
        experience_level=experience_level,
        salary_min=salary_min,
        salary_max=salary_max,
        premium=premium,
        featured=featured,
        urgent=urgent,
        company=company,
        company_id=company_id,
        sort=sort,
        page=page,
        limit=limit,
    )
    return JobListResponse(
        data=[service.job_to_public(j) for j in items],
        meta=service.pagination_meta(total, page, limit),
    )


@router.get("/jobs/{slug}/related", response_model=JobListResponse)
async def get_related_jobs(
    db: DbDep,
    slug: str,
    limit: int = Query(4, ge=1, le=20),
) -> JobListResponse:
    items = await service.list_related_jobs(db, slug, limit)
    return JobListResponse(
        data=[service.job_to_public(j) for j in items],
        meta=service.pagination_meta(len(items), 1, limit),
    )


@router.get("/jobs/{slug}", response_model=PublicJobDetail)
async def get_job(db: DbDep, slug: str) -> PublicJobDetail:
    job = await service.get_public_job(db, slug)
    if not job:
        raise HTTPException(status_code=404, detail="Vakansiya tapılmadı")
    count = await service.get_company_active_jobs_count(db, job.company_id)
    return service.job_to_public_detail(job, count)


@router.get("/companies", response_model=CompanyListResponse)
async def list_companies(
    db: DbDep,
    q: Optional[str] = Query(None, max_length=200),
    location: Optional[str] = Query(None, max_length=255),
    industry: Optional[str] = Query(None, max_length=255),
    industry_id: Optional[UUID] = None,
    verified: Optional[bool] = None,
    sort: Optional[str] = Query(None, max_length=50),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> CompanyListResponse:
    rows, total = await service.list_companies(
        db,
        q=q,
        location=location,
        industry=industry,
        industry_id=industry_id,
        verified=verified,
        sort=sort,
        page=page,
        limit=limit,
    )
    data = []
    for company, count in rows:
        item = service.company_to_public(company)
        item.active_jobs_count = count
        data.append(item)
    return CompanyListResponse(
        data=data,
        meta=service.pagination_meta(total, page, limit),
    )


@router.get("/companies/{slug}", response_model=PublicCompanyDetail)
async def get_company(db: DbDep, slug: str) -> PublicCompanyDetail:
    company = await service.get_public_company(db, slug)
    if not company:
        raise HTTPException(status_code=404, detail="Şirkət tapılmadı")
    count = await service.get_company_active_jobs_count(db, company.id)
    item = service.company_to_public(company)
    item.active_jobs_count = count
    return PublicCompanyDetail(
        **item.model_dump(),
        socials=company.socials or None,
    )


@router.get("/categories", response_model=CategoryListResponse)
async def list_categories(
    db: DbDep,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
) -> CategoryListResponse:
    rows, total = await service.list_categories(db, page, limit)
    return CategoryListResponse(
        data=[
            PublicCategory(
                id=c.id,
                name=c.name,
                slug=c.slug,
                icon=c.icon,
                description=c.description,
                active_jobs_count=count,
            )
            for c, count in rows
        ],
        meta=service.pagination_meta(total, page, limit),
    )


@router.get("/industries", response_model=IndustryListResponse)
async def list_industries(
    db: DbDep,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
) -> IndustryListResponse:
    rows, total = await service.list_industries(db, page, limit)
    return IndustryListResponse(
        data=[
            PublicIndustry(
                id=i.id,
                name=i.name,
                slug=i.slug,
                description=i.description,
                active_jobs_count=count,
            )
            for i, count in rows
        ],
        meta=service.pagination_meta(total, page, limit),
    )


@router.get("/regions", response_model=RegionListResponse)
async def list_regions(
    db: DbDep,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
) -> RegionListResponse:
    rows, total = await service.list_regions(db, page, limit)
    return RegionListResponse(
        data=[
            PublicRegion(
                id=r.id,
                name=r.name,
                slug=r.slug,
                country=r.country,
                city=r.city,
                active_jobs_count=count,
            )
            for r, count in rows
        ],
        meta=service.pagination_meta(total, page, limit),
    )