import { NextResponse } from 'next/server';
import { verifyLicenseKey } from '../../../db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { licenseKey } = body;

    if (!licenseKey) {
      return NextResponse.json({ valid: false, reason: "License key is required" }, { status: 400 });
    }

    const result = verifyLicenseKey(licenseKey);
    if (result.valid) {
      return NextResponse.json({
        valid: true,
        plan: result.payload.plan,
        email: result.payload.email,
        expiresAt: result.payload.expiresAt
      });
    } else {
      return NextResponse.json({ valid: false, reason: result.reason }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ valid: false, reason: "Invalid request body: " + e.message }, { status: 400 });
  }
}

// Support CORS options requests if desktop app calls directly from a browser context
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
