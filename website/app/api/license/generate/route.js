import { NextResponse } from 'next/server';
import { generateLicenseKey } from '../../../db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, plan } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const licenseKey = generateLicenseKey(email, plan || "pro");
    return NextResponse.json({ success: true, licenseKey, email, plan: plan || "pro" });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
