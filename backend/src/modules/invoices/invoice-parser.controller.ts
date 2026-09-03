import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import Anthropic from '@anthropic-ai/sdk';
import { sendSuccess } from '../../utils/response';

const EXTRACT_PROMPT = `You are an invoice data extraction assistant. Analyze this invoice document and extract structured data.

Return ONLY a valid JSON object with this exact structure:
{
  "line_items": [
    {
      "description": "Product or service description",
      "quantity": 1,
      "rate": 0.00,
      "sku": ""
    }
  ],
  "customer_name": "Customer name or null if not found",
  "invoice_date": "YYYY-MM-DD or null if not found",
  "invoice_no": "Invoice number or null if not found",
  "notes": "Any notes/terms or null"
}

Rules:
- quantity must be a positive number (default 1 if unclear)
- rate must be the unit price as a number (not total)
- sku is optional, leave empty string if not present
- Extract ALL line items visible in the invoice
- Return only the JSON object, no markdown, no explanation`;

export const parseInvoiceImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
      res.status(503).json({ success: false, message: 'Invoice parsing is not configured. Please set ANTHROPIC_API_KEY.' });
      return;
    }

    const { mimetype, buffer } = req.file;
    const base64 = buffer.toString('base64');

    const isImage = mimetype.startsWith('image/');
    const isPdf = mimetype === 'application/pdf';

    if (!isImage && !isPdf) {
      res.status(400).json({ success: false, message: 'Only images (JPEG, PNG, WebP) and PDFs are supported' });
      return;
    }

    const anthropic = new Anthropic({ apiKey });

    let messageContent: Anthropic.MessageParam['content'];

    if (isImage) {
      const mediaType = mimetype as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      messageContent = [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        { type: 'text', text: EXTRACT_PROMPT },
      ];
    } else {
      // PDF — Claude supports PDFs natively as document type
      messageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        } as any,
        { type: 'text', text: EXTRACT_PROMPT },
      ];
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: messageContent }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Strip markdown code blocks if present
    const cleaned = rawText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

    // Extract JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(422).json({ success: false, message: 'Could not extract invoice data from the uploaded file' });
      return;
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Ensure line_items is always an array with valid shape
    if (!Array.isArray(extracted.line_items)) {
      extracted.line_items = [];
    }
    extracted.line_items = extracted.line_items.map((item: any) => ({
      description: String(item.description || ''),
      quantity: parseFloat(item.quantity) || 1,
      rate: parseFloat(item.rate) || 0,
      sku: String(item.sku || ''),
    }));

    sendSuccess(res, extracted, 'Invoice parsed successfully');
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      res.status(422).json({ success: false, message: 'AI returned invalid data — please try a clearer image' });
      return;
    }
    next(err);
  }
};
