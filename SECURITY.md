# Security Policy

## Supported Versions

Currently supported versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

I take security seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

**Please do NOT create a public GitHub issue for security vulnerabilities.**

Instead, please report security vulnerabilities by:

1. **Email**: Send details to [dagsmagalona@gmail.com](mailto:dagsmagalona@gmail.com)
2. **Subject Line**: Include "SECURITY" in the subject line
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Status Updates**: Regular updates on progress
- **Resolution**: Fix deployed as soon as possible

### Disclosure Policy

- Security vulnerabilities will be disclosed after a fix is deployed
- Credit will be given to the reporter (unless they wish to remain anonymous)
- Timeline for disclosure will be communicated with the reporter

## Security Measures in Place

### Content Security Policy (CSP)
- Strict CSP headers configured in `vercel.json`
- CSP violation reporting to `/api/csp-report`
- No inline scripts except explicitly allowed

### Security Headers
- `Strict-Transport-Security`: Enforces HTTPS
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `Referrer-Policy`: Controls referrer information
- `Permissions-Policy`: Restricts browser features

### Input Sanitization
- All user inputs sanitized before rendering
- XSS prevention mechanisms in place
- Safe external link handling

### Dependency Security
- Regular dependency updates via Dependabot
- Automated vulnerability scanning
- npm audit run on CI/CD pipeline

### API Security
- Rate limiting on API endpoints
- CORS configuration
- API key rotation recommended every 90 days

## Best Practices for Contributors

When contributing to this project:

1. **Never commit secrets** (API keys, tokens, credentials)
2. **Use environment variables** for sensitive data
3. **Validate all inputs** on both client and server
4. **Keep dependencies updated**
5. **Follow secure coding practices**
6. **Review security implications** of your changes

## Security Checklist for PRs

- [ ] No hardcoded secrets or credentials
- [ ] Input validation implemented
- [ ] Output properly sanitized/escaped
- [ ] Dependencies are up to date
- [ ] No new security warnings from linters
- [ ] CSP compatible (no inline scripts/styles without review)
- [ ] Accessibility maintained (prevents UI-based attacks)

## Automated Security Tools

This project uses:
- **GitHub Dependabot**: Automated dependency updates
- **npm audit**: Vulnerability scanning
- **ESLint security plugins**: Static analysis
- **Lighthouse**: Security best practices audit

## Contact

For any security-related questions or concerns:
- Email: [dagsmagalona@gmail.com](mailto:dagsmagalona@gmail.com)
- GitHub: [@adr1el-m](https://github.com/adr1el-m)

---

Thank you for helping keep this project secure! 🔒
