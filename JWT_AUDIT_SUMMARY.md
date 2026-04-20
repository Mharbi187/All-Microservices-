# JWT Security Audit — Quick Reference Summary

**Date**: April 15, 2026 | **Scope**: All microservices JWT implementations  
**Full Report**: [JWT_SECURITY_AUDIT_COMPLETE_2026.md](JWT_SECURITY_AUDIT_COMPLETE_2026.md)

---

## Overall Risk Assessment

| Category | Status | Severity |
|----------|--------|----------|
| **Algorithm Implementation** | ✅ Secure | LOW |
| **Key Management** | ⚠️ Issues Present | CRITICAL |
| **Configuration** | ⚠️ Inconsistent | HIGH |
| **Token Validation** | ⚠️ Silent Failures | HIGH |
| **Access Control** | ❌ Gaps Exist | MEDIUM |
| **Expiration Handling** | ✅ Implemented | LOW |
| **Exception Handling** | ❌ Poor | MEDIUM |
| **Overall Posture** | ⚠️ MODERATE | **HIGH PRIORITY FIXES NEEDED** |

---

## Critical Issues Found (3)

| # | Issue | Service | Severity | File | Line | Fix Effort |
|---|-------|---------|----------|------|------|-----------|
| 1 | Hardcoded public key in source | MS4 | 🔴 CRITICAL | Distaster Detection/src/api.py | 66-77 | 15 min |
| 2 | Private key in classpath | MS1 | 🔴 CRITICAL | core-service/src/main/resources/private.pem | — | 1 hour |
| 3 | Default secret "changeme" | MS3 | 🔴 CRITICAL | admin-service/src/main/resources/application-dev.yml | 21 | 5 min |

---

## High Severity Issues (4)

| # | Issue | Service | Severity | File | Line | Fix Effort |
|---|-------|---------|----------|------|------|-----------|
| 4 | Silent JWT validation failure | MS1/MS3 | 🟡 HIGH | JwtAuthenticationFilter.java | 32-49 | 30 min |
| 5 | HMAC keys hardcoded in config | Config Server | 🟡 HIGH | config/core-service.yml, config/admin-service.yml | 37-39, 36 | 5 min |
| 6 | Dashboard publicly accessible | MS3 | 🟡 HIGH | SecurityConfig.java | 24 | 1 min |
| 7 | No key rotation mechanism | All | 🟡 HIGH | Multiple | — | 4-5 hours |

---

## Medium Severity Issues (5)

| # | Issue | Service | Severity | File | Fix Effort |
|---|-------|---------|----------|------|-----------|
| 8 | PEM files must exist (no fallback) | MS1/MS3 | 🟠 MEDIUM | JwtService.java | 20 min |
| 9 | Exception handling too broad | MS4 | 🟠 MEDIUM | Distaster Detection/src/api.py | 15 min |
| 10 | Claims type validation missing | MS3 | 🟠 MEDIUM | JwtAuthenticationFilter.java | 30 min |

---

## Service-by-Service Summary

### MS1 (Core Service)

```
SERVICE: core-service (Token Issuer)
JWT Algorithm: RS256 ✅
Key Loading: classpath:private.pem
Token Generation: ✅ YES
Token Validation: ✅ YES
Expiration: 24 hours (86400000 ms) ✅
Issues Found: 3 (2 CRITICAL, 1 MEDIUM)
  1. Private key in classpath (CRITICAL)
  2. Silent exception handling (silently accepts invalid tokens)
  3. No explicit PEM file validation
Priority: 🔴 CRITICAL — Fix key management this week
```

**Code Quality**: 
- ✅ Proper RSA key handling
- ✅ Expiration validation implemented
- ❌ No error handling in @PostConstruct
- ❌ Exception caught, then continues anyway

**Config Issues**:
- ❌ `security.jwt.secret-key` deprecated but still in config
- ❌ HMAC value in config server (unused but confusing)

---

### MS3 (Admin Service)

```
SERVICE: admin-service (Token Validator)
JWT Algorithm: RS256 ✅
Key Loading: classpath:public.pem
Token Generation: ❌ NO (validates only)
Token Validation: ✅ YES
Expiration: 24 hours ✅
Issues Found: 4 (1 CRITICAL, 2 HIGH, 1 MEDIUM)
  1. Default secret "changeme" (CRITICAL)
  2. Dashboard endpoint public (HIGH)
  3. Silent exception handling (HIGH)
  4. Claims type validation missing (MEDIUM)
Priority: 🔴 CRITICAL — Remove default secrets immediately
```

**Code Quality**:
- ✅ Public key only (no private key exposure)
- ✅ Stateless filter design
- ⚠️ Authority extraction from JWT (good) but type-unsafe
- ❌ Doesn't reject invalid tokens

**Config Issues**:
- 🔴 `jwt.secret: ${JWT_SECRET:changeme}` — Insecure default
- ❌ Public dashboard (should be private)

---

### MS4 (Disaster Detection)

```
SERVICE: Distaster Detection MS4 (Python FastAPI)
JWT Algorithm: RS256 ✅
Key Loading: Hardcoded fallback + env vars
Token Generation: ❌ NO
Token Validation: ✅ YES (PyJWT)
Expiration: Validated ✅
Issues Found: 3 (1 CRITICAL, 1 HIGH, 1 MEDIUM)
  1. Hardcoded public key in source (CRITICAL)
  2. Key loading falls back silently (HIGH)
  3. Generic exception handling (MEDIUM)
Priority: 🔴 CRITICAL — Remove hardcoded key immediately
```

**Code Quality**:
- ✅ Proper RS256 validation with PyJWT
- ✅ Expiration check enabled
- ❌ Hardcoded fallback key in code (version control exposed)
- ⚠️ Graceful degradation to hardcoded key (masks deployment issues)

**Config Issues**:
- 🔴 Fallback public key hardcoded in source
- ⚠️ Should fail fast if env var not set

---

### API Gateway

```
SERVICE: api-gateway
JWT Handling: ❌ NONE (passes through)
Issues Found: 1 (MEDIUM)
  1. No API Gateway-level JWT validation
Priority: 🟠 MEDIUM — Add gateway validation
```

**Recommendation**: Consider adding JWT validation at gateway level for defense-in-depth.

---

## Configuration Matrix

### Environment Variables Expected

| Service | Variable | Status | Current | Required |
|---------|----------|--------|---------|----------|
| MS1 | `SECURITY_JWT_SECRET_KEY` | ❌ Unused | `deprecated-hmac-key` | Not needed |
| MS1 | `JWT_EXPIRATION` | ✅ Used | 86400000 | ✓ Set |
| MS3 | `JWT_SECRET` | ⚠️ Fallback | `changeme` | ✓ Must set |
| MS3 | `JWT_EXPIRATION` | ✅ Used | 86400000 | ✓ Set |
| MS4 | `JWT_PUBLIC_KEY` | ⚠️ Fallback | Not set | ✓ Must set |
| MS4 | `JWT_PUBLIC_KEY_FILE` | ⚠️ Fallback | Not set | ✓ Recommended |
| MS4 | `JWT_ALGORITHM` | ✅ Hardcoded | "RS256" | Immutable |

### Hardcoded Values Found

| Value | File | Type | Risk | Action |
|-------|------|------|------|--------|
| `404E635266...` (HMAC) | config-server/config/core-service.yml | Hex HMAC | HIGH | Remove |
| `404E635266...` (HMAC) | config-server/config/admin-service.yml | Hex HMAC | HIGH | Remove |
| `changeme` | admin-service/application-dev.yml | Default secret | CRITICAL | Replace |
| HARDCODED PUBLIC KEY | Distaster Detection/src/api.py | PEM in code | CRITICAL | Remove |

---

## Remediation Timeline

### 🔴 IMMEDIATE (This Week) — 4-6 hours
- [ ] Generate new RSA keypair (don't commit to git)
- [ ] Remove MS4 hardcoded key from api.py
- [ ] Remove default secret from admin-service config
- [ ] Add .gitignore entry for *.pem files
- **Test**: All services start, JWT validation works

### 🟡 SHORT-TERM (Week 2) — 3-4 hours
- [ ] Fix JwtAuthenticationFilter exception handling (MS1 & MS3)
- [ ] Remove HMAC references from config server
- [ ] Change dashboard SecurityConfig to require authentication
- [ ] Add PEM file existence validation in @PostConstruct
- **Test**: Invalid tokens rejected with 401, dashboard requires login

### 🟠 MEDIUM-TERM (Month 1) — 6-8 hours
- [ ] Move keys to Docker secrets (not classpath)
- [ ] Implement key versioning with `kid` claim
- [ ] Clean git history to remove old keys
- [ ] Add refresh token mechanism
- **Test**: Key rotation works, services behave consistently

---

## Critical Code Fixes Required

### Fix 1: MS4 api.py — Remove Hardcoded Key
**Lines 66-77**: Delete hardcoded fallback, require env var

```python
# BEFORE (INSECURE)
return """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA47bSeKvgw7fmBZvXwvPg
...
-----END PUBLIC KEY-----"""

# AFTER (SECURE)
raise ValueError(
    "JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_FILE must be set in environment"
)
```

### Fix 2: MS3 application-dev.yml — Remove Default Secret
**Line 21**: Remove `:changeme` fallback

```yaml
# BEFORE (INSECURE)
jwt:
  secret: ${JWT_SECRET:changeme}

# AFTER (SECURE)
jwt:
  secret: ${JWT_SECRET}  # Required, no fallback
```

### Fix 3: MS1/MS3 SecurityConfig — Fix Exception Handling
**JwtAuthenticationFilter lines 32-49**: Properly reject invalid tokens

```java
// Return early on invalid token (don't continue filter chain)
try {
    // validation logic
} catch (JwtException e) {
    logger.warn("Invalid token: " + e.getMessage());
    return;  // Don't call filterChain.doFilter()
}
// Unknown exception — let Spring Security handle
```

### Fix 4: MS3 SecurityConfig — Protect Dashboard
**Line 24**: Change permitAll to authenticated

```java
// BEFORE
.requestMatchers("/api/v1/admin/dashboard/**").permitAll()

// AFTER
.requestMatchers("/api/v1/admin/dashboard/**").authenticated()
```

---

## Testing Checklist

### Unit Tests to Add
- [ ] `testRejectHmacSignedTokens()` — Verify HMAC tokens rejected
- [ ] `testRejectExpiredTokens()` — Verify expiration enforced
- [ ] `testRejectMissingBearerPrefix()` — Verify format validation
- [ ] `testRejectInvalidSignature()` — Verify signature verification
- [ ] `testAcceptValidToken()` — Verify valid tokens accepted

### Integration Tests to Add
- [ ] Invalid token endpoint returns 401
- [ ] Missing token endpoint returns 401
- [ ] Expired token endpoint returns 401
- [ ] Valid token endpoint returns 200
- [ ] Dashboard requires authentication

### Manual Tests
- [ ] Start all services without env vars → should fail or warn loudly
- [ ] Generate token with MS1 → validate with MS3 ✓
- [ ] Generate token with MS1 → validate with MS4 ✓
- [ ] Rotate keys → old tokens rejected, new tokens accepted

---

## Risk Ranking for Sprint Planning

| Priority | Component | Effort | Impact | Owner |
|----------|-----------|--------|--------|-------|
| 🔴 P0 | Remove hardcoded keys (MS4, MS1, MS3) | 1 hour | CRITICAL | Backend |
| 🔴 P0 | Fix exception handling (MS1/MS3 filters) | 1 hour | CRITICAL | Backend |
| 🔴 P0 | Remove default secret (MS3 config) | 30 min | CRITICAL | DevOps |
| 🟡 P1 | Key management refactoring | 4 hours | HIGH | DevOps + Backend |
| 🟡 P1 | Dashboard auth fix | 30 min | HIGH | Backend |
| 🟠 P2 | Implement key rotation | 5 hours | MEDIUM | DevOps |
| 🟠 P2 | Add refresh tokens | 4 hours | MEDIUM | Backend |

---

## Deployment Checklist

**Before Production Deploy**:
- [ ] All CRITICAL issues resolved
- [ ] New keypair generated and distributed  
- [ ] Environment variables configured
- [ ] All unit/integration tests passing
- [ ] Security review sign-off obtained
- [ ] Rollback procedure documented

**After Production Deploy**:
- [ ] All services started successfully
- [ ] No JWT validation errors in logs
- [ ] Dashboard requires authentication (401 without token)
- [ ] Valid tokens accepted, invalid tokens rejected
- [ ] Performance: JWT parsing <1ms
- [ ] Monitoring: Error rates normal

---

## References & Related Docs

- Full Audit Report: [JWT_SECURITY_AUDIT_COMPLETE_2026.md](JWT_SECURITY_AUDIT_COMPLETE_2026.md)
- JWT RSA Setup Guide: [JWT_RSA_KEY_SETUP.md](JWT_RSA_KEY_SETUP.md)
- Deployment Guide: [DEPLOYMENT_GUIDE_v2.0.md](DEPLOYMENT_GUIDE_v2.0.md)
- Architecture Map: [COMPLETE_ARCHITECTURE_MAP_2026.md](COMPLETE_ARCHITECTURE_MAP_2026.md)
- Previous Audit: [SYSTEM_AUDIT_2025.md](SYSTEM_AUDIT_2025.md)

---

## Contact & Questions

For detailed security analysis of specific issues, see the full audit report ([JWT_SECURITY_AUDIT_COMPLETE_2026.md](JWT_SECURITY_AUDIT_COMPLETE_2026.md)).

**Last Updated**: April 15, 2026  
**Next Review**: July 15, 2026 (Quarterly)
