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

const adminPrompt = ai.definePrompt({
  name: 'adminAssistantPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: AdminAssistantInputSchema },
  output: { schema: AdminAssistantOutputSchema },
  config: {
    temperature: 0.4,
  },
  system: `Anda adalah asisten AI profesional untuk Administrator 'Madrasah Diniyah Ibnu Ahmad'.

Tugas Anda adalah membantu tugas operasional dan administratif sekolah melalui teks dan draf dokumen.

ATURAN OPERASIONAL:
1. JAWABAN TEKS: Berikan respon teks di field 'text'. Gunakan Bahasa Indonesia yang sangat sopan, formal, dan sesuai standar administrasi sekolah Islam.
2. DOKUMEN PDF: HANYA jika admin secara eksplisit meminta "buatkan surat", "buatkan draf PDF", "buatkan pengumuman resmi", atau dokumen serupa, isi field 'generatedPdf' dengan konten yang lengkap.
3. TANPA DOKUMEN: Jika admin hanya bertanya, memberikan info, atau tidak meminta dokumen secara eksplisit, JANGAN isi field 'generatedPdf' (biarkan undefined).
4. TANPA GAMBAR: DILARANG keras mencoba membuat atau menawarkan gambar ilustrasi. Fokus hanya pada TEKS dan DOKUMEN.`,
  prompt: `{{#if history}}
Riwayat percakapan sebelumnya:
{{#each history}}
- {{role}}: {{#each content}}{{{text}}}{{/each}}
{{/each}}
{{/if}}

Permintaan Admin saat ini: {{{message}}}`,
});

const adminAssistantFlow = ai.defineFlow(
  {
    name: 'adminAssistantFlow',
    inputSchema: AdminAssistantInputSchema,
    outputSchema: AdminAssistantOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await adminPrompt(input);
      
      if (!output) {
        return { text: "Maaf, saya tidak dapat merumuskan jawaban saat ini. Silakan coba ajukan pertanyaan lain." };
      }

      return output;
    } catch (error: any) {
      console.error("Critical AI Flow Error:", error);
      return { 
        text: "Mohon maaf, pusat data AI sedang mengalami kendala teknis sementara. Saya tetap siap membantu Anda secara manual jika ada kendala administrasi yang mendesak." 
      };
    }
  }
);
