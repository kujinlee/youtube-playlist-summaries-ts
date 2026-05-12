import { GoogleGenAI } from '@google/genai';
import type { PlaylistEntry, Ratings, VideoType, Audience } from '@/types';

const MODEL = 'gemini-2.5-flash';

function isKorean(text: string): boolean {
  return (text.match(/[가-힣]/g) ?? []).length > 2;
}

function safeSlug(title: string, maxLen = 55): string {
  const cleaned = [...title]
    .filter(c => /[\p{L}\p{N} \-_]/u.test(c))
    .join('');
  const slug = cleaned.trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  return slug.slice(0, maxLen).replace(/-+$/, '');
}

export function makeFilename(index: number, title: string): string {
  return `${String(index).padStart(2, '0')}_${safeSlug(title)}.md`;
}

const SUMMARY_PROMPT = `\
You are summarizing a YouTube video for a curated playlist called "Agentic AI. Claude Code".

Video details:
  Title    : {title}
  Channel  : {channel}
  Duration : {duration_str}
  Language : {lang_label}
  Description (first 2500 chars):
{description}

Write a rich markdown summary {lang_instruction}.

Format exactly like this — no deviations:

# {title}

**Channel:** {channel}
**Duration:** {duration_str}
**Playlist:** Agentic AI. Claude Code
**Link:** https://www.youtube.com/watch?v={video_id}

---

## {summary_heading}

[2–3 sentence overview of what the video covers and why it matters]

## {topics_heading}

### 1. [First major topic]
- **[Bold label]:** [detail sentence]
- **[Bold label]:** [detail sentence]

### 2–5. [Continue with 3–5 total numbered sections, each with 2–4 bullet points]

## {takeaway_heading}

[1–2 sentence conclusion capturing the core insight]

---
*{footer}*

After the markdown, on a NEW LINE, output a JSON block for ratings:
\`\`\`json
{
  "type": "<one of: Tutorial, Talk, Analysis, Reference, Framework, Podcast, News, Case Study>",
  "audience": "<one of: Beginner, Intermediate, Advanced, All>",
  "U": <1-5 usefulness for Claude Code practitioners>,
  "D": <1-5 depth/technical level>,
  "O": <1-5 originality vs commentary/translation>,
  "R": 5,
  "C": <1-5 how comprehensive the coverage is>
}
\`\`\`
`;

export async function generateSummaryAndRatings(
  video: PlaylistEntry,
): Promise<{ md: string; ratings: Ratings; lang: 'EN' | 'KR' }> {
  const { id: videoId, title = 'Untitled', uploader, duration = 0, description = '' } = video;
  const channel = uploader ?? 'Unknown';
  const korean = isKorean(title);

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationStr = korean
    ? `약 ${mins}분 (${duration}초)`
    : `${mins} min ${secs} sec`;

  const summaryHeading  = korean ? '요약'      : 'Summary';
  const topicsHeading   = korean ? '주요 내용' : 'Key Topics';
  const takeawayHeading = korean ? '핵심 메시지' : 'Key Takeaway';
  const footer = korean
    ? '재생목록 "Agentic AI. Claude Code" (kujinlee2) 수록'
    : 'Part of the "Agentic AI. Claude Code" playlist by kujinlee2';

  const prompt = SUMMARY_PROMPT
    .replace(/{title}/g, title)
    .replace(/{video_id}/g, videoId ?? '')
    .replace(/{channel}/g, channel)
    .replace(/{duration_str}/g, durationStr)
    .replace(/{lang_label}/g, korean ? 'Korean' : 'English')
    .replace(/{lang_instruction}/g, korean ? 'in Korean' : 'in English')
    .replace(/{description}/g, description)
    .replace(/{summary_heading}/g, summaryHeading)
    .replace(/{topics_heading}/g, topicsHeading)
    .replace(/{takeaway_heading}/g, takeawayHeading)
    .replace(/{footer}/g, footer);

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
  const response = await client.models.generateContent({ model: MODEL, contents: prompt });
  const raw = response.text ?? '';

  // Split markdown from ratings JSON
  const jsonMatch = raw.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  let md = jsonMatch ? raw.slice(0, jsonMatch.index).trim() : raw.trim();
  let ratings: Ratings = { type: 'Tutorial', audience: 'Intermediate', U: 3, D: 3, O: 3, R: 5, C: 3 };

  if (jsonMatch) {
    try { ratings = JSON.parse(jsonMatch[1]) as Ratings; } catch { /* use defaults */ }
  }

  // Guarantee the correct YouTube link
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  md = md.replace(/\*\*Link:\*\*.*/g, `**Link:** ${ytUrl}`);
  if (!md.includes(ytUrl)) {
    md = md.replace(/(\*\*Playlist:\*\*[^\n]*)/, `$1\n**Link:** ${ytUrl}`);
  }

  return {
    md,
    ratings: {
      type:     (ratings.type     as VideoType)  ?? 'Tutorial',
      audience: (ratings.audience as Audience)   ?? 'Intermediate',
      U: Number(ratings.U) || 3,
      D: Number(ratings.D) || 3,
      O: Number(ratings.O) || 3,
      R: Number(ratings.R) || 5,
      C: Number(ratings.C) || 3,
    },
    lang: korean ? 'KR' : 'EN',
  };
}
