#!/usr/bin/env python3
"""
Content Security Policy Configuration
Centralized CSP configuration for the portfolio
"""

# Content Security Policy configuration
CSP_POLICY = {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline' https://generativelanguage.googleapis.com",
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: https: blob:",
    'connect-src': "'self' https://generativelanguage.googleapis.com",
    'font-src': "'self' data:",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'frame-ancestors': "'none'",
    'upgrade-insecure-requests': None,  # Directive without value
    'block-all-mixed-content': None,   # Directive without value
}

def get_csp_header():
    """Generate CSP header string from configuration"""
    directives = []
    
    for directive, value in CSP_POLICY.items():
        if value is None:
            # Directive without value (like upgrade-insecure-requests)
            directives.append(directive)
        else:
            directives.append(f"{directive} {value}")
    
    return '; '.join(directives)

def get_security_headers():
    """Get all security headers"""
    return {
        'Content-Security-Policy': get_csp_header(),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    }

# For HTML meta tag
def get_csp_meta_tag():
    """Get CSP meta tag for HTML"""
    return f'<meta http-equiv="Content-Security-Policy" content="{get_csp_header()}">'

if __name__ == "__main__":
    print("CSP Policy:")
    print(get_csp_header())
    print("\nSecurity Headers:")
    for header, value in get_security_headers().items():
        print(f"{header}: {value}")
