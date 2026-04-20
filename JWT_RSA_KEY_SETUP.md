# JWT RSA Key Generation & Distribution Guide

This guide provides step-by-step instructions for generating and distributing RSA keys for the NexusAid microservices JWT authentication system.

## Overview

- **MS1 (Core Service)**: Issues JWT tokens signed with RS256 (private key)
- **MS3 (Admin Service)**: Verifies JWT tokens with RS256 (public key)
- **MS4 (Disaster Detection)**: Verifies JWT tokens with RS256 (public key)

All three services MUST share the same RSA keypair for verification to work correctly.

---

## Step 1: Generate RSA Keypair (if not already present)

Run these commands in a secure environment (your development machine or CI/CD pipeline):

```bash
#!/bin/bash
# Generate 2048-bit RSA private key in PKCS1 format
openssl genrsa -out private.key 2048

# Convert to PKCS8 format (required by Java Spring Security)
openssl pkcs8 -topk8 -inform PEM -outform PEM \
  -in private.key \
  -out private.pem \
  -nocrypt

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem

# Verify key format
openssl rsa -in private.pem -text -noout | head -1
# Should output: Private-Key: (2048 bit, 2 primes)

# Clean up temporary file
rm private.key
```

**Output**:
- `private.pem` (1704 bytes) - PKCS8 format (Java-compatible)
- `public.pem` (392 bytes) - PKCS8 format

---

## Step 2: Distribute Keys to All Services

### 2a. Core Service (MS1) - PRIVATE KEY

**Destination**: `core-service/src/main/resources/private.pem`

```bash
cp private.pem core-service/src/main/resources/
ls -la core-service/src/main/resources/ | grep .pem
```

**Verify pom.xml includes resources**:
```xml
<build>
  <resources>
    <resource>
      <directory>src/main/resources</directory>
      <filtering>false</filtering>
    </resource>
  </resources>
</build>
```

### 2b. Admin Service (MS3) - PUBLIC KEY

**Destination**: `admin-service/src/main/resources/public.pem`

```bash
cp public.pem admin-service/src/main/resources/
ls -la admin-service/src/main/resources/ | grep .pem
```

### 2c. Disaster Detection (MS4) - PUBLIC KEY

**Destination**: `Distaster Detection/config/public.pem`

```bash
mkdir -p "Distaster Detection/config"
cp public.pem "Distaster Detection/config/"

# Also for Docker: Add to build context
ls -la "Distaster Detection/config/" | grep .pem
```

**Update Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy public key for JWT verification
COPY config/public.pem /app/config/public.pem

# ... rest of Dockerfile ...

# Make available to FastAPI
ENV JWT_PUBLIC_KEY_PATH=/app/config/public.pem
```

---

## Step 3: Update Configuration Files

### 3a. Core Service (MS1)

**File**: `core-service/src/main/resources/application.yml`

```yaml
spring:
  application:
    name: core-service
  
  # Database config...
  
security:
  jwt:
    # IMPORTANT: Point to the private key resource in classpath
    private-key-path: classpath:private.pem
    algorithm: RS256
    expiration: 86400000  # 24 hours in milliseconds

logging:
  level:
    com.nexusaid: DEBUG
    org.springframework.security: INFO
```

**Update JwtService.java** (if needed):

```java
@Component
@Slf4j
public class JwtService {

    @Value("${security.jwt.private-key-path}")
    private String privateKeyPath;
    
    @Value("${security.jwt.algorithm:RS256}")
    private String algorithm;
    
    private PrivateKey privateKey;
    
    @PostConstruct
    public void loadPrivateKey() throws Exception {
        // Load private.pem from classpath
        Resource resource = new ClassPathResource(privateKeyPath.replace("classpath:", ""));
        String privateKeyContent = new String(resource.getInputStream().readAllBytes());
        
        // Parse PEM to PrivateKey
        PemReader pemReader = new PemReader(new StringReader(privateKeyContent));
        PemObject pemObject = pemReader.readPemObject();
        pemReader.close();
        
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        this.privateKey = keyFactory.generatePrivate(
            new PKCS8EncodedKeySpec(pemObject.getContent())
        );
        log.info("Loaded RSA private key from {}", privateKeyPath);
    }
    
    public String generateToken(UserDetails user) {
        return Jwts.builder()
            .claim("userId", ((UserDetailsImpl) user).getUser().getId())
            .claim("userType", ((UserDetailsImpl) user).getUser().getType().name())
            .claim("roles", user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()))
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + 86400000))
            .signWith(privateKey, SignatureAlgorithm.RS256)
            .compact();
    }
}
```

### 3b. Admin Service (MS3)

**File**: `admin-service/src/main/resources/application.yml`

```yaml
spring:
  application:
    name: admin-service
  
  # Database config...
  
security:
  jwt:
    # IMPORTANT: Point to the public key resource in classpath
    public-key-path: classpath:public.pem
    algorithm: RS256

logging:
  level:
    com.nexusaid: DEBUG
```

**Update JwtAuthenticationFilter.java** (if needed):

```java
@Component
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Value("${security.jwt.public-key-path}")
    private String publicKeyPath;
    
    private PublicKey publicKey;
    
    @PostConstruct
    public void loadPublicKey() throws Exception {
        // Load public.pem from classpath
        Resource resource = new ClassPathResource(publicKeyPath.replace("classpath:", ""));
        String publicKeyContent = new String(resource.getInputStream().readAllBytes());
        
        // Parse PEM to PublicKey
        PemReader pemReader = new PemReader(new StringReader(publicKeyContent));
        PemObject pemObject = pemReader.readPemObject();
        pemReader.close();
        
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        this.publicKey = keyFactory.generatePublic(
            new X509EncodedKeySpec(pemObject.getContent())
        );
        log.info("Loaded RSA public key from {}", publicKeyPath);
    }
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        String token = getTokenFromRequest(request);
        if (token != null) {
            try {
                Claims claims = Jwts.parserBuilder()
                    .setSigningKey(publicKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
                
                // Extract user identity and set in SecurityContext
                String userId = (String) claims.get("userId");
                List<String> roles = (List<String>) claims.get("roles");
                
                // ... create authentication ...
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException e) {
                log.warn("JWT validation failed: {}", e.getMessage());
            }
        }
        filterChain.doFilter(request, response);
    }
}
```

### 3c. Distaster Detection (MS4) - Python FastAPI

**File**: `Distaster Detection/.env`

```bash
# JWT Configuration
JWT_PUBLIC_KEY_PATH=/app/config/public.pem
JWT_ALGORITHM=RS256

# Other configs...
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
RABBITMQ_HOST=localhost
```

**File**: `Distaster Detection/src/api.py`

```python
import os
from pathlib import Path

def load_public_key():
    """Load RSA public key from file or environment variable."""
    key_path = os.getenv("JWT_PUBLIC_KEY_PATH", "/app/config/public.pem")
    
    if not Path(key_path).exists():
        raise FileNotFoundError(f"Public key not found at {key_path}")
    
    with open(key_path, 'r') as f:
        return f.read()

# Load at startup
PUBLIC_KEY = load_public_key()

def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict:
    """Verify JWT token using RSA public key."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    token = credentials.credentials
    try:
        import jwt as pyjwt
        payload = pyjwt.decode(
            token,
            PUBLIC_KEY,
            algorithms=["RS256"],
            options={"verify_exp": True},
        )
        return payload
    except Exception as e:
        logger.warning("JWT validation failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

---

## Step 4: Docker Build Integration

### 4a. Update Dockerfile (All Services)

**Core Service** (`core-service/Dockerfile`):
```dockerfile
FROM openjdk:21-jdk-slim

WORKDIR /app

# Copy source
COPY pom.xml .
RUN mvn dependency:resolve

COPY src ./src
COPY private.pem ./src/main/resources/  # ← Private key included in build

RUN mvn clean package -DskipTests

ENTRYPOINT ["java", "-jar", "target/core-service-*.jar"]
```

**Admin Service** (`admin-service/Dockerfile`):
```dockerfile
FROM openjdk:21-jdk-slim

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:resolve

COPY src ./src
COPY public.pem ./src/main/resources/  # ← Public key included in build

RUN mvn clean package -DskipTests

ENTRYPOINT ["java", "-jar", "target/admin-service-*.jar"]
```

**Distaster Detection** (`Distaster Detection/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY config ./config  # ← Config dir with public.pem

ENV JWT_PUBLIC_KEY_PATH=/app/config/public.pem

RUN apt-get update && apt-get install -y supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

### 4b. Docker Compose (Secure Mounting)

**Option 1: Keys in build context** (Recommended for Docker Image)

```yaml
version: '3.8'

services:
  core-service:
    build:
      context: ./core-service
      # Keys copied into image during build
    environment:
      - SPRING_DATASOURCE_PASSWORD=secret

  admin-service:
    build:
      context: ./admin-service

  distaster-detection:
    build:
      context: ./Distaster Detection
```

**Option 2: Keys mounted as secrets** (For docker swarm/k8s)

```yaml
secrets:
  private_key:
    file: ./config/private.pem
  public_key:
    file: ./config/public.pem

services:
  core-service:
    secrets:
      - private_key
    environment:
      - SPRING_JWT_PRIVATE_KEY_PATH=/run/secrets/private_key
```

---

## Step 5: Verification & Testing

### 5a. Local Testing

```bash
# 1. Generate keys
./scripts/generate_keys.sh

# 2. Start services locally
mvn spring-boot:run -pl core-service
mvn spring-boot:run -pl admin-service
python -m uvicorn src.api:app --reload --port 8000

# 3. Test JWT flow
# Get token from MS1
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test",
    "password": "test123",
    "userType": "VOLUNTEER"
  }'

# Copy JWT token from response

# Verify token in MS3
curl http://localhost:8081/api/v1/admin/verify \
  -H "Authorization: Bearer <TOKEN>"
  
# Should return 200 OK with decoded claims
```

### 5b. Docker Testing

```bash
# Build all services
docker-compose build

# Start
docker-compose up -d

# Check logs for key loading
docker logs core-service | grep "Loaded RSA"
docker logs admin-service | grep "Loaded RSA"
docker logs distaster-detection | grep "Loaded RSA"

# Test via API Gateway
curl http://localhost:8888/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### 5c. Key Verification Commands

```bash
# Display public key
openssl rsa -pubin -in public.pem -text -noout

# Confirm key consistency
openssl rsa -in private.pem -pubout -out extracted_public.pem
diff extracted_public.pem public.pem
# Should have no diff
```

---

## Step 6: Security Best Practices

1. **Never commit private keys to git**:
   ```bash
   echo "private.pem" >> .gitignore
   echo "config/public.pem" >> .gitignore
   ```

2. **Store keys in secure vault** (for production):
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault

3. **Rotate keys periodically** (e.g., yearly):
   - Generate new keypair
   - Update all services
   - Expire old tokens via TTL

4. **Audit key access**:
   ```bash
   # Check file permissions
   ls -la core-service/src/main/resources/private.pem
   # Should be: -rw-r--r-- 1 user group (644)
   
   chmod 644 private.pem public.pem
   ```

---

## Step 7: Troubleshooting

| Issue | Symptom | Solution |
|-------|---------|----------|
| JWT not found in classpath | `FileNotFoundError` during startup | Ensure pem files in `src/main/resources/` |
| Invalid key format | `InvalidKeySpecException` | Ensure PKCS8 format: `openssl pkcs8 -topk8 ...` |
| Token verification fails | `JwtException: signature verification failed` | Verify public.pem matches private.pem: `diff` command |
| Python can't load key | `PermissionError` | Ensure Dockerfile copies key with correct permissions |
| Expired token | `403 Unauthorized` | Check system clock sync; increase TTL in config |

---

## References

- [Spring Security JWT Guide](https://spring.io/blog/2015/07/14/spring-security-3-2-0-rc1-released)
- [JJWT Library Documentation](https://github.com/jwtk/jjwt)
- [PyJWT Documentation](https://pyjwt.readthedocs.io/)
- [OpenSSL RSA Key Generation](https://www.ssl.com/article/openssl-rsa-key-generator-online/)

---

**Generated by**: NexusAid DevOps  
**Last Updated**: 2025  
**Status**: Production-Ready

