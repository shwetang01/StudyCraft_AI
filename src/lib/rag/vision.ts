/**
 * StudyCraft AI - Gemini Vision Diagram Analyzer
 * Inspects extracted textbook figures to generate rich semantic descriptions
 * enabling accurate diagram retrieval via natural-language queries.
 */

import fs from 'fs';

export interface DiagramAnalysisResult {
  label: string;
  caption: string;
  description: string;
}

export async function analyzeDiagramWithVision(
  imagePathOrBase64: string,
  existingCaption?: string | null,
  pageIndex?: number,
  apiKeyOverride?: string
): Promise<DiagramAnalysisResult> {
  const pageNo = (pageIndex ?? 0) + 1;

  // 1. Instant Fast-Path: If PyMuPDF already extracted an accurate caption from surrounding text, reuse it!
  if (existingCaption && existingCaption.trim().length > 12) {
    const cleanCap = existingCaption.trim();
    const labelMatch = cleanCap.match(/^(?:Figure|Fig\.?|FIGURE)\s*[\d\.\-]+/i);
    return {
      label: labelMatch ? labelMatch[0].trim() : `Figure on Page ${pageNo}`,
      caption: cleanCap,
      description: cleanCap,
    };
  }

  const defaultResult: DiagramAnalysisResult = {
    label: `Figure on Page ${pageNo}`,
    caption: existingCaption || `Diagram from page ${pageNo}`,
    description: existingCaption || `Textbook diagram and scientific illustration on page ${pageNo}.`,
  };

  const apiKey =
    apiKeyOverride?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    '';

  if (!apiKey) {
    return defaultResult;
  }

  try {
    // 2. Strict file size safety check: skip images > 120KB to prevent UND_ERR_HEADERS_TIMEOUT
    let base64Data = '';
    let mimeType = 'image/png';

    if (fs.existsSync(imagePathOrBase64)) {
      const stats = fs.statSync(imagePathOrBase64);
      if (stats.size > 120 * 1024) {
        return defaultResult;
      }

      const fileBuf = fs.readFileSync(imagePathOrBase64);
      base64Data = fileBuf.toString('base64');
      if (imagePathOrBase64.endsWith('.jpg') || imagePathOrBase64.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (imagePathOrBase64.endsWith('.webp')) {
        mimeType = 'image/webp';
      }
    } else if (imagePathOrBase64.startsWith('data:')) {
      const matches = imagePathOrBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    } else {
      base64Data = imagePathOrBase64;
    }

    if (!base64Data || base64Data.length > 200_000) {
      return defaultResult;
    }

    const prompt = `
Analyze this textbook diagram from Page ${pageNo}.
Detected caption: "${existingCaption || 'None'}"
Return JSON:
{
  "label": "Figure label (e.g. Figure 2.1)",
  "caption": "1-sentence summary",
  "description": "2-sentence technical description of components, labels, and scientific principles shown"
}
`;

    const model = 'gemini-flash-lite-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000), // Strict 4s timeout prevents blocking
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (response.ok) {
      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          label: parsed.label || `Figure on Page ${pageNo}`,
          caption: parsed.caption || existingCaption || `Diagram from page ${pageNo}`,
          description: parsed.description || parsed.caption || `Scientific diagram illustration on page ${pageNo}.`,
        };
      }
    }
  } catch {
    // Completely silent fallback; never throw
  }

  return defaultResult;
}
