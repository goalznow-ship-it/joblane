"""
Employer role-based permissions.

Defines employer roles and the permission matrix for company-scoped
operations. Server-side enforcement only - the frontend never decides
authorization.

Roles mirror the CompanyMembership.role column:
- OWNER: full control of the company (profile, jobs, applications, team).
- ADMIN: same as OWNER for V1 (team management included).
- RECRUITER: manage jobs and applications; cannot edit company profile.
- VIEWER: read-only access to company data.
"""

import enum


class EmployerRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    RECRUITER = "RECRUITER"
    VIEWER = "VIEWER"


class EmployerPermission:
    COMPANY_READ = "employer.company.read"
    COMPANY_WRITE = "employer.company.write"
    TEAM_MANAGE = "employer.team.manage"
    JOBS_READ = "employer.jobs.read"
    JOBS_WRITE = "employer.jobs.write"
    JOBS_SUBMIT = "employer.jobs.submit"
    JOBS_PAUSE = "employer.jobs.pause"
    JOBS_ARCHIVE = "employer.jobs.archive"
    APPLICATIONS_READ = "employer.applications.read"
    APPLICATIONS_WRITE = "employer.applications.write"
    BILLING_READ = "employer.billing.read"
    BILLING_MANAGE = "employer.billing.manage"

    ALL = {
        COMPANY_READ,
        COMPANY_WRITE,
        TEAM_MANAGE,
        JOBS_READ,
        JOBS_WRITE,
        JOBS_SUBMIT,
        JOBS_PAUSE,
        JOBS_ARCHIVE,
        APPLICATIONS_READ,
        APPLICATIONS_WRITE,
        BILLING_READ,
        BILLING_MANAGE,
    }


EMPLOYER_ROLE_PERMISSIONS: dict[EmployerRole, set[str]] = {
    EmployerRole.OWNER: EmployerPermission.ALL,
    EmployerRole.ADMIN: EmployerPermission.ALL,
    EmployerRole.RECRUITER: {
        EmployerPermission.COMPANY_READ,
        EmployerPermission.JOBS_READ,
        EmployerPermission.JOBS_WRITE,
        EmployerPermission.JOBS_SUBMIT,
        EmployerPermission.JOBS_PAUSE,
        EmployerPermission.JOBS_ARCHIVE,
        EmployerPermission.APPLICATIONS_READ,
        EmployerPermission.APPLICATIONS_WRITE,
    },
    EmployerRole.    VIEWER: {
        EmployerPermission.COMPANY_READ,
        EmployerPermission.JOBS_READ,
        EmployerPermission.APPLICATIONS_READ,
    },
}

# Billing is restricted to OWNER/ADMIN. RECRUITER may consume already-granted
# promotion credits for own-company jobs (via jobs.write), but cannot
# administer payments/subscriptions. VIEWER has no billing access.
BILLING_ROLES = {EmployerRole.OWNER, EmployerRole.ADMIN}


def employer_role_permissions(role: str) -> set[str]:
    """Return the permission set for an employer role string."""
    try:
        return EMPLOYER_ROLE_PERMISSIONS[EmployerRole(role)]
    except (ValueError, KeyError):
        return set()


def has_employer_permission(role: str, permission: str) -> bool:
    """Check whether an employer role grants a permission."""
    return permission in employer_role_permissions(role)


def has_billing_permission(role: str, permission: str) -> bool:
    """
    Billing permission check. BILLING_READ/BILLING_MANAGE are only granted
    to OWNER and ADMIN roles regardless of the generic matrix.
    """
    if permission not in (EmployerPermission.BILLING_READ, EmployerPermission.BILLING_MANAGE):
        return has_employer_permission(role, permission)
    try:
        return EmployerRole(role) in BILLING_ROLES
    except ValueError:
        return False