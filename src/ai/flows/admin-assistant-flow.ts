'use server';
/**
 * @fileOverview AI Assistant flow for Admin tasks.
 * Handles database searches, content drafting, and image generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

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
  suggestedAction: z.object({
    type: z.enum(['create_announcement', 'find_student', 'find_teacher', 'none']),
    data: z.any()
  }).optional()
});

export type AdminAssistantOutput = z.infer<typeof AdminAssistantOutputSchema>;

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
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `You are a helpful AI Assistant for the Administrator of 'Madrasah Diniyah Ibnu Ahmad'. 
      Your goal is to help find data, draft announcements, and manage school info. 
      You should be professional, polite, and use Indonesian language.
      
      If the user wants an image (e.g. for an announcement), use your internal knowledge to describe it, but the UI will handle specific triggers.
      If the user wants to create an announcement, suggest a title and content.`,
      prompt: input.message,
      messages: input.history,
    });

    let generatedImage: string | undefined;

    // Logic to trigger image generation if keywords are found
    const lowerMessage = input.message.toLowerCase();
    if (lowerMessage.includes('buat gambar') || lowerMessage.includes('generate image') || lowerMessage.includes('buatkan poster')) {
      try {
        const { media } = await ai.generate({
          model: 'googleai/imagen-4.0-fast-generate-001',
          prompt: input.message,
        });
        if (media?.url) {
          generatedImage = media.url;
        }
      } catch (e) {
        console.error("Image generation failed", e);
      }
    }

    return {
      text: response.text,
      generatedImage,
    };
  }
);
