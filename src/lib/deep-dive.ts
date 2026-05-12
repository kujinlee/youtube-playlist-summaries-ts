import { spawn } from 'child_process';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { SUMMARIES_DIR, PDF_DIR } from './config';
import type { Video } from '@/types';

const MODEL = 'gemini-2.5-pro';

export function deepDiveFilename(video: Video): string {
  return video.filename.replace('.md', '_dive.md');
}

const PROMPT = `\
You are writing a comprehensive deep-dive analysis of this YouTube video for a curated playlist called "Agentic AI. Claude Code".

Video details:
  Title   : {title}
  Channel : {channel}
  Link    : https://www.youtube.com/watch?v={video_id}
  Type    : {type}
  Audience: {audience}

Watch the full video carefully, including all visual content (slides, whiteboards, diagrams, code on screen).

Write a thorough, structured analysis {lang_instruction}. This is NOT a quick summary — go deep. Cover everything of substance.

**Formatting rules — follow strictly:**
- Mathematical equations: use LaTeX. Inline: $equation$. Display/block: $$equation$$
- Architecture diagrams, flowcharts, system diagrams: use Mermaid code blocks (\`\`\`mermaid ... \`\`\`) with these strict rules:
  - Always use \`graph TD\` (top-down), never \`graph LR\` — LR diagrams overflow the page width
  - Never use double quotes inside node labels; use plain text or single quotes: \`A[label]\` or \`A["label with 'inner' quotes"]\`
  - Never use \`""\` as an escape — replace any literal double-quote in a label with a single quote or omit it
  - Keep each diagram to 6 nodes or fewer; split large flows into multiple focused diagrams
- Code shown on screen: reproduce in fenced code blocks with the correct language tag
- For whiteboard derivations: capture the full mathematical development step-by-step in LaTeX

Use this exact document structure:

# {title} — Deep Dive

**Channel:** {channel}
**Link:** https://www.youtube.com/watch?v={video_id}
**Type:** {type} | **Audience:** {audience}

---

## Overview

[3–4 sentence description of what the video covers, the speaker's perspective, and why it matters for Claude Code / agentic AI practitioners.]

## Detailed Breakdown

[Comprehensive section-by-section analysis. For each major topic create a ### subsection. Include:
- What was said and shown
- Key quotes or paraphrased insights (> blockquote format)
- All equations in LaTeX
- All diagrams as Mermaid
- Code examples in fenced blocks]

## Key Techniques & Commands

[Bullet list of every concrete technique, command, flag, file, or API name mentioned. Be specific.]

## Concepts & Mental Models

[The frameworks, analogies, or mental models the speaker uses. Render any supporting equations or diagrams here too.]

## Actionable Takeaways

[Numbered list of things a Claude Code practitioner can do after watching, ordered by impact.]

## Connections & Context

[How this video relates to broader agentic AI trends. What does it build on or challenge? What to watch next?]

---
*Deep dive generated from video analysis. Part of the "Agentic AI. Claude Code" playlist.*
`;

export function generateDeepDivePdf(video: Video): Promise<void> {
  const mdPath  = path.join(SUMMARIES_DIR, deepDiveFilename(video));
  const pdfPath = path.join(PDF_DIR, deepDiveFilename(video).replace('.md', '.pdf'));

  return new Promise((resolve, reject) => {
    const proc = spawn('pandoc', [
      mdPath, '-o', pdfPath,
      '--pdf-engine=xelatex',
      '-V', 'geometry:margin=1in',
      '-V', 'colorlinks=true',
      '-V', 'linkcolor=blue',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.setEncoding('utf-8');
    proc.stderr.on('data', (c: string) => { stderr += c; });
    proc.on('close', code => {
      if (code !== 0) reject(new Error(`pandoc exited ${code}: ${stderr.slice(0, 500)}`));
      else resolve();
    });
    proc.on('error', reject);
  });
}

export async function generateDeepDive(video: Video): Promise<string> {
  const prompt = PROMPT
    .replace(/{title}/g,            video.title)
    .replace(/{video_id}/g,         video.id)
    .replace(/{channel}/g,          video.channel)
    .replace(/{type}/g,             video.type)
    .replace(/{audience}/g,         video.audience)
    .replace(/{lang_instruction}/g, video.lang === 'KR' ? 'in Korean' : 'in English');

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
  const response = await client.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { fileData: { fileUri: `https://www.youtube.com/watch?v=${video.id}` } },
          { text: prompt },
        ],
      },
    ],
  });
  return response.text ?? '';
}
