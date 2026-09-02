'use server';
/**
 * @fileOverview Alur AI Assistant untuk tugas administratif Madrasah.
 * Menangani permintaan teks dan pembuatan draf dokumen PDF.
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
  }).optional().describe('Data terstruktur HANYA jika admin meminta pembuatan dokumen, surat, atau PDF.')
});

export type AdminAssistantOutput = z.infer<typeof AdminAssistantOutputSchema>;

/**
 * Registrasi Flow AI Assistant.
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
        system: `Anda adalah asisten AI profesional untuk Administrator 'Madrasah Diniyah Ibnu Ahmad'.
        
Tugas utama Anda:
1. Memberikan informasi administratif dan menjawab pertanyaan seputar operasional sekolah.
2. Menyusun draf surat resmi, pengumuman, atau dokumen madrasah lainnya.

ATURAN PENTING:
- Jika admin HANYA bertanya atau mengobrol biasa, berikan respon di field 'text' saja. JANGAN menyertakan 'generatedPdf'.
- HANYA jika admin meminta "buatkan surat", "buatkan PDF", "draf dokumen", atau kata kunci serupa, Anda WAJIB mengisi objek 'generatedPdf' dengan konten yang lengkap dan rapi.
- Gunakan Bahasa Indonesia yang formal, sopan, dan sesuai kaidah surat menyurat resmi.
- Dilarang keras membuat atau menawarkan pembuatan gambar. Fokus hanya pada TEKS dan PDF.`,
        messages: [
          ...(input.history || []),
          { role: 'user', content: [{ text: input.message }] }
        ],
      });

      const output = response.output;
      
      if (!output) {
        return { text: "Maaf, sistem sedang mengalami kendala dalam merumuskan jawaban. Mohon coba lagi." };
      }

      return output;
    } catch (error: any) {
      console.error("AI Assistant Flow Error:", error);
      // Fallback sederhana jika terjadi kegagalan pada output terstruktur
      return { 
        text: "Mohon maaf, terjadi gangguan koneksi ke pusat data AI. Saya tetap bisa membantu menjawab pertanyaan teks sederhana jika ada kendala pada fitur PDF." 
      };
    }
  }
);
