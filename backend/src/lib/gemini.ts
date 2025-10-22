import { GoogleGenerativeAI } from "@google/generative-ai";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface AIRequest {
    prompt: string;
    framework?: string;
    context?: {
        fileName?: string;
        code?: string;
        errorMessage?: string;
    };
}

interface AIResponse {
    response: string;
    tokensUsed?: number;
}

// Framework-specific system prompts to guide the AI
const getSystemPrompt = (framework: string): string => {
    const basePrompt = `You are a helpful coding assistant for a web development competition. 
Your role is to provide concise, practical guidance to help developers debug and solve coding problems.

Rules:
- Keep responses brief and actionable (max 300 words)
- Focus on the specific issue they're asking about
- Provide code snippets when helpful
- Don't write entire solutions, guide them to the answer
- Be encouraging and supportive
`;

    const frameworkGuides: Record<string, string> = {
        NEXTJS: `
The team is using Next.js (React framework with SSR/SSG).
Common issues: routing, API routes, getServerSideProps, useEffect hooks, hydration errors.
Guide them towards Next.js best practices and React hooks patterns.`,

        REACT_VITE: `
The team is using React with Vite (fast build tool).
Common issues: component state, props, hooks, event handlers, conditional rendering.
Guide them towards modern React patterns and ES6+ JavaScript.`,

        VUE: `
The team is using Vue.js 3 (Composition API).
Common issues: reactive state, computed properties, watchers, component communication, v-for/v-if directives.
Guide them towards Vue 3 Composition API patterns.`,

        ANGULAR: `
The team is using Angular (TypeScript framework).
Common issues: component decorators, dependency injection, services, observables, routing, forms.
Guide them towards Angular best practices and RxJS patterns.`,

        SVELTE: `
The team is using Svelte (compiled reactive framework).
Common issues: reactive declarations, stores, component props, event forwarding, transitions.
Guide them towards Svelte's reactive patterns and compiler-friendly code.`,

        STATIC: `
The team is using vanilla HTML/CSS/JavaScript.
Common issues: DOM manipulation, event listeners, async/await, CSS layout, responsive design.
Guide them towards modern vanilla JavaScript and CSS best practices.`,
    };

    return basePrompt + (frameworkGuides[framework] || frameworkGuides.STATIC);
};

export const askGemini = async ({ prompt, framework = "NEXTJS", context }: AIRequest): Promise<AIResponse> => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY not configured");
        }

        // Get the generative model (gemini-pro for text)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Build the full prompt with context
        let fullPrompt = getSystemPrompt(framework) + "\n\n";
        
        if (context?.fileName) {
            fullPrompt += `File: ${context.fileName}\n`;
        }
        
        if (context?.code) {
            fullPrompt += `Current code:\n\`\`\`\n${context.code.substring(0, 2000)}\n\`\`\`\n\n`;
        }
        
        if (context?.errorMessage) {
            fullPrompt += `Error message:\n${context.errorMessage}\n\n`;
        }
        
        fullPrompt += `Question: ${prompt}\n\nProvide a helpful, concise response:`;

        // Generate content with timeout
        const result = await Promise.race([
            model.generateContent(fullPrompt),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error("AI request timeout")), 30000)
            )
        ]) as any;

        const response = result.response;
        const text = response.text();

        return {
            response: text,
            tokensUsed: response.usageMetadata?.totalTokenCount || 0,
        };
    } catch (error: any) {
        console.error("Gemini AI error:", error);
        
        // Return helpful error messages based on error type
        if (error.message?.includes("API_KEY")) {
            throw new Error("AI service configuration error. Please contact support.");
        } else if (error.message?.includes("timeout")) {
            throw new Error("AI request timed out. Please try again with a simpler question.");
        } else if (error.message?.includes("quota")) {
            throw new Error("AI service temporarily unavailable. Please try again later.");
        } else {
            throw new Error("Failed to get AI response. Please try again.");
        }
    }
};

// Test function to verify Gemini API key is valid
export const testGeminiConnection = async (): Promise<boolean> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        return result.response.text().length > 0;
    } catch (error) {
        console.error("Gemini connection test failed:", error);
        return false;
    }
};
