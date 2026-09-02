'use server';
/**
 * @fileOverview AI Assistant flow for Admin tasks.
 * Handles database searches, content drafting, image generation, and PDF content preparation.
 * 
 * - adminAssistantChat - Function to handle chat interactions.
 * - AdminAssistantInput - Input schema for the assistant.
 * - AdminAssistantOutput - Output schema for the assistant.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
    // Construct messages array for chat history + current message
    const messages = [
      ...(input.history || []),
      { role: 'user' as const, content: [{ text: input.message }] }
    ];

    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      output: { schema: AdminAssistantOutputSchema },
      system: `Anda adalah asisten AI profesional untuk Administrator 'Madrasah Diniyah Ibnu Ahmad'.
      Gunakan Bahasa Indonesia yang sopan dan formal.
      
      Tugas utama:
      1. Membantu menyusun draf pengumuman atau surat.
      2. Memberikan saran pengelolaan data sekolah.
      3. Membuat gambar ilustrasi jika diminta (identifikasi niat ini).
      4. Menyiapkan konten PDF jika pengguna ingin mencetak dokumen (identifikasi kata kunci: "buat pdf", "cetak", "buatkan surat").
      
      Jika pengguna meminta file PDF, pastikan Anda mengisi field 'generatedPdf'.
      Jika pengguna meminta gambar, Anda bisa mencoba menghasilkan gambar ilustrasi yang relevan.`,
      messages: messages,
    });

    const output = response.output;

    // Fallback if structured output fails but text is available
    if (!output) {
      return { text: response.text };
    }

    let generatedImage = output.generatedImage;

    // Logic to trigger image generation if requested explicitly
    const lowerMessage = input.message.toLowerCase();
    const wantsImage = lowerMessage.includes('buat gambar') || lowerMessage.includes('generate image') || lowerMessage.includes('buatkan poster');
    
    if (!generatedImage && wantsImage) {
      try {
        const imageResponse = await ai.generate({
          model: 'googleai/imagen-3.0-generate-001',
          prompt: input.message,
        });
        if (imageResponse.media?.url) {
          generatedImage = imageResponse.media.url;
        }
      } catch (e) {
        console.error("Image generation failed:", e);
      }
    }

    return {
      ...output,
      generatedImage
    };
  }
);
