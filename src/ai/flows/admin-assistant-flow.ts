'use server';
/**
 * @fileOverview AI Assistant flow for Admin tasks.
 * Handles database searches, content drafting, image generation, and PDF content preparation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const AdminAssistantInputSchema = z.object({
  message: z.string().describe('The user message or request.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() }))
  })).optional(),
});

export type AdminAssistantInput = z.infer<typeof AdminAssistantInputSchema>;

const AdminAssistantOutputSchema = z.object({
  text: z.string().describe('The AI response text.'),
  generatedImage: z.string().optional().describe('Data URI of a generated image if requested.'),
  generatedPdf: z.object({
    title: z.string().describe('The title for the PDF document.'),
    content: z.string().describe('The full text content for the PDF document.'),
    filename: z.string().describe('Suggested filename for the PDF.')
  }).optional().describe('Structured content for PDF generation if requested.')
});

export type AdminAssistantOutput = z.infer<typeof AdminAssistantOutputSchema>;

export async function adminAssistantChat(input: AdminAssistantInput): Promise<AdminAssistantOutput> {
  return adminAssistantFlow(input);
}

const adminAssistantFlow = ai.defineFlow(
  {
    name: 'adminAssistantFlow',
    inputSchema: AdminAssistantInputSchema,
    outputSchema: AdminAssistantOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: AdminAssistantOutputSchema },
      system: `You are a helpful AI Assistant for the Administrator of 'Madrasah Diniyah Ibnu Ahmad'. 
      Your goal is to help find data, draft announcements, manage school info, and create documents. 
      You should be professional, polite, and use Indonesian language.
      
      If the user wants a PDF file (e.g. "buatkan surat", "buat draf pengumuman PDF", "cetak laporan ini ke PDF"), 
      populate the 'generatedPdf' field with a title, formatted content, and a suitable filename.
      
      If the user wants an image (e.g. for an announcement), describe it, but also try to populate generatedImage if requested using Imagen.`,
      prompt: input.message,
      messages: input.history,
    });

    const output = response.output;

    if (!output) {
      return { text: response.text };
    }

    let generatedImage = output.generatedImage;

    // Logic to trigger image generation if keywords are found but not provided in output schema yet
    const lowerMessage = input.message.toLowerCase();
    if (!generatedImage && (lowerMessage.includes('buat gambar') || lowerMessage.includes('generate image') || lowerMessage.includes('buatkan poster'))) {
      try {
        const { media } = await ai.generate({
          model: 'googleai/imagen-4.0-fast-generate-001',
          prompt: input.message,
        });
        if (media?.url) {
          generatedImage = media.url;
        }
      } catch (e) {
        console.error("Image generation failed", e);
      }
    }

    return {
      ...output,
      generatedImage
    };
  }
);
