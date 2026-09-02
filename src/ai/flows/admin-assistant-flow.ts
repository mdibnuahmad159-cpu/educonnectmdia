'use server';
/**
 * @fileOverview Alur AI Assistant untuk tugas administrasi Madrasah.
 * Menangani permintaan teks, pencarian data, dan penyusunan draf dokumen PDF.
 *
 * - adminAssistantChat - Fungsi utama untuk berinteraksi dengan asisten AI.
 * - AdminAssistantInput - Tipe input untuk fungsi asisten.
 * - AdminAssistantOutput - Tipe output untuk fungsi asisten.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminAssistantInputSchema = z.object({
  message: z.string().describe('Pesan atau instruksi dari admin.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() }))
  })).optional().describe('Riwayat percakapan sebelumnya.'),
});

export type AdminAssistantInput = z.infer<typeof AdminAssistantInputSchema>;

const AdminAssistantOutputSchema = z.object({
  text: z.string().describe('Teks respon utama dari AI dalam Bahasa Indonesia.'),
  generatedPdf: z.object({
    title: z.string().describe('Judul dokumen untuk PDF.'),
    content: z.string().describe('Isi teks lengkap untuk dokumen PDF.'),
    filename: z.string().describe('Nama file yang disarankan (tanpa ekstensi).')
  }).optional().describe('Data terstruktur jika pengguna meminta draf surat/dokumen.')
});

export type AdminAssistantOutput = z.infer<typeof AdminAssistantOutputSchema>;

/**
 * Mendefinisikan prompt dengan instruksi sistem yang kuat.
 */
const assistantPrompt = ai.definePrompt({
  name: 'adminAssistantPrompt',
  input: { schema: AdminAssistantInputSchema },
  output: { schema: AdminAssistantOutputSchema },
  config: {
    temperature: 0.5,
  },
  prompt: `Anda adalah asisten administrasi profesional untuk 'Madrasah Diniyah Ibnu Ahmad'.
  
Tugas Anda:
1. Membantu admin mencari informasi (simulasikan pengetahuan Anda tentang sistem sekolah).
2. Menyusun draf pengumuman, surat resmi, atau berita madrasah.
3. Selalu gunakan Bahasa Indonesia yang formal, sopan, dan ramah.

Jika pengguna meminta "surat", "draf PDF", atau "dokumen resmi", Anda HARUS mengisi objek 'generatedPdf' dengan konten yang rapi.

Riwayat Percakapan:
{{#each history}}
{{role}}: {{#each content}}{{{text}}}{{/each}}
{{/each}}

Pesan Terbaru:
user: {{{message}}}`
});

/**
 * Registrasi Flow AI untuk Chat Administrasi.
 */
const assistantFlow = ai.defineFlow(
  {
    name: 'adminAssistantFlow',
    inputSchema: AdminAssistantInputSchema,
    outputSchema: AdminAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await assistantPrompt(input, {
      model: 'googleai/gemini-1.5-flash',
    });
    
    if (!output) {
      return { text: "Maaf, saya tidak dapat memproses permintaan tersebut saat ini." };
    }
    
    return output;
  }
);

/**
 * Wrapper fungsi untuk dipanggil dari komponen klien.
 */
export async function adminAssistantChat(input: AdminAssistantInput): Promise<AdminAssistantOutput> {
  try {
    return await assistantFlow(input);
  } catch (error) {
    console.error("AI Assistant Flow Error:", error);
    return { 
      text: "Maaf, terjadi kendala teknis pada pusat data AI. Saya akan segera kembali aktif." 
    };
  }
}
