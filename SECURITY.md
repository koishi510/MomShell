# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in MomShell, please report it responsibly.

### How to Report

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **GitHub Security Advisories (Preferred)**
   [Report a vulnerability](https://github.com/koishi510/MomShell/security/advisories/new)

2. **Email**
   Contact the maintainers directly (see repository maintainer profiles)

### What to Include

Please include the following information in your report:

- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Affected component (Soulful Companion, Recovery Coach, Community, API, etc.)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Potential impact of the vulnerability
- Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: We will investigate and assess the severity of the issue
- **Updates**: We will keep you informed of our progress
- **Resolution**: We aim to resolve critical vulnerabilities promptly
- **Credit**: We will credit you in our release notes (unless you prefer to remain anonymous)

### Security Best Practices for Deployment

When deploying MomShell, please ensure:

1. **Environment Variables**
   - Never commit `.env` files or API keys to version control
   - Use secure secret management for `MODELSCOPE_SDK_TOKEN`
   - Rotate API keys periodically

2. **Network Security**
   - Use HTTPS in production (configure SSL/TLS in nginx)
   - Restrict API access to trusted origins (CORS configuration)
   - Use firewalls to limit exposed ports

3. **Database Security**
   - Use strong, unique passwords for database access
   - Regularly backup database files
   - Restrict file permissions on SQLite database files

4. **Docker Security**
   - Keep base images updated
   - Don't run containers as root in production
   - Use Docker secrets for sensitive data

5. **Content Moderation**
   - Review and customize sensitive content filters for your deployment
   - Monitor flagged content regularly
   - Ensure crisis intervention workflows are properly configured

## Scope

The following are in scope for security reports:

- Authentication and authorization vulnerabilities
- Data exposure or leakage
- Injection attacks (SQL, command, etc.)
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Insecure direct object references
- Security misconfigurations in default settings
- Vulnerabilities in dependencies

The following are **out of scope**:

- Denial of service (DoS) attacks
- Social engineering attacks
- Physical security issues
- Issues in third-party services (ModelScope API, etc.)
- Issues requiring physical access to the server

## Acknowledgments

We thank all security researchers who help keep MomShell and its users safe.
