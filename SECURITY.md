# Security Policy

OfflineMate handles personal assistant data and is designed for privacy-first, on-device execution.

## Supported Security Posture

Until versioning is formalized, the latest default branch is considered supported.

## Reporting a Vulnerability

Please report vulnerabilities privately to the project maintainers through internal channels.
Do not disclose security issues publicly before triage and remediation.

Include:

- Affected component(s)
- Reproduction steps
- Expected vs actual behavior
- Impact assessment
- Suggested mitigation (if available)

## Security Principles

- Local-first data processing
- Least privilege for OS permissions
- Defense in depth for model/tool execution boundaries
- Secure defaults for storage and runtime behavior

## Planned Security Controls

- Secrets scanning in CI
- Dependency vulnerability scanning
- Static analysis/linting checks
- Release signing checks for Android builds
- Permission minimization review per release

## Mobile-Specific Considerations

- Encrypt sensitive local data at rest where feasible
- Avoid logging sensitive prompts and personal data
- Validate tool input/output boundaries
- Guard against prompt injection from local documents and notes
- Limit tool execution scope to approved capabilities

## Incident Response (Planned)

- Triage severity within one business day
- Contain and patch critical issues first
- Publish internal postmortem and remediation items
