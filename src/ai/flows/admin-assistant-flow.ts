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
import { gemini15Flash, imagen3Fast } from '@genkit-ai/google-genai';

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
      text: "Maaf, asisten AI sedang sibuk atau mengalami gangguan koneksi sementara. Mohon coba kirim pesan Anda kembali dalam beberapa saat." 
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
    const messages = [
      ...(input.history || []),
      { role: 'user' as const, content: [{ text: input.message }] }
    ];

    try {
      // 1. Generate Structured Response (Text + PDF info)
      const response = await ai.generate({
        model: gemini15Flash,
        output: { schema: AdminAssistantOutputSchema },
        system: `Anda adalah asisten AI profesional untuk Admin 'Madrasah Diniyah Ibnu Ahmad'.
        Gunakan Bahasa Indonesia yang sopan dan formal.
        
        Tugas:
        1. Bantu cari info santri/guru (minta admin cek menu terkait jika data spesifik tidak ada).
        2. Buat draf pengumuman, surat, atau laporan.
        3. Jika user minta file PDF, isi field 'generatedPdf' dengan konten yang sesuai.
        4. Jangan menyebutkan kendala teknis model.`,
        messages: messages,
      });

      const output = response.output;
      if (!output) {
        return { text: response.text || "Permintaan Anda sedang saya proses." };
      }

      let generatedImage = undefined;

      // 2. Optional Image Generation logic (handled separately to avoid total failure)
      const lowerMessage = input.message.toLowerCase();
      const needsImage = ['gambar', 'ilustrasi', 'poster', 'foto', 'generate image'].some(k => lowerMessage.includes(k));
      
      if (needsImage) {
        try {
          const imageRes = await ai.generate({
            model: imagen3Fast,
            prompt: `Ilustrasi sekolah islam modern madrasah diniyah, gaya bersih dan profesional: ${input.message}`,
          });
          if (imageRes.media?.url) {
            generatedImage = imageRes.media.url;
          }
        } catch (e) {
          console.warn("Image generation skipped due to error:", e);
        }
      }

      return {
        ...output,
        generatedImage
      };
    } catch (innerError) {
      console.error("Structured AI generation failed, falling back to simple text:", innerError);
      // Final Fallback: Simple text generation
      try {
        const fallback = await ai.generate({
          model: gemini15Flash,
          prompt: input.message,
          system: "Jawablah sebagai asisten administrasi sekolah dalam Bahasa Indonesia yang ramah."
        });
        return { text: fallback.text || "Saya memahami permintaan Anda, namun saat ini saya hanya bisa merespon dalam bentuk teks." };
      } catch (finalError) {
        throw finalError;
      }
    }
  }
);
