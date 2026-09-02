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
      text: "Maaf, sistem sedang mengalami gangguan komunikasi dengan pusat data AI. Silakan coba kirim pesan kembali." 
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
    // Construct messages array for chat history
    const messages = [
      ...(input.history || []),
      { role: 'user' as const, content: [{ text: input.message }] }
    ];

    try {
      // Using global ai object defaults for model and safety
      const response = await ai.generate({
        output: { schema: AdminAssistantOutputSchema },
        system: `Anda adalah asisten AI profesional untuk Admin 'Madrasah Diniyah Ibnu Ahmad'.
        Gunakan Bahasa Indonesia yang sopan dan formal.
        
        Tugas:
        1. Bantu buat draf pengumuman/surat.
        2. Berikan saran data.
        3. Siapkan konten PDF jika diminta (field 'generatedPdf').
        
        PENTING: Jangan menyebutkan kendala teknis kepada pengguna kecuali benar-benar gagal.`,
        messages: messages,
      });

      const output = response.output;
      if (!output) {
        return { text: response.text || "Permintaan Anda telah saya proses." };
      }

      let generatedImage = output.generatedImage;

      // Logic to trigger image generation if requested explicitly
      const lowerMessage = input.message.toLowerCase();
      const keywords = ['buat gambar', 'generate image', 'buatkan poster', 'ilustrasi', 'gambar'];
      const wantsImage = keywords.some(k => lowerMessage.includes(keywords[0]));
      
      if (!generatedImage && wantsImage) {
        try {
          const imageResponse = await ai.generate({
            model: 'googleai/imagen-4.0-fast-generate-001',
            prompt: `Ilustrasi sekolah islam modern madrasah diniyah: ${input.message}`,
          });
          if (imageResponse.media?.url) {
            generatedImage = imageResponse.media.url;
          }
        } catch (e) {
          console.error("Optional image generation failed:", e);
        }
      }

      return {
        ...output,
        generatedImage
      };
    } catch (innerError) {
      console.error("Error generating AI response:", innerError);
      // Fallback to simple text generation if structured output fails
      try {
        const fallback = await ai.generate({
          prompt: input.message,
          system: "Jawab sebagai asisten admin sekolah dalam Bahasa Indonesia."
        });
        return { text: fallback.text };
      } catch (finalError) {
        throw finalError;
      }
    }
  }
);
