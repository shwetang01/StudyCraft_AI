import { NextRequest, NextResponse } from 'next/server';
import { refineStudySession } from '@/lib/aiProvider';
import { RefineRequestBody } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RefineRequestBody;

    if (!body || !body.currentSession || !body.refinementInstruction?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REFINEMENT_REQUEST',
            message: 'Active study session and refinement instruction are required.',
          },
        },
        { status: 400 }
      );
    }

    const result = await refineStudySession(body);

    if (!result.success) {
      const statusCode = result.error.code.startsWith('SIMULATED') ? 500 : 422;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Unhandled error in /api/refine:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_REFINEMENT_ERROR',
          message: 'An unexpected internal error occurred during refinement.',
          details: (error as Error).message,
        },
      },
      { status: 500 }
    );
  }
}
