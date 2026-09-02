'use server';
/**
 * @fileOverview AI Assistant flow for Madrasah administrative tasks.
 * Handles text queries and generates PDF document drafts upon request.
 *
 * - adminAssistantChat - Main function to interact with the AI assistant.
 * - AdminAssistantInput - Input type for the assistant function.
 * - AdminAssistantOutput - Return type for the assistant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminAssistantInputSchema = z.object({
  message: z.string().describe('The user message or request.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() }))
  })).optional().describe('Previous conversation history.'),
});

export type AdminAssistantInput = z.infer<typeof AdminAssistantInputSchema>;

const AdminAssistantOutputSchema = z.object({
  text: z.string().describe('The main text response in Indonesian.'),
  generatedPdf: z.object({
    title: z.string().describe('The document title for the PDF.'),
    content: z.string().describe('The full text content for the PDF document.'),
    filename: z.string().describe('Suggested filename (without extension).')
  }).optional().describe('Structured data only if the user specifically asks for a document, letter, or PDF.')
});

export type AdminAssistantOutput = z.infer<typeof AdminAssistantOutputSchema>;

/**
 * Define the prompt with strict instructions.
 */
const assistantPrompt = ai.definePrompt({
  name: 'adminAssistantPrompt',
  input: { schema: AdminAssistantInputSchema },
  output: { schema: AdminAssistantOutputSchema },
  config: {
    temperature: 0.4,
  },
  prompt: `Anda adalah asisten administrasi profesional untuk 'Madrasah Diniyah Ibnu Ahmad'.
  
Tugas Anda:
1. Memberikan informasi administratif dan menjawab pertanyaan seputar sistem sekolah.
2. Menyusun draf surat resmi, pengumuman, atau berita madrasah.
3. Gunakan Bahasa Indonesia yang formal dan sopan.

ATURAN PENTING:
- Jika pengguna HANYA bertanya atau mengobrol, berikan respon di field 'text' saja. JANGAN mengisi 'generatedPdf'.
- Jika pengguna meminta "buatkan surat", "buatkan PDF", "draf dokumen", atau kata kunci serupa, Anda HARUS mengisi objek 'generatedPdf' dengan konten dokumen yang lengkap dan rapi.
- Jangan pernah menawarkan pembuatan gambar karena fitur tersebut sudah ditiadakan.

Riwayat Percakapan:
{{#each history}}
{{role}}: {{#each content}}{{{text}}}{{/each}}
{{/each}}

Pesan Terbaru:
user: {{{message}}}`
});

/**
 * Registration of the flow.
 */
const assistantFlow = ai.defineFlow(
  {
    name: 'adminAssistantFlow',
    inputSchema: AdminAssistantInputSchema,
    outputSchema: AdminAssistantOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await assistantPrompt(input, {
        model: 'googleai/gemini-1.5-flash',
      });
      
      if (!output) {
        return { text: "Maaf, saya sedang tidak dapat memproses permintaan tersebut." };
      }
      
      return output;
    } catch (error) {
      console.error("AI Assistant Flow Error:", error);
      // Fallback response to avoid crash
      return { 
        text: "Maaf, terjadi kendala komunikasi dengan pusat data AI. Mohon coba lagi dalam beberapa saat." 
      };
    }
  }
);

/**
 * Wrapper for the client component.
 */
export async function adminAssistantChat(input: AdminAssistantInput): Promise<AdminAssistantOutput> {
  return assistantFlow(input);
}
