# Email Domain Lock Feature

## Overview
This feature allows you to restrict email authentication to specific domains. You can configure which email domain is allowed to access the system via the `.env` file.

## Configuration

### Environment Variable: `ALLOWED_EMAIL_DOMAIN`

Add this to your `.env` file:

```env
ALLOWED_EMAIL_DOMAIN=
```

### Behavior

**1. Empty Value (Default)** - Accepts all domains
```env
ALLOWED_EMAIL_DOMAIN=
```
- ✅ `user@gmail.com` → Allowed
- ✅ `user@yahoo.com` → Allowed
- ✅ `user@nriit.edu.in` → Allowed

**2. Specific Domain** - Only accepts the specified domain
```env
ALLOWED_EMAIL_DOMAIN=nriit.edu.in
```
- ✅ `user@nriit.edu.in` → Allowed
- ❌ `user@gmail.com` → Rejected
- ❌ `user@yahoo.com` → Rejected

## Example Use Cases

### For College/University Systems
Lock to your institutional domain:
```env
ALLOWED_EMAIL_DOMAIN=nriit.edu.in
```

### For Corporate Systems
Lock to your company domain:
```env
ALLOWED_EMAIL_DOMAIN=company.com
```

### For Public/Open Systems
Leave empty to allow all domains:
```env
ALLOWED_EMAIL_DOMAIN=
```

## Error Response

When a user tries to authenticate with an unauthorized domain, they will receive:

**HTTP Status:** `403 Forbidden`

**Response Body:**
```json
{
  "message": "Only emails from nriit.edu.in domain are allowed."
}
```

## Implementation Details

- Domain validation happens in the `/otpSend` endpoint before OTP generation
- Email addresses are normalized to lowercase before validation
- Domain comparison is case-insensitive and trims whitespace
- No OTP is generated or sent for unauthorized domains

## Security Considerations

- This feature provides domain-level access control
- It prevents unauthorized domains from even receiving OTPs
- Reduces spam and unauthorized access attempts
- Can be combined with admin controls for additional security layers
