# Authentication and Authorization

### OAuth 2.0 Flows

#### Authorization Code Flow + PKCE

The most secure flow for public clients (SPAs, mobile apps) where a client secret cannot be safely stored.

```
+--------+                                +---------------+
| Client |                                | Authorization |
| (SPA)  |                                |    Server     |
+---+----+                                | (e.g.Cognito) |
    |                                     +-------+-------+
    | 1. Generate code_verifier (random string)   |
    |    code_challenge = SHA256(code_verifier)    |
    |                                              |
    | 2. Redirect to /authorize                    |
    |    ?response_type=code                       |
    |    &client_id=abc                            |
    |    &redirect_uri=https://app.com/callback    |
    |    &code_challenge=xyz                       |
    |    &code_challenge_method=S256               |
    |    &scope=openid profile                     |
    |--------------------------------------------->|
    |                                              |
    | 3. User logs in and consents                 |
    |                                              |
    | 4. Redirect back with authorization code     |
    |<------ /callback?code=AUTH_CODE -------------|
    |                                              |
    | 5. Exchange code for tokens                  |
    |    POST /token                               |
    |    grant_type=authorization_code             |
    |    &code=AUTH_CODE                           |
    |    &code_verifier=ORIGINAL_VERIFIER          |
    |    &client_id=abc                            |
    |    &redirect_uri=https://app.com/callback    |
    |--------------------------------------------->|
    |                                              |
    | 6. Server verifies:                          |
    |    SHA256(code_verifier) == code_challenge    |
    |                                              |
    | 7. Returns access_token + refresh_token      |
    |<---------------------------------------------|
```

**Why PKCE?** Without it, an attacker who intercepts the authorization code (via a malicious app or browser extension) could exchange it for tokens. With PKCE, the attacker would also need the `code_verifier`, which never leaves the client.

#### Client Credentials Flow

For machine-to-machine communication where no user is involved.

```
+--------+                                +---------------+
| Service|                                | Authorization |
|   A    |                                |    Server     |
+---+----+                                +-------+-------+
    |                                              |
    | 1. POST /token                               |
    |    grant_type=client_credentials             |
    |    &client_id=service-a                      |
    |    &client_secret=SECRET                     |
    |    &scope=orders:read                        |
    |--------------------------------------------->|
    |                                              |
    | 2. Returns access_token                      |
    |<---------------------------------------------|
    |                                              |
    | 3. Call Service B with access_token          |
    |    Authorization: Bearer <access_token>      |
    +--------------------------------------------->|
```

No user login, no redirect. The service authenticates itself directly. Use this for backend services, cron jobs, and service-to-service API calls.

#### Flow Comparison

| Flow                      | Use Case                        | Client Type | User Involved | Security Level |
|---------------------------|---------------------------------|-------------|---------------|----------------|
| Authorization Code + PKCE | SPAs, mobile apps, CLIs         | Public      | Yes           | High           |
| Client Credentials        | Service-to-service, cron jobs   | Confidential| No            | High           |
| Implicit (deprecated)     | Was used for SPAs               | Public      | Yes           | Low (no more)  |
| Resource Owner Password   | Legacy; first-party apps only   | Trusted     | Yes           | Low            |

---

### JWT (JSON Web Tokens)

A JWT consists of three base64url-encoded parts separated by dots:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSmlzaG51Iiwicm9sZSI6InNkZTIiLCJpYXQiOjE3MTE0MDAwMDAsImV4cCI6MTcxMTQwMDkwMH0.signature_here

|________ Header ________|.________ Payload ________|.__ Signature __|
```

**Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

**Payload (claims):**
```json
{
  "sub": "user-123",
  "name": "Jishnu",
  "role": "sde2",
  "iat": 1711400000,
  "exp": 1711400900,
  "iss": "https://auth.example.com",
  "aud": "https://api.example.com"
}
```

**Signature:**
```
RS256(
  base64urlEncode(header) + "." + base64urlEncode(payload),
  privateKey
)
```

The signature ensures the token has not been tampered with. The server verifies using the public key (RS256) or shared secret (HS256). Prefer RS256 in distributed systems so that any service can verify tokens using the public key without knowing the signing secret.

#### Access Token vs Refresh Token

| Property       | Access Token                     | Refresh Token                          |
|----------------|----------------------------------|----------------------------------------|
| Purpose        | Authorize API requests           | Obtain new access tokens               |
| Lifetime       | Short (5-15 minutes)             | Long (days to weeks)                   |
| Storage        | Memory (SPA) or httpOnly cookie  | httpOnly, Secure, SameSite cookie      |
| Sent with      | Every API request (Bearer header)| Only to the token endpoint             |
| Revocable      | Not easily (must wait for expiry)| Yes (server-side revocation list)      |

#### Token Rotation

Refresh token rotation prevents stolen refresh tokens from being usable indefinitely:

```
1. Client sends refresh_token_v1 to /token endpoint
2. Server validates refresh_token_v1
3. Server issues:
   - New access_token
   - New refresh_token_v2  (refresh_token_v1 is now invalidated)
4. If refresh_token_v1 is used AGAIN (by an attacker who stole it):
   - Server detects reuse of an already-rotated token
   - Server invalidates the ENTIRE token family (all refresh tokens for this session)
   - User must re-authenticate
```

This is known as **automatic reuse detection**. AWS Cognito supports this natively.

---

### Session-Based vs Token-Based Authentication

| Factor             | Session-Based                          | Token-Based (JWT)                       |
|--------------------|----------------------------------------|-----------------------------------------|
| State storage      | Server-side (session store/DB/Redis)   | Client-side (token contains claims)     |
| Scalability        | Requires shared session store          | Stateless -- any server can verify      |
| Revocation         | Easy (delete session from store)       | Hard (token valid until expiry)         |
| Mobile support     | Awkward (cookies are HTTP-centric)     | Natural (send in Authorization header)  |
| CSRF vulnerability | Yes (if using cookies)                 | No (if token sent via header)           |
| Payload size       | Small cookie (session ID only)         | Larger (JWT contains claims)            |
| Server memory      | Grows with active sessions             | None                                    |
| Cross-domain       | Complex (cookie SameSite, CORS)        | Simple (header-based)                   |

**In practice:** Most modern APIs (especially those used by SPAs and mobile apps) use JWT-based auth. Session-based auth still works well for traditional server-rendered web apps. Hybrid approaches exist: short-lived JWTs for stateless verification, with a server-side allowlist/blocklist for revocation.

---

### RBAC vs ABAC

#### Role-Based Access Control (RBAC)

Permissions are assigned to roles, and users are assigned roles.

```
Roles:
  admin  -> [users:read, users:write, orders:read, orders:write, reports:read]
  editor -> [orders:read, orders:write]
  viewer -> [orders:read]

Users:
  Jishnu -> admin
  Alice  -> editor
  Bob    -> viewer
```

```typescript
// Middleware
function requirePermission(permission: string) {
  return (req, res, next) => {
    const userPermissions = getRolePermissions(req.user.role);
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

app.delete("/users/:id", requirePermission("users:write"), deleteUser);
```

**Pros:** Simple to understand, easy to audit, sufficient for most applications.
**Cons:** Role explosion when permissions become granular; "admin-but-not-for-billing" requires a new role.

#### Attribute-Based Access Control (ABAC)

Policies evaluate attributes of the user, resource, action, and environment.

```
Policy: "Allow if user.department == resource.department AND action == 'read'"
Policy: "Allow if user.clearance_level >= resource.classification_level"
Policy: "Deny if environment.time NOT IN business_hours AND action == 'write'"
```

**Pros:** Extremely flexible, handles complex rules without role explosion, can incorporate context (time, IP, device).
**Cons:** Harder to reason about, difficult to audit ("who can access what?"), more complex to implement.

**When to use each:**
- RBAC: Most applications. Start here. It covers 90% of authorization needs.
- ABAC: When you need context-dependent rules, multi-tenant isolation, or your RBAC roles are proliferating uncontrollably. Common in healthcare, finance, and government systems.

---

### AWS Cognito as Identity Provider

Since Jishnu works with Cognito daily, this is likely to come up in system design discussions.

**User Pools (Authentication):**
- Managed user directory: sign-up, sign-in, password reset, MFA
- Issues JWTs (ID token, access token, refresh token)
- Supports federation with external IdPs (Google, Facebook, SAML, OIDC)
- Hosted UI for quick login page deployment
- Customizable via Lambda triggers:
  - Pre Sign-up: validate/auto-confirm users
  - Pre Token Generation: add custom claims to JWT
  - Post Confirmation: send welcome email, provision resources
  - Custom Message: customize verification emails/SMS
  - Pre Authentication: implement custom validation (IP blocking, etc.)

**Identity Pools (Authorization for AWS resources):**
- Maps authenticated users (from User Pools or external IdPs) to IAM roles
- Provides temporary AWS credentials (STS)
- Use case: allowing a frontend app to upload directly to S3 or access DynamoDB
- Supports unauthenticated (guest) access with a restricted IAM role

**Common architecture with API Gateway:**
```
Client -> Cognito User Pool (login) -> JWT
Client -> API Gateway (JWT in Authorization header)
       -> Cognito Authorizer validates JWT
       -> Lambda / ECS / EC2 backend
```

**API Gateway integration:**
- Cognito Authorizer: built-in, validates JWT against the User Pool, extracts claims
- Custom Lambda Authorizer: when you need additional validation beyond Cognito (check blacklist, verify custom claims, multi-tenant routing)

---

### API Key Authentication

API keys are simple bearer tokens used to identify the calling application (not the user).

```
GET /api/data
X-API-Key: sk_live_abc123xyz789
```

**Characteristics:**
- Simple to implement and use
- Identifies the application, not the user (no user context)
- Cannot be easily scoped to specific permissions (typically all-or-nothing)
- Should be sent via header (`X-API-Key`), never as a query parameter (query params are logged in server access logs, browser history, and proxy logs)

**When to use:**
- Server-to-server communication where OAuth would be overkill
- Rate limiting and usage tracking per client/partner
- Public APIs where you need to identify callers but user-level auth is not required

**When NOT to use:**
- As the sole auth mechanism for user-facing APIs
- For anything requiring fine-grained permissions
- When the key might be exposed (mobile apps, SPAs) -- use OAuth instead

**Best practices:**
- Store keys hashed (like passwords) -- if your database leaks, raw keys are not exposed
- Support key rotation: allow multiple active keys per client with expiration dates
- Prefix keys for easy identification: `sk_live_` for production, `sk_test_` for sandbox

---
