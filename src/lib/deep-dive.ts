import { spawn } from 'child_process';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { SUMMARIES_DIR, PDF_DIR } from './config';
import type { Video } from '@/types';

const MODEL = 'gemini-2.5-pro';
const TRANSCRIPT_THRESHOLD_SECONDS = 50 * 60; // 50 minutes

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
- Architecture diagrams, flowcharts, system diagrams: use ASCII art inside a plain fenced code block (\`\`\`). Rules:
  - Use +-----+ boxes, | vertical lines, --> or -> arrows, v and ^ for vertical flow
  - Keep each diagram ≤ 60 characters wide
  - Example style:
    \`\`\`
    [Input] --> [Process] --> [Output]
                    |
                    v
               [Side Effect]
    \`\`\`
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

async function fetchTranscript(videoId: string): Promise<string> {
  const { YoutubeTranscript } = await import('youtube-transcript');
  const items = await YoutubeTranscript.fetchTranscript(videoId);
  return (items as { text: string }[]).map(i => i.text).join(' ');
}

export async function generateDeepDive(
  video: Video,
  log?: (msg: string) => void,
): Promise<string> {
  const prompt = PROMPT
    .replace(/{title}/g,            video.title)
    .replace(/{video_id}/g,         video.id)
    .replace(/{channel}/g,          video.channel)
    .replace(/{type}/g,             video.type)
    .replace(/{audience}/g,         video.audience)
    .replace(/{lang_instruction}/g, video.lang === 'KR' ? 'in Korean' : 'in English');

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

  const isLong = (video.duration ?? 0) > TRANSCRIPT_THRESHOLD_SECONDS;

  if (!isLong) {
    try {
      log?.('Analysing video with Gemini (audio + visuals)…');
      const response = await client.models.generateContent({
        model: MODEL,
        contents: [{
          role: 'user',
          parts: [
            { fileData: { fileUri: `https://www.youtube.com/watch?v=${video.id}` } },
            { text: prompt },
          ],
        }],
      });
      return response.text ?? '';
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('input token count exceeds')) throw e;
      log?.('Video too long for native analysis — falling back to transcript…');
    }
  } else {
    const mins = Math.round((video.duration ?? 0) / 60);
    log?.(`Video is ${mins} min — using transcript directly (exceeds ${TRANSCRIPT_THRESHOLD_SECONDS / 60} min threshold)…`);
  }

  log?.('Fetching YouTube transcript…');
  const transcript = await fetchTranscript(video.id);
  log?.(`Transcript fetched (${Math.round(transcript.length / 1000)}k chars) — generating deep dive…`);

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{
      role: 'user',
      parts: [{ text: `[YouTube Transcript]\n${transcript}\n\n${prompt}` }],
    }],
  });
  return response.text ?? '';
}
