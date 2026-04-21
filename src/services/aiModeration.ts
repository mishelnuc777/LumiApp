import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const moderateContent = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Actúa como moderador experimentado para LUMI, una red social profesional para enfermería. 
      Analiza el siguiente contenido para:
      1. Desinformación médica o consejos de salud peligrosos.
      2. Acoso, toxicidad o lenguaje de odio.
      3. Spam o contenido irrelevante.
      
      IMPORTANTE: Si detectas lenguaje técnico de enfermería o dudas profesionales legítimas, NO las marques como inseguras a menos que promuevan prácticas claramente dañinas.
      
      Devuelve un objeto JSON: { "isSafe": boolean, "reason": string | null, "medicalFlag": boolean }. 
      Si medicalFlag es true, significa que el contenido trata sobre temas médicos sensibles pero no es necesariamente inseguro (solo necesita una etiqueta de advertencia).
      
      Contenido: "${text}"`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{"isSafe": true, "reason": null, "medicalFlag": false}');
  } catch (error) {
    console.error("Moderation error:", error);
    return { isSafe: true, reason: null, medicalFlag: false };
  }
};
