import crypto from 'crypto';

const SECRET = "cobrabub-secret-key-ameforge-2026";

// Generate a signed license key (stateless JWT-like token)
export function generateLicenseKey(email, plan = "pro") {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1); // 1 year expiry

  const payload = {
    email: email.trim().toLowerCase(),
    plan: plan,
    expiresAt: expiry.toISOString(),
    issuedAt: new Date().toISOString()
  };

  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString('base64');
  
  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payloadBase64);
  const signature = hmac.digest('hex');

  // License format: payloadBase64.signature
  return `${payloadBase64}.${signature}`;
}

// Verify a signed license key
export function verifyLicenseKey(key) {
  if (!key || typeof key !== 'string') {
    return { valid: false, reason: "No key provided" };
  }

  const parts = key.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: "Invalid license format" };
  }

  const [payloadBase64, signature] = parts;

  try {
    // Recreate HMAC and check signature
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(payloadBase64);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, reason: "Signature mismatch (forged key)" };
    }

    const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadStr);

    // Check expiration date
    const now = new Date();
    const expiry = new Date(payload.expiresAt);
    if (now > expiry) {
      return { valid: false, reason: "License has expired", payload };
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: "Error decoding payload: " + e.message };
  }
}
