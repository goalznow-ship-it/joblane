"""
Role-based access control for the Joblane admin panel.

Defines admin roles and the permission matrix.
Server-side enforcement only - the frontend never decides authorization.
"""

import enum


class AdminRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    MODERATOR = "MODERATOR"
    CONTENT_MANAGER = "CONTENT_MANAGER"
    AD_MANAGER = "AD_MANAGER"
    SUPPORT = "SUPPORT"
    FINANCE_VIEWER = "FINANCE_VIEWER"


class Permission:
    DASHBOARD_VIEW = "dashboard.view"
    JOBS_VIEW = "jobs.view"
    JOBS_MODERATE = "jobs.moderate"
    JOBS_PUBLISH = "jobs.publish"
    JOBS_PROMOTE = "jobs.promote"
    JOBS_EDIT = "jobs.edit"
    JOBS_DELETE = "jobs.delete"
    COMPANIES_VIEW = "companies.view"
    COMPANIES_MANAGE = "companies.manage"
    COMPANIES_VERIFY = "companies.verify"
    USERS_VIEW = "users.view"
    USERS_MANAGE = "users.manage"
    CATEGORIES_MANAGE = "categories.manage"
    REGIONS_MANAGE = "regions.manage"
    INDUSTRIES_MANAGE = "industries.manage"
    TRAININGS_MANAGE = "trainings.manage"
    INTERNSHIPS_MANAGE = "internships.manage"
    ADS_MANAGE = "ads.manage"
    ADS_VIEW = "ads.view"
    PAYMENTS_VIEW = "payments.view"
    PAYMENTS_MANAGE = "payments.manage"
    REPORTS_MANAGE = "reports.manage"
    AUDIT_VIEW = "audit.view"
    ADMINS_MANAGE = "admins.manage"
    SETTINGS_MANAGE = "settings.manage"

    ALL = {
        DASHBOARD_VIEW,
        JOBS_VIEW,
        JOBS_MODERATE,
        JOBS_PUBLISH,
        JOBS_PROMOTE,
        JOBS_EDIT,
        JOBS_DELETE,
        COMPANIES_VIEW,
        COMPANIES_MANAGE,
        COMPANIES_VERIFY,
        USERS_VIEW,
        USERS_MANAGE,
        CATEGORIES_MANAGE,
        REGIONS_MANAGE,
        INDUSTRIES_MANAGE,
        TRAININGS_MANAGE,
        INTERNSHIPS_MANAGE,
        ADS_MANAGE,
        ADS_VIEW,
        PAYMENTS_VIEW,
        PAYMENTS_MANAGE,
        REPORTS_MANAGE,
        AUDIT_VIEW,
        ADMINS_MANAGE,
        SETTINGS_MANAGE,
    }


ROLE_PERMISSIONS: dict[AdminRole, set[str]] = {
    AdminRole.SUPER_ADMIN: Permission.ALL,
    AdminRole.ADMIN: Permission.ALL - {Permission.ADMINS_MANAGE, Permission.SETTINGS_MANAGE},    AdminRole.MODERATOR: {
        Permission.DASHBOARD_VIEW,
        Permission.JOBS_VIEW,
        Permission.JOBS_MODERATE,
        Permission.JOBS_PUBLISH,
        Permission.JOBS_EDIT,
        Permission.COMPANIES_VIEW,
        Permission.COMPANIES_VERIFY,
        Permission.USERS_VIEW,
        Permission.AUDIT_VIEW,
    },
    AdminRole.CONTENT_MANAGER: {
        Permission.DASHBOARD_VIEW,
        Permission.JOBS_VIEW,
        Permission.CATEGORIES_MANAGE,
        Permission.REGIONS_MANAGE,
        Permission.INDUSTRIES_MANAGE,
        Permission.TRAININGS_MANAGE,
        Permission.INTERNSHIPS_MANAGE,
    },
    AdminRole.AD_MANAGER: {
        Permission.DASHBOARD_VIEW,
        Permission.JOBS_VIEW,
        Permission.ADS_MANAGE,
        Permission.ADS_VIEW,
    },
    AdminRole.SUPPORT: {
        Permission.DASHBOARD_VIEW,
        Permission.USERS_VIEW,
        Permission.USERS_MANAGE,
        Permission.COMPANIES_VIEW,
        Permission.REPORTS_MANAGE,
    },
    AdminRole.FINANCE_VIEWER: {
        Permission.DASHBOARD_VIEW,
        Permission.PAYMENTS_VIEW,
    },
}


def role_permissions(role: str) -> set[str]:
    """Return the permission set for a role string (or USER)."""
    try:
        return ROLE_PERMISSIONS[AdminRole(role)]
    except (ValueError, KeyError):
        return set()


def has_permission(role: str, permission: str) -> bool:
    """Check whether a role grants a permission."""
    return permission in role_permissions(role)


def is_admin_role(role: str) -> bool:
    """Whether the role is one of the admin roles."""
    try:
        AdminRole(role)
        return True
    except ValueError:
        return False
