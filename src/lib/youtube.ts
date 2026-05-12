import fs from 'fs';
import http from 'http';
import { URL } from 'url';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { CLIENT_SECRETS, TOKEN_FILE, YT_SCOPES } from './config';

interface ClientSecrets {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

/** Build an authenticated YouTube API client, running OAuth if needed. */
export async function getYouTubeClient(log: (msg: string) => void) {
  if (!fs.existsSync(CLIENT_SECRETS)) {
    log('  Skipping YouTube removal: _meta/client_secrets.json not found.');
    return null;
  }

  const secrets = JSON.parse(fs.readFileSync(CLIENT_SECRETS, 'utf-8')) as ClientSecrets;
  const { client_id, client_secret } = secrets.installed;

  const oauth2 = new OAuth2Client(client_id, client_secret, 'http://localhost:4567');

  // Load cached token — prefer token-ts.json, fall back to Python's token-py.json
  if (fs.existsSync(TOKEN_FILE)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    oauth2.setCredentials(token);

    // Refresh if expired
    const expiry = token.expiry_date as number | undefined;
    if (expiry && Date.now() > expiry - 60_000) {
      const { credentials } = await oauth2.refreshAccessToken();
      oauth2.setCredentials(credentials);
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(credentials, null, 2));
    }
  } else {
    // Run OAuth local-server flow
    const code = await runOAuthFlow(oauth2, log);
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  }

  return google.youtube({ version: 'v3', auth: oauth2 });
}

/** Open browser → local redirect server → return auth code. */
function runOAuthFlow(oauth2: OAuth2Client, log: (msg: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const authUrl = oauth2.generateAuthUrl({
      access_type: 'offline',
      scope: YT_SCOPES,
      prompt: 'select_account',
    });

    log(`\n  ── YouTube OAuth ──`);
    log(`  Open this URL in your browser and sign in with the brand account:`);
    log(`  ${authUrl}`);
    log(`  Waiting for redirect…\n`);

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost:4567');
      const code = url.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h2>Authenticated! You can close this tab.</h2>');
      server.close();
      if (code) resolve(code);
      else reject(new Error('No code in redirect'));
    });

    server.listen(4567, () => {
      // Auto-open browser if possible
      import('child_process').then(({ exec }) => {
        exec(`open "${authUrl}"`, () => {/* ignore errors */});
      });
    });

    server.on('error', reject);
  });
}

/** Remove video IDs from a YouTube playlist. Returns successfully removed IDs. */
export async function removeFromPlaylist(
  yt: Awaited<ReturnType<typeof getYouTubeClient>>,
  playlistId: string,
  videoIds: string[],
  log: (msg: string) => void,
): Promise<string[]> {
  if (!yt) return [];

  // Show authenticated channel name
  try {
    const me = await yt.channels.list({ part: ['snippet'], mine: true });
    const name = me.data.items?.[0]?.snippet?.title ?? 'unknown';
    log(`  Authenticated as: ${name}`);
  } catch { /* ignore */ }

  log(`  Removing ${videoIds.length} video(s) from YouTube playlist…`);
  const succeeded: string[] = [];

  for (const vid of videoIds) {
    try {
      const resp = await yt.playlistItems.list({
        part: ['id'],
        playlistId,
        videoId: vid,
        maxResults: 1,
      });
      const items = resp.data.items ?? [];
      if (!items.length) {
        log(`    ${vid}: not in playlist (already removed) — marking done`);
        succeeded.push(vid);
        continue;
      }
      await yt.playlistItems.delete({ id: items[0].id! });
      log(`    ${vid}: removed ✓`);
      succeeded.push(vid);
    } catch (e) {
      log(`    ${vid}: failed — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return succeeded;
}
