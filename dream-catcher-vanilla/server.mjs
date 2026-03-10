import http from 'http';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import formidable from 'formidable';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'dreams.json');
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY || 'sk_b62418c642655ae5a730621b4a27521a3826e68c237d7ea8'; // Add your key here

// Initialize database
let dreams = [];
try {
  const data = await fs.readFile(DB_FILE, 'utf8');
  dreams = JSON.parse(data);
} catch (err) {
  // If file doesn't exist, create it
  await fs.writeFile(DB_FILE, JSON.stringify([]));
  dreams = [];
}

const saveDreams = async () => {
  await fs.writeFile(DB_FILE, JSON.stringify(dreams, null, 2));
};

const extractDreamData = async (description) => {
  // Use simple keyword extraction if no OpenAI API Key
  const keywords = description.toLowerCase().split(/\W+/);

  const themes = [];
  const entities = [];
  let emotions = [];

  const themeKeywords = ['chase', 'fall', 'fly', 'teeth', 'water', 'fire', 'dark', 'light', 'running', 'lost'];
  const emotionKeywords = ['fear', 'happy', 'sad', 'anxious', 'confused', 'excited', 'terrified', 'peaceful'];

  for (const word of keywords) {
    if (themeKeywords.includes(word) && !themes.includes(word)) themes.push(word);
    if (emotionKeywords.includes(word) && !emotions.includes(word)) emotions.push(word);
  }

  // Fallback defaults
  if (themes.length === 0) themes.push('unknown theme');
  if (emotions.length === 0) emotions.push('neutral');

  // Fake entity extraction
  entities.push('self');

  return { themes, entities, emotions };
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/dreams' && req.method === 'GET') {
    const query = url.searchParams.get('q')?.toLowerCase();
    let result = dreams;

    if (query) {
      result = dreams.filter(d =>
        d.description.toLowerCase().includes(query) ||
        d.themes.some(t => t.toLowerCase().includes(query)) ||
        d.emotions.some(e => e.toLowerCase().includes(query))
      );
    }

    // sorting by newest
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  if (url.pathname === '/api/dreams' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { description } = JSON.parse(body);
        if (!description) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Description is required' }));
        }

        const structuredData = await extractDreamData(description);

        const newDream = {
          id: Date.now().toString(),
          description,
          ...structuredData,
          date: new Date().toISOString()
        };

        dreams.push(newDream);
        await saveDreams();

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newDream));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/dreams/') && req.method === 'PUT') {
    const id = url.pathname.split('/')[3];
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { description, themes, emotions } = JSON.parse(body);
        if (!description) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Description is required' }));
        }

        const index = dreams.findIndex(d => d.id === id);
        if (index === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Dream not found' }));
        }

        // If themes/emotions are provided, use them; otherwise extract from text
        const structuredData = (themes || emotions) 
          ? { themes: themes || [], emotions: emotions || [] }
          : await extractDreamData(description);

        const isLocked = body.includes('"isLocked":true'); // Simple check since we are in a raw listener
        const { isLocked: isLockedParsed } = JSON.parse(body);

        dreams[index] = { ...dreams[index], description, ...structuredData, isLocked: isLockedParsed || false };
        await saveDreams();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(dreams[index]));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/dreams/') && req.method === 'DELETE') {
    const id = url.pathname.split('/')[3];
    const index = dreams.findIndex(d => d.id === id);
    if (index !== -1) {
      dreams.splice(index, 1);
      await saveDreams();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  if (url.pathname === '/api/stats' && req.method === 'GET') {
    const publicDreams = dreams.filter(d => !d.isLocked);
    const allThemes = publicDreams.flatMap(d => d.themes);
    const themeCounts = allThemes.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const sortedThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ topThemes: sortedThemes }));
  }

  if (url.pathname === '/api/transcribe' && req.method === 'POST') {
    const form = formidable({});

    try {
      const [fields, files] = await form.parse(req);
      const audioFile = files.file[0];

      if (!audioFile) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'No audio file provided' }));
      }

      const audioBuffer = await fs.readFile(audioFile.filepath);

      // Create FormData for ElevenLabs
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: audioFile.mimetype });
      formData.append('file', blob, audioFile.originalFilename || 'audio.wav');
      formData.append('model_id', 'scribe_v1');

      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVEN_LABS_API_KEY
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('ElevenLabs Error:', errorData);
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        const errorMessage = errorData.detail?.message || 'ElevenLabs transcription failed';
        return res.end(JSON.stringify({ error: errorMessage }));
      }

      const data = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text: data.text }));

    } catch (err) {
      console.error('Transcription error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);

  try {
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.ico') contentType = 'image/x-icon';

    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
