

# Plan: Switch from Lovable AI Gateway to Direct Google Gemini API

## What's Changing

The `generate-report` edge function currently calls the Lovable AI Gateway (`ai.gateway.lovable.dev`) using `LOVABLE_API_KEY`, which has run out of credits. We'll switch to calling Google's Gemini API directly using your own API key and $300 in Google Cloud credits.

## Steps

### 1. Add your Gemini API key as a secret
You'll be prompted to paste your API key (starts with `AIza...`). It will be stored securely and accessible only from backend functions.

### 2. Update the `callGemini` function in `supabase/functions/generate-report/index.ts`

**Current:** Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with OpenAI-compatible format and `LOVABLE_API_KEY`.

**New:** Calls `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with `GEMINI_API_KEY`.

The model name mapping:
- `google/gemini-2.5-pro` becomes `gemini-2.5-pro`
- `google/gemini-2.5-flash` becomes `gemini-2.5-flash`

The request format changes from OpenAI chat completions to Google's native Gemini format:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=API_KEY

{
  "contents": [
    { "role": "user", "parts": [{ "text": "..." }] }
  ],
  "systemInstruction": { "parts": [{ "text": "..." }] }
}
```

Response parsing changes from `result.choices[0].message.content` to `result.candidates[0].content.parts[0].text`.

### 3. No other files change
The rest of the pipeline (TinyFish calls, SSE streaming, frontend) stays exactly the same. Only the AI call routing changes.

## Risk
Very low -- same models, same prompts, just a different API endpoint. Your $300 Google Cloud credits will cover thousands of reports.

