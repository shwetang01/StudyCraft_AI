import { NextRequest, NextResponse } from 'next/server';
import { generateStudySession } from '@/lib/aiProvider';
import { GenerateRequestBody } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequestBody;

    if (!body || typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'A non-empty prompt, notes, or topic is required to generate study materials.',
          },
        },
        { status: 400 }
      );
    }

    const result = await generateStudySession(body);

    if (!result.success) {
      const statusCode = result.error.code === 'SIMULATED_INTERNAL_SERVER_ERROR' ? 500 : 422;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Unhandled error in /api/generate:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected internal error occurred while processing the AI response.',
          details: (error as Error).message,
        },
      },
      { status: 500 }
    );
  }
}
