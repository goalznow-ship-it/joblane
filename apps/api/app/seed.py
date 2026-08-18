"""
Development seed data for the Joblane admin panel.

Creates admin users, categories, regions, companies, jobs (mirroring the
public marketplace fixtures with varied moderation states), and sample
advertisement records.

Idempotent: safe to run multiple times.
"""

import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, Base, engine
from app.core.config import settings
from app.auth.models import User, UserStatus
from app.auth.security import get_password_hash
from app.admin.models import (
    Company,
    CompanyStatus,
    JobCategory,
    Region,
    Job,
    JobStatus,
    EmploymentType,
    WorkMode,
    Advertisement,
    AdStatus,
    AdPlacement,
    AdFormat,
)

NOW = datetime.now(timezone.utc)

CATEGORIES = [
    ("Maliyyə və Mühasibatlıq", "maliyye-ve-muhasibatliq", "calculator", "Maliyyə, mühasibatlıq və audit sahələri"),
    ("Satış və Müştəri Xidməti", "satis-ve-musteri-xidmeti", "shopping-bag", "Satış və müştəri xidməti vəzifələri"),
    ("İnformasiya Texnologiyaları", "informasiya-texnologiyalari", "monitor", "İT və proqramlaşdırma sahələri"),
    ("İnzibati Heyət", "inzibati-heyet", "briefcase", "İnzibati və ofis vəzifələri"),
    ("Marketinq və PR", "marketinq-ve-pr", "megaphone", "Marketinq, PR və kommunikasiya"),
    ("Mühəndislik", "muhendislik", "cog", "Mühəndislik və texniki vəzifələr"),
    ("Logistika", "logistika", "truck", "Logistika və təchizat zənciri"),
    ("İnsan Resursları", "insan-resurslari", "users", "HR və kadr idarəetməsi"),
    ("Təhsil", "tehsil", "graduation-cap", "Təhsil və tədris sahələri"),
    ("Hüquq", "huquq", "scale", "Hüquq və qanun sahələri"),
]

REGIONS = [
    ("Bakı", "baki", "Azərbaycan", "Bakı"),
    ("Gəncə", "gence", "Azərbaycan", "Gəncə"),
    ("Sumqayıt", "sumqayit", "Azərbaycan", "Sumqayıt"),
    ("Şəki", "seki", "Azərbaycan", "Şəki"),
    ("Quba", "quba", "Azərbaycan", "Quba"),
    ("Lənkəran", "lenkeran", "Azərbaycan", "Lənkəran"),
]

COMPANIES = [
    ("PASHA Bank", "pasha-bank", "Bankçılıq və Maliyyə", "https://pashabank.az", "info@pashabank.az", "Bakı", True),
    ("Azercell Telecom", "azercell-telecom", "Telekommunikasiya", "https://azercell.com", "hr@azercell.com", "Bakı", True),
    ("SOCAR", "socar", "Energetika", "https://socar.az", "hr@socar.az", "Bakı", True),
    ("Kapital Bank", "kapital-bank", "Bankçılıq və Maliyyə", "https://kapitalbank.az", "hr@kapitalbank.az", "Bakı", True),
    ("Baku Electronics", "baku-electronics", "Elektronika və Pərakəndə", "https://bakuelectronics.az", "hr@bakuelectronics.az", "Bakı", False),
    ("Bakcell", "bakcell", "Telekommunikasiya", "https://bakcell.com", "hr@bakcell.com", "Bakı", True),
    ("Nar Mobile", "nar-mobile", "Telekommunikasiya", "https://nar.az", "hr@nar.az", "Bakı", True),
    ("Unibank", "unibank", "Bankçılıq və Maliyyə", "https://unibank.az", "hr@unibank.az", "Bakı", True),
    ("PASHA Technology", "pasha-technology", "İnformasiya Texnologiyaları", "https://pashatech.com", "hr@pashatech.com", "Bakı", True),
    ("Azerconnect", "azerconnect", "İnformasiya Texnologiyaları", "https://azerconnect.az", "hr@azerconnect.az", "Bakı", False),
    ("Kontakt Home", "kontakt-home", "Elektronika və Pərakəndə", "https://kontakt.az", "hr@kontakt.az", "Bakı", False),
    ("Bravo", "bravo", "Turizm və Restoran", "https://bravo.az", "hr@bravo.az", "Bakı", False),
    ("ABB", "abb-bank", "Bankçılıq və Maliyyə", "https://abb-bank.az", "hr@abb-bank.az", "Bakı", True),
    ("PASHA Holding", "pasha-holding", "Holding", "https://pashaholding.com", "hr@pashaholding.com", "Bakı", True),
]

# (title, company, category, employment, work_mode, salary_min, salary_max, location, experience)
JOBS = [
    ("SOC Analyst", 0, 2, "FULL_TIME", "HYBRID", 1200, 1800, "Bakı", "Orta"),
    ("Senior Backend Developer (Node.js/TypeScript)", 8, 2, "FULL_TIME", "REMOTE", 2500, 3500, "Bakı", "Yüksək"),
    ("Maliyyə Analitikləri (Financial Analyst)", 0, 0, "FULL_TIME", "ON_SITE", 1500, 2000, "Bakı", "Orta"),
    ("Satış Meneceri (B2B)", 4, 1, "FULL_TIME", "ON_SITE", 800, 1200, "Bakı", "Giriş"),
    ("HR Meneceri", 1, 7, "FULL_TIME", "ON_SITE", 1400, 1900, "Bakı", "Orta"),
    ("DevOps Engineer", 8, 2, "FULL_TIME", "HYBRID", 2200, 3200, "Bakı", "Yüksək"),
    ("Marketinq Mütəxəssisi (Digital Marketing)", 6, 4, "FULL_TIME", "HYBRID", 900, 1300, "Bakı", "Orta"),
    ("Mühəndis - Tikinti Nəzarəti", 2, 5, "FULL_TIME", "ON_SITE", 1100, 1600, "Gəncə", "Orta"),
    ("Junior Frontend Developer (React)", 8, 2, "FULL_TIME", "HYBRID", 700, 1000, "Bakı", "Giriş"),
    ("Müşahidəçi Avukat (Corporate Lawyer)", 0, 9, "FULL_TIME", "ON_SITE", 1800, 2400, "Bakı", "Yüksək"),
    ("Frontend Developer (React)", 9, 2, "FULL_TIME", "HYBRID", 1500, 2200, "Bakı", "Orta"),
    ("Mühasib (Baş ofis)", 3, 0, "FULL_TIME", "ON_SITE", 1000, 1400, "Bakı", "Orta"),
    ("HR Specialist", 7, 7, "FULL_TIME", "ON_SITE", 800, 1100, "Bakı", "Giriş"),
    ("Procurement Specialist", 13, 9, "FULL_TIME", "ON_SITE", 1200, 1700, "Bakı", "Orta"),
    ("Project Manager", 8, 2, "FULL_TIME", "HYBRID", 1800, 2500, "Bakı", "Yüksək"),
    ("Data Analyst", 5, 2, "FULL_TIME", "HYBRID", 1300, 1800, "Bakı", "Orta"),
    ("Call Center Specialist", 6, 1, "FULL_TIME", "ON_SITE", 600, 900, "Bakı", "Giriş"),
    ("Sürücü (Korporativ)", 1, 6, "FULL_TIME", "ON_SITE", 700, 950, "Bakı", "Giriş"),
    ("Qrafik Dizayner", 11, 4, "FULL_TIME", "HYBRID", 900, 1300, "Bakı", "Orta"),
    ("Backend Developer (Python)", 8, 2, "FULL_TIME", "REMOTE", 1600, 2300, "Bakı", "Orta"),
    ("Office Manager", 12, 3, "FULL_TIME", "ON_SITE", 850, 1150, "Bakı", "Orta"),
    ("Logistics Specialist", 4, 6, "FULL_TIME", "ON_SITE", 950, 1350, "Sumqayıt", "Orta"),
    ("Customer Support Specialist", 5, 1, "FULL_TIME", "HYBRID", 650, 950, "Bakı", "Giriş"),
    ("İqtisadçı", 3, 0, "FULL_TIME", "ON_SITE", 1100, 1500, "Bakı", "Orta"),
    ("Korporativ Satış Meneceri", 10, 1, "FULL_TIME", "ON_SITE", 900, 1400, "Bakı", "Orta"),
    ("Network Engineer", 5, 2, "FULL_TIME", "ON_SITE", 1500, 2100, "Bakı", "Yüksək"),
    ("Receptionist", 11, 3, "FULL_TIME", "ON_SITE", 550, 800, "Bakı", "Giriş"),
    ("SaaS Account Manager", 9, 1, "FULL_TIME", "HYBRID", 1300, 1900, "Bakı", "Orta"),
    ("Təhlükəsizlik Mütəxəssisi", 3, 2, "FULL_TIME", "ON_SITE", 1400, 2000, "Bakı", "Yüksək"),
    ("Elektrik Mühəndisi", 2, 5, "FULL_TIME", "ON_SITE", 1200, 1700, "Gəncə", "Orta"),
    ("QA Engineer", 8, 2, "FULL_TIME", "HYBRID", 1100, 1600, "Bakı", "Orta"),
    ("Marketing Specialist", 6, 4, "PART_TIME", "REMOTE", 700, 1000, "Bakı", "Giriş"),
]

ADS = [
    {
        "advertiser_name": "Kapital Bank",
        "campaign_name": "2026 Qış kampaniyası",
        "industry": "Bankçılıq və Maliyyə",
        "headline": "Kreditlərə xüsusi şərtlər",
        "description": "Onlayn müraciət — tez baxış, rahat şərtlər",
        "cta_label": "Müraciət et",
        "destination_url": "https://kapitalbank.az",
        "alt_text": "Kapital Bank reklamı",
        "placement": AdPlacement.TOP_LEADERBOARD,
        "format": AdFormat.FORMAT_970x90,
        "background": "navy",
        "accent_color": "#F59E0B",
        "start_at": NOW - timedelta(days=10),
        "end_at": NOW + timedelta(days=50),
        "priority": 10,
        "status": AdStatus.ACTIVE,
    },
    {
        "advertiser_name": "Nova Mobile",
        "campaign_name": "Yeni nəsil texnologiya",
        "industry": "Elektronika",
        "headline": "Yeni nəsil texnologiya",
        "description": "Smartfon və aksesuarları sərfəli qiymətlərlə kəşf et",
        "cta_label": "Məhsullara bax",
        "destination_url": "https://example.com/nova-mobile",
        "alt_text": "Nova Mobile smartfon reklamı",
        "placement": AdPlacement.LEFT_SKIN,
        "format": AdFormat.FORMAT_160x600,
        "background": "navy",
        "accent_color": "#2DD4BF",
        "start_at": NOW - timedelta(days=5),
        "end_at": NOW + timedelta(days=25),
        "priority": 5,
        "status": AdStatus.ACTIVE,
    },
    {
        "advertiser_name": "Caspian Travel",
        "campaign_name": "Növbəti səfərini planla",
        "industry": "Turizm",
        "headline": "Növbəti səfərini planla",
        "description": "Seçilmiş istiqamətlərə xüsusi təkliflər",
        "cta_label": "Təkliflərə bax",
        "destination_url": "https://example.com/caspian-travel",
        "alt_text": "Caspian Travel səyahət reklamı",
        "placement": AdPlacement.RIGHT_SKIN,
        "format": AdFormat.FORMAT_160x600,
        "background": "teal",
        "accent_color": "#FBBF24",
        "start_at": NOW - timedelta(days=5),
        "end_at": NOW + timedelta(days=25),
        "priority": 5,
        "status": AdStatus.ACTIVE,
    },
    {
        "advertiser_name": "Qala Sigorta",
        "campaign_name": "Sidebar 300x250",
        "industry": "Sığorta",
        "headline": "Hərtərəfli sığorta həlli",
        "description": "Nəqliyyat və daşınmaz əmlak sığortası",
        "cta_label": "Ətraflı",
        "destination_url": "https://example.com/qala",
        "alt_text": "Qala Sigorta reklamı",
        "placement": AdPlacement.RIGHT_SIDEBAR,
        "format": AdFormat.FORMAT_300x250,
        "background": "blue",
        "accent_color": "#FBBF24",
        "start_at": NOW - timedelta(days=2),
        "end_at": NOW + timedelta(days=28),
        "priority": 3,
        "status": AdStatus.ACTIVE,
    },
    {
        "advertiser_name": "Azertel",
        "campaign_name": "Inline 728x90",
        "industry": "Telekommunikasiya",
        "headline": "Ev üçün sürətli internet",
        "description": "Azərbaycanın ən sürətli ev interneti",
        "cta_label": "Sifariş et",
        "destination_url": "https://example.com/azertel",
        "alt_text": "Azertel reklamı",
        "placement": AdPlacement.INLINE_FEED,
        "format": AdFormat.FORMAT_728x90,
        "background": "slate",
        "accent_color": "#38BDF8",
        "start_at": NOW + timedelta(days=3),
        "end_at": NOW + timedelta(days=30),
        "priority": 2,
        "status": AdStatus.SCHEDULED,
    },
]


def slugify(name: str) -> str:
    import re

    s = name.lower().replace("ə", "e").replace("ö", "o").replace("ü", "u").replace("ı", "i")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def make_job_slug(title: str, company_name: str) -> str:
    base = slugify(title)
    suffix = slugify(company_name)
    return f"{base}-{suffix}"[:240]


async def seed(session: AsyncSession) -> None:
    existing = (await session.execute(select(func.count()).select_from(Company))).scalar() or 0
    if existing > 0:
        print("Seed skipped: companies already exist.")
        return

    # Admin credentials come from the environment only (never from source).
    admin_email = (os.getenv("ADMIN_SEED_EMAIL") or "").strip() or "admin@joblane.az"
    admin_password = os.getenv("ADMIN_SEED_PASSWORD") or ""
    if not admin_password:
        print(
            "Seed skipped: ADMIN_SEED_PASSWORD is not set. "
            "Set it in the environment to seed admin users."
        )
        return

    # Admin users
    password_hash = get_password_hash(admin_password)
    users = [
        User(
            email=admin_email,
            email_normalized=admin_email.lower(),
            password_hash=password_hash,
            full_name="Super Admin",
            role="SUPER_ADMIN",
            status=UserStatus.ACTIVE,
            email_verified_at=NOW,
        ),
        User(
            email="moderator@joblane.az",
            email_normalized="moderator@joblane.az",
            password_hash=password_hash,
            full_name="Məzun Moderası",
            role="MODERATOR",
            status=UserStatus.ACTIVE,
            email_verified_at=NOW,
        ),
        User(
            email="admanager@joblane.az",
            email_normalized="admanager@joblane.az",
            password_hash=password_hash,
            full_name="Reklam Meneceri",
            role="AD_MANAGER",
            status=UserStatus.ACTIVE,
            email_verified_at=NOW,
        ),
        User(
            email="candidate@joblane.az",
            email_normalized="candidate@joblane.az",
            password_hash=password_hash,
            full_name="Nümunə İstifadəçi",
            role="USER",
            status=UserStatus.ACTIVE,
            email_verified_at=NOW,
        ),
    ]
    session.add_all(users)
    await session.flush()
    admin_user = users[0]

    categories = []
    for i, (name, slug, icon, desc) in enumerate(CATEGORIES):
        cat = JobCategory(name=name, slug=slug, icon=icon, description=desc, sort_order=i, is_active=True)
        session.add(cat)
        categories.append(cat)
    await session.flush()

    regions = []
    for i, (name, slug, country, city) in enumerate(REGIONS):
        reg = Region(name=name, slug=slug, country=country, city=city, sort_order=i, is_active=True)
        session.add(reg)
        regions.append(reg)
    await session.flush()

    companies = []
    for i, (name, slug, industry, website, email, location, verified) in enumerate(COMPANIES):
        comp = Company(
            name=name,
            slug=slug,
            industry=industry,
            website=website,
            email=email,
            address=location,
            description=f"{name} — Azərbaycanda fəaliyyət göstərən aparıcı şirkət.",
            status=CompanyStatus.VERIFIED if verified else CompanyStatus.PENDING,
            verified_at=NOW if verified else None,
            verified_by=admin_user.id if verified else None,
        )
        session.add(comp)
        companies.append(comp)
    await session.flush()

    statuses = [
        JobStatus.PUBLISHED, JobStatus.PUBLISHED, JobStatus.PUBLISHED, JobStatus.PUBLISHED,
        JobStatus.PUBLISHED, JobStatus.PUBLISHED, JobStatus.PUBLISHED, JobStatus.PUBLISHED,
        JobStatus.PUBLISHED, JobStatus.PUBLISHED, JobStatus.PUBLISHED, JobStatus.PUBLISHED,
        JobStatus.PUBLISHED, JobStatus.PUBLISHED, JobStatus.PUBLISHED, JobStatus.PUBLISHED,
        JobStatus.PENDING_REVIEW, JobStatus.PENDING_REVIEW, JobStatus.PENDING_REVIEW,
        JobStatus.REJECTED, JobStatus.REJECTED,
        JobStatus.EXPIRED, JobStatus.EXPIRED,
        JobStatus.DRAFT, JobStatus.DRAFT, JobStatus.DRAFT,
        JobStatus.PAUSED, JobStatus.PAUSED, JobStatus.PAUSED,
        JobStatus.ARCHIVED, JobStatus.ARCHIVED, JobStatus.APPROVED,
    ]

    for idx, (title, comp_idx, cat_idx, emp, wm, sal_min, sal_max, loc, exp) in enumerate(JOBS):
        company = companies[comp_idx % len(companies)]
        status = statuses[idx % len(statuses)]
        published = NOW - timedelta(days=(idx % 20) + 1)
        is_premium = idx in (0, 1, 2, 3, 5)
        is_featured = idx in (0, 2, 5, 15)
        is_urgent = idx in (1, 3)
        job = Job(
            company_id=company.id,
            title=title,
            slug=make_job_slug(title, company.name),
            description=f"{title} vəzifəsi üçün peşəkar namizəd axtarırıq. Şirkət dinamik komanda və inkişaf imkanları təklif edir.",
            requirements="Ali təhsil; \nİş təcrübəsi; \nAzərbaycan dili bilikləri; \nKomanda işi bacarığı.",
            responsibilities="Vəzifə öhdəliklərinin yerinə yetirilməsi; \nHesabatların hazırlanması; \nKomanda ilə əməkdaşlıq.",
            benefits="Rəsmi işəgötürmə; \nSosial paket; \nPeşəkar inkişaf imkanları.",
            salary_min=sal_min,
            salary_max=sal_max,
            salary_currency="AZN",
            salary_period="MONTH",
            salary_visible=True,
            location=loc,
            region_id=regions[0].id if loc == "Bakı" else regions[1].id,
            category_id=categories[cat_idx % len(categories)].id,
            industry=company.industry,
            employment_type=EmploymentType(emp),
            work_mode=WorkMode(wm),
            experience_level=exp,
            education="Ali təhsil",
            publication_date=published if status == JobStatus.PUBLISHED else None,
            expiration_date=published + timedelta(days=30) if status == JobStatus.PUBLISHED else None,
            status=status,
            moderation_reason="Tələb olunan məlumatlar natamamdır" if status == JobStatus.REJECTED else None,
            moderation_note="Ətraflı təsvir əlavə edilsin" if status == JobStatus.REJECTED else None,
            is_premium=is_premium,
            premium_since=published if is_premium else None,
            premium_until=published + timedelta(days=14) if is_premium else None,
            is_featured=is_featured,
            featured_since=published if is_featured else None,
            featured_until=published + timedelta(days=30) if is_featured else None,
            is_urgent=is_urgent,
            urgent_until=published + timedelta(days=7) if is_urgent else None,
            boost_priority=(idx % 5) * 10,
            views=100 + idx * 137,
            applications_count=idx % 23,
            favorites_count=idx % 9,
            created_by=admin_user.id,
            created_at=published,
        )
        session.add(job)
    await session.flush()

    for ad_data in ADS:
        ad = Advertisement(
            advertiser_name=ad_data["advertiser_name"],
            campaign_name=ad_data["campaign_name"],
            industry=ad_data["industry"],
            headline=ad_data["headline"],
            description=ad_data["description"],
            cta_label=ad_data["cta_label"],
            destination_url=ad_data["destination_url"],
            alt_text=ad_data["alt_text"],
            placement=ad_data["placement"],
            format=ad_data["format"],
            background=ad_data["background"],
            accent_color=ad_data["accent_color"],
            start_at=ad_data["start_at"],
            end_at=ad_data["end_at"],
            priority=ad_data["priority"],
            status=ad_data["status"],
            impressions=1200 + ad_data["priority"] * 500,
            clicks=40 + ad_data["priority"] * 18,
            created_by=admin_user.id,
        )
        session.add(ad)

    await session.commit()
    print(f"Seeded: {len(COMPANIES)} companies, {len(CATEGORIES)} categories, {len(REGIONS)} regions, {len(JOBS)} jobs, {len(ADS)} ads, {len(users)} users.")


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())