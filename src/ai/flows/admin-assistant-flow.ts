'use server';
/**
 * @fileOverview Alur AI Assistant untuk tugas Admin.
 * Membantu admin dalam mencari data, menyusun konten, dan membuat dokumen PDF/Gambar.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminAssistantInputSchema = z.object({
  message: z.string().describe('Pesan atau permintaan dari admin.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() }))
  })).optional(),
});

export type AdminAssistantInput = z.infer<typeof AdminAssistantInputSchema>;

const AdminAssistantOutputSchema = z.object({
  text: z.string().describe('Respon teks utama dari AI.'),
  generatedImage: z.string().optional().describe('Data URI gambar jika diminta.'),
  generatedPdf: z.object({
    title: z.string(),
    content: z.string(),
    filename: z.string()
  }).optional().describe('Konten terstruktur untuk PDF jika diminta.')
});

export type AdminAssistantOutput = z.infer<typeof AdminAssistantOutputSchema>;

/**
 * Fungsi utama untuk interaksi chat admin.
 */
export async function adminAssistantChat(input: AdminAssistantInput): Promise<AdminAssistantOutput> {
  try {
    return await adminAssistantFlow(input);
  } catch (error: any) {
    console.error("AI Assistant Flow Error:", error);
    // Pesan yang lebih deskriptif untuk user
    return { 
      text: "Asisten AI sedang mengalami kendala teknis saat memproses permintaan Anda. Harap coba beberapa saat lagi." 
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
    const systemPrompt = `Anda adalah asisten AI profesional untuk Administrator 'Madrasah Diniyah Ibnu Ahmad'.
    Gunakan Bahasa Indonesia yang sopan dan formal.
    
    Tugas Anda:
    1. Membantu administrasi sekolah (draf surat, pengumuman, laporan).
    2. Memberikan saran terkait pengelolaan santri dan guru.
    3. Jika diminta membuat PDF, susun judul dan konten yang rapi di field 'generatedPdf'.
    4. Jika diminta membuat gambar, sebutkan di teks bahwa Anda sedang memprosesnya.`;

    try {
      // Menggunakan identifier model yang lebih andal untuk API v1beta
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        system: systemPrompt,
        messages: [
          ...(input.history || []),
          { role: 'user', content: [{ text: input.message }] }
        ],
        output: { schema: AdminAssistantOutputSchema },
        config: {
          temperature: 0.4,
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ]
        }
      });

      const result = response.output;
      if (!result) throw new Error("AI output was null");

      // Cek apakah pengguna minta gambar secara eksplisit
      const lowerMsg = input.message.toLowerCase();
      const imgKeywords = ['buatkan gambar', 'buatkan poster', 'buatkan ilustrasi', 'generate image'];
      const wantsImage = imgKeywords.some(k => lowerMsg.includes(k));
      
      if (wantsImage && !result.generatedImage) {
        try {
          const imageRes = await ai.generate({
            model: 'googleai/imagen-3-fast',
            prompt: `Ilustrasi profesional untuk madrasah diniyah modern: ${input.message}`,
          });
          if (imageRes.media?.url) {
            result.generatedImage = imageRes.media.url;
          }
        } catch (imgErr) {
          console.warn("Image generation failed silently:", imgErr);
        }
      }

      return result;

    } catch (err) {
      console.error("Structured generation failed, using simple text fallback:", err);
      
      // Jalur penyelamat: Generasi teks murni tanpa skema
      try {
        const simpleResponse = await ai.generate({
          model: 'googleai/gemini-1.5-flash-latest',
          system: "Anda adalah asisten madrasah. Jawablah dengan ramah dalam Bahasa Indonesia.",
          prompt: input.message
        });
        return { text: simpleResponse.text || "Maaf, saya tidak dapat merespon saat ini." };
      } catch (finalErr) {
        throw finalErr;
      }
    }
  }
);
