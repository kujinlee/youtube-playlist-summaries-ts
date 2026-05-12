import { runSync } from '@/lib/sync';

// Allow long-running sync (no timeout in dev, 10 min in prod)
export const maxDuration = 600;
export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
      };

      runSync(send)
        .then(() => {
          send('__done__');
          controller.close();
        })
        .catch(err => {
          send(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
          send('__done__');
          controller.close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
