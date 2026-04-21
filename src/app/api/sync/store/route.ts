import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(): Promise<Response> {
  return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PUT(): Promise<Response> {
  return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } });
}
export async function DELETE(): Promise<Response> {
  return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } });
}
