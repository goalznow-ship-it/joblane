"""
Employer portal package.

Endpoints live under /api/v1/employer and are protected by the same
session + CSRF authentication used across Joblane. A user becomes an
employer by creating a company, which grants them an OWNER membership.
"""