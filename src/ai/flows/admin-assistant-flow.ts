'use server';
/**
 * @fileOverview AI Assistant flow for Admin tasks.
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
    console.error("AI Assistant Critical Error:", error);
    return { 
      text: "Mohon maaf, sistem sedang mengalami gangguan komunikasi sementara. Silakan coba kirimkan kembali pesan Anda." 
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
    const systemPrompt = `Anda adalah asisten AI profesional untuk Admin 'Madrasah Diniyah Ibnu Ahmad'.
    Gunakan Bahasa Indonesia yang sopan dan formal.
    
    Tugas Anda:
    1. Membantu administrasi sekolah (draf surat, pengumuman, laporan).
    2. Memberikan saran terkait pengelolaan santri dan guru.
    3. Jika diminta membuat gambar, berikan deskripsi visual yang sesuai.
    4. Jika diminta membuat PDF, susun judul dan konten yang rapi di field 'generatedPdf'.`;

    try {
      // 1. Mencoba generasi terstruktur
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        system: systemPrompt,
        prompt: input.message,
        messages: input.history,
        output: { schema: AdminAssistantOutputSchema }
      });

      const result = response.output;
      if (!result) throw new Error("AI tidak memberikan output terstruktur.");

      // 2. Cek apakah pengguna minta gambar dan AI belum memberikannya
      const lowerMsg = input.message.toLowerCase();
      const needsImage = ['gambar', 'foto', 'ilustrasi', 'poster'].some(k => lowerMsg.includes(k));
      
      if (needsImage && !result.generatedImage) {
        try {
          const imageRes = await ai.generate({
            model: 'googleai/imagen-3-fast',
            prompt: `Ilustrasi sekolah islam modern madrasah diniyah: ${input.message}`,
          });
          if (imageRes.media?.url) {
            result.generatedImage = imageRes.media.url;
          }
        } catch (imgErr) {
          console.warn("Gagal membuat gambar, lanjut dengan teks saja.");
        }
      }

      return result;

    } catch (err) {
      console.error("Structured generation failed, falling back to basic text:", err);
      
      // 3. JALUR PENYELAMAT (Fallback): Generasi teks biasa jika yang terstruktur gagal
      try {
        const fallback = await ai.generate({
          model: 'googleai/gemini-1.5-flash',
          system: "Anda adalah asisten madrasah. Jawablah dengan ramah dalam Bahasa Indonesia.",
          prompt: input.message
        });
        return { text: fallback.text || "Maaf, saya tidak dapat memproses permintaan Anda saat ini." };
      } catch (finalErr) {
        return { text: "Sistem AI sedang sibuk. Mohon tunggu beberapa saat lagi." };
      }
    }
  }
);
