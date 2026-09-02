'use server';
/**
 * @fileOverview Alur AI Assistant yang handal untuk tugas administratif Madrasah.
 * Fokus pada respon teks dan pembuatan draf dokumen PDF secara terstruktur.
 *
 * - adminAssistantChat - Fungsi utama untuk interaksi asisten.
 * - AdminAssistantInput - Tipe input untuk asisten.
 * - AdminAssistantOutput - Tipe return untuk asisten.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminAssistantInputSchema = z.object({
  message: z.string().describe('Pesan atau permintaan dari admin.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() }))
  })).optional().describe('Riwayat percakapan sebelumnya.'),
});

export type AdminAssistantInput = z.infer<typeof AdminAssistantInputSchema>;

const AdminAssistantOutputSchema = z.object({
  text: z.string().describe('Respon teks utama dalam Bahasa Indonesia.'),
  generatedPdf: z.object({
    title: z.string().describe('Judul dokumen untuk PDF.'),
    content: z.string().describe('Konten teks lengkap untuk isi dokumen PDF.'),
    filename: z.string().describe('Saran nama file (tanpa ekstensi).')
  }).optional().describe('Data terstruktur hanya jika admin meminta pembuatan dokumen.')
});

export type AdminAssistantOutput = z.infer<typeof AdminAssistantOutputSchema>;

/**
 * Fungsi utama untuk chat dengan asisten admin.
 */
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
    try {
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        output: { schema: AdminAssistantOutputSchema },
        config: {
            temperature: 0.4, // Suhu rendah untuk konsistensi tinggi pada data terstruktur
        },
        system: `Anda adalah asisten AI profesional untuk Administrator 'Madrasah Diniyah Ibnu Ahmad'.
        
Tugas Anda adalah membantu tugas operasional dan administratif sekolah.
ATURAN OPERASIONAL:
1. Jika admin hanya bertanya, memberikan informasi, atau menyapa, berikan respon di field 'text' saja. JANGAN menyertakan 'generatedPdf'.
2. HANYA jika admin secara eksplisit meminta "buatkan surat", "buatkan PDF", "draf dokumen", atau kata kunci serupa, Anda WAJIB mengisi objek 'generatedPdf' dengan konten yang lengkap dan formal.
3. Gunakan Bahasa Indonesia yang sangat sopan dan sesuai standar administrasi sekolah Islam.
4. DILARANG keras menawarkan atau mencoba membuat gambar. Fokus hanya pada TEKS dan DOKUMEN.`,
        messages: [
          ...(input.history || []),
          { role: 'user', content: [{ text: input.message }] }
        ],
      });

      const output = response.output;
      
      if (!output) {
        return { text: "Maaf, saya tidak dapat merumuskan jawaban saat ini. Silakan coba ajukan pertanyaan lain." };
      }

      return output;
    } catch (error: any) {
      console.error("Critical AI Flow Error:", error);
      // Fallback: mencoba memberikan respon teks sederhana jika pemrosesan output terstruktur gagal
      return { 
        text: "Mohon maaf, pusat data AI sedang mengalami kendala teknis sementara. Namun, saya tetap bisa membantu Anda secara manual jika Anda memiliki pertanyaan spesifik tentang data madrasah." 
      };
    }
  }
);
