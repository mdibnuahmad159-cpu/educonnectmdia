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

/**
 * Main function to handle AI Assistant chat interactions.
 * Includes top-level error handling to ensure the UI remains responsive.
 */
export async function adminAssistantChat(input: AdminAssistantInput): Promise<AdminAssistantOutput> {
  try {
    return await adminAssistantFlow(input);
  } catch (error: any) {
    console.error("Critical error in adminAssistantChat:", error);
    return { 
      text: "Mohon maaf, sistem AI sedang mengalami gangguan koneksi sementara. Hal ini biasanya terjadi karena beban server yang tinggi. Silakan coba kirimkan kembali pesan Anda dalam beberapa saat." 
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
    // Construct the messages array for the LLM
    const messages: any[] = [
      ...(input.history || []),
      { role: 'user', content: [{ text: input.message }] }
    ];

    try {
      // 1. Attempt structured generation first
      // Using 'googleai/gemini-1.5-flash' which is the standard identifier
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        output: { schema: AdminAssistantOutputSchema },
        system: `Anda adalah asisten AI profesional untuk Admin 'Madrasah Diniyah Ibnu Ahmad'.
        Gunakan Bahasa Indonesia yang sopan dan formal.
        
        Tugas:
        1. Bantu cari info santri/guru (minta admin cek menu terkait jika data spesifik tidak ada).
        2. Buat draf pengumuman, surat, atau laporan sekolah.
        3. Jika diminta membuat file PDF, isi field 'generatedPdf' dengan konten yang rapi.
        
        Penting: Berikan respon yang langsung membantu tanpa menjelaskan kendala teknis.`,
        messages: messages,
      });

      const output = response.output;
      if (!output) {
        return { text: response.text || "Saya telah memproses permintaan Anda, namun terjadi kendala saat menyusun data terstruktur." };
      }

      let generatedImage = output.generatedImage;

      // 2. Separate Image Generation logic for better reliability
      const lowerMessage = input.message.toLowerCase();
      const needsImage = ['gambar', 'ilustrasi', 'poster', 'foto', 'buatkan gambar'].some(k => lowerMessage.includes(k));
      
      if (needsImage && !generatedImage) {
        try {
          const imageRes = await ai.generate({
            model: 'googleai/imagen-3-fast',
            prompt: `Ilustrasi sekolah islam madrasah diniyah modern, gaya profesional dan bersih: ${input.message}`,
          });
          if (imageRes.media?.url) {
            generatedImage = imageRes.media.url;
          }
        } catch (e) {
          console.warn("Optional image generation failed:", e);
        }
      }

      return {
        ...output,
        generatedImage
      };
    } catch (innerError: any) {
      console.error("Structured AI generation failed, falling back to simple text:", innerError);
      
      // 3. Fail-safe: Simple text generation
      try {
        const fallback = await ai.generate({
          model: 'googleai/gemini-1.5-flash',
          prompt: input.message,
          system: "Anda adalah asisten madrasah. Jawablah pesan admin dengan ramah dalam Bahasa Indonesia."
        });
        return { text: fallback.text || "Maaf, sistem tidak dapat memproses jawaban saat ini. Silakan coba lagi nanti." };
      } catch (finalError) {
        throw finalError;
      }
    }
  }
);
