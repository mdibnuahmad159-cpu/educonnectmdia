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
  try {
    return await adminAssistantFlow(input);
  } catch (error) {
    console.error("Critical error in adminAssistantChat:", error);
    return { 
      text: "Maaf, saya mengalami kendala teknis saat memproses permintaan Anda. Silakan coba lagi dalam beberapa saat." 
    };
  }
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

    try {
      const response = await ai.generate({
        // Use the model defined in genkit.ts for consistency
        model: 'googleai/gemini-1.5-flash',
        output: { schema: AdminAssistantOutputSchema },
        system: `Anda adalah asisten AI profesional untuk Administrator 'Madrasah Diniyah Ibnu Ahmad'.
        Gunakan Bahasa Indonesia yang sopan dan formal.
        
        Tugas utama:
        1. Membantu menyusun draf pengumuman atau surat.
        2. Memberikan saran pengelolaan data sekolah.
        3. Menyiapkan konten PDF jika pengguna ingin mencetak dokumen (identifikasi kata kunci: "buat pdf", "cetak", "buatkan surat").
        
        PENTING:
        - Jika pengguna meminta file PDF, isi field 'generatedPdf'.
        - Jika pengguna meminta gambar (poster/ilustrasi), Anda dapat memberitahu pengguna bahwa gambar sedang diproses.`,
        messages: messages,
      });

      const output = response.output;

      if (!output) {
        return { text: response.text || "Saya telah memproses permintaan Anda." };
      }

      let generatedImage = output.generatedImage;

      // Logic to trigger image generation if requested explicitly
      const lowerMessage = input.message.toLowerCase();
      const wantsImage = lowerMessage.includes('buat gambar') || lowerMessage.includes('generate image') || lowerMessage.includes('buatkan poster') || lowerMessage.includes('ilustrasi');
      
      if (!generatedImage && wantsImage) {
        try {
          const imageResponse = await ai.generate({
            model: 'googleai/imagen-3.0-generate-001',
            prompt: `Ilustrasi sekolah islam madrasah diniyah: ${input.message}`,
          });
          if (imageResponse.media?.url) {
            generatedImage = imageResponse.media.url;
          }
        } catch (e) {
          console.error("Optional image generation failed:", e);
          // Don't fail the whole flow if only image generation fails
        }
      }

      return {
        ...output,
        generatedImage
      };
    } catch (innerError) {
      console.error("Error generating AI response:", innerError);
      throw innerError;
    }
  }
);
