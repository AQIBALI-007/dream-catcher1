# Dream Catcher ✨

A premium, glass-morphism dream journal and analytical tool.

## Features

- **Capture Dreams**: Easy text entry or voice recording.
- **Voice Transcription**: 
  - Seamless Live Transcription using Web Speech API (no API keys required for this mode).
  - High-performance UI with pulse animations and dynamic waveforms.
- **AI Analysis**: Automatically extracts themes and emotions from your descriptions.
- **Journal**: Searchable grid of your past dreams with easy Edit/Delete actions.
- **Insights**: Track recurring themes from your subconscious. Click any theme to filter your journal.
- **Manual Overrides**: Edit tags manually if you want to categorize dreams yourself.

## Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Add API Keys (Optional)**:
   - Open `server.mjs`.
   - Add your ElevenLabs API key if you want to use the ElevenLabs Scribe engine (the system fallbacks to local browser speech otherwise).

3. **Start the Server**:
   ```bash
   node server.mjs
   ```

4. **Access the App**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Frontend**: Vanilla JS, HTML5, CSS3 (Glass-morphism)
- **Backend**: Node.js (Full ESM support)
- **Database**: Simple JSON file (`dreams.json`)
- **APIs**: Web Speech API, ElevenLabs Scribe (Optional)
