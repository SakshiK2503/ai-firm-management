import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/modules/kernel/health';

export function GET() {
  return NextResponse.json(getHealthStatus());
}
