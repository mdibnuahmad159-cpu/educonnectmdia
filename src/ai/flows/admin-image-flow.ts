'use server';
/**
 * @fileOverview Alur AI khusus untuk pembuatan gambar ilustrasi administrasi.
 * Memisahkan proses gambar untuk mencegah timeout pada chat utama.
 *
 * - generateAdminImage - Fungsi untuk membuat gambar dari teks.
 * - AdminImageInput - Tipe input untuk pembuatan gambar.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminImageInputSchema = z.object({
  prompt: z.string().describe('Deskripsi gambar yang ingin dibuat.'),
});

export type AdminImageInput = z.infer<typeof AdminImageInputSchema>;

const imageFlow = ai.defineFlow(
  {
    name: 'adminImageFlow',
    inputSchema: AdminImageInputSchema,
    outputSchema: z.string().nullable(),
  },
  async (input) => {
    try {
      const { media } = await ai.generate({
        model: 'googleai/imagen-3-fast-generate-001',
        prompt: `Ilustrasi profesional untuk lingkungan madrasah/sekolah islam: ${input.prompt}. Gaya bersih, digital art, berkualitas tinggi.`,
      });
      
      return media?.url || null;
    } catch (error) {
      console.error("Image Generation Flow Error:", error);
      return null;
    }
  }
);

/**
 * Wrapper fungsi untuk pembuatan gambar.
 */
export async function generateAdminImage(promptText: string): Promise<string | null> {
  try {
    return await imageFlow({ prompt: promptText });
  } catch (err) {
    return null;
  }
}
