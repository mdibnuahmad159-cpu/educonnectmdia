'use server';
/**
 * @fileOverview Alur AI Assistant untuk tugas Admin.
 * Memisahkan teks dan gambar untuk mencegah timeout dan meningkatkan keandalan sistem.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminAssistantInputSchema = z.object({
  message: z.string().describe('Pesan dari admin.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() }))
  })).optional(),
});

export type AdminAssistantInput = z.infer<typeof AdminAssistantInputSchema>;

const AdminAssistantOutputSchema = z.object({
  text: z.string().describe('Respon teks utama dari AI.'),
  generatedPdf: z.object({
    title: z.string(),
    content: z.string(),
    filename: z.string()
  }).optional().describe('Konten terstruktur untuk PDF jika diminta.')
});

export type AdminAssistantOutput = z.infer<typeof AdminAssistantOutputSchema>;

/**
 * Fungsi Chat Utama: Menangani teks dan struktur PDF.
 */
export async function adminAssistantChat(input: AdminAssistantInput): Promise<AdminAssistantOutput> {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `Anda adalah asisten AI profesional untuk Madrasah Diniyah Ibnu Ahmad.
      Gunakan Bahasa Indonesia yang sopan dan formal.
      Bantu admin menyusun pengumuman, surat, atau mencari informasi.
      Jika user meminta dokumen/surat dalam PDF, isi field 'generatedPdf' dengan struktur yang rapi.`,
      messages: [
        ...(input.history || []),
        { role: 'user', content: [{ text: input.message }] }
      ],
      output: { schema: AdminAssistantOutputSchema },
      config: {
        temperature: 0.4,
      }
    });

    if (response.output) {
      return response.output;
    }
    
    return { text: response.text || "Saya telah memproses permintaan Anda." };

  } catch (error) {
    console.error("AI Chat Action Error:", error);
    
    // Jalur penyelamat: Gunakan teks murni jika output terstruktur gagal
    try {
      const fallback = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        system: "Anda adalah asisten madrasah. Jawablah dengan ramah dalam Bahasa Indonesia.",
        prompt: input.message,
      });
      return { text: fallback.text || "Maaf, terjadi kendala saat memproses data terstruktur." };
    } catch (finalErr) {
      return { text: "Sistem AI sedang tidak tersedia sementara. Harap coba lagi beberapa saat lagi." };
    }
  }
}

/**
 * Fungsi Generasi Gambar: Terpisah agar tidak menyebabkan timeout pada chat utama.
 */
export async function generateAssistantImage(prompt: string): Promise<string | null> {
  try {
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Ilustrasi profesional berkualitas tinggi untuk madrasah diniyah: ${prompt}`,
    });
    return media?.url || null;
  } catch (err) {
    console.error("Image Generation Action Error:", err);
    return null;
  }
}
