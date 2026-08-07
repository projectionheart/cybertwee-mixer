# cybertwee accelerationist dashboard 🧪💗

A cute-but-chaotic visual mixer. Drop an image into Source A, drop another into Source B, pick a blend mode (or leave it on random chaos), crank the acceleration slider, and hit **MIX IT**. The two sources blend, glitch, chroma-shift, and pixelate into a mashup you can keep remixing or download as a PNG.

Pure static HTML/CSS/JS — no build step, no server, no dependencies beyond one Google Fonts link. Runs entirely in the browser, so it's a perfect fit for GitHub Pages.

## Run it locally

Just open `index.html` in a browser, or serve the folder:

```bash
cd cybertwee-mixer
python3 -m http.server 8000
# visit http://localhost:8000
```

## Deploy to GitHub Pages

1. **Create a repo** (from inside this `cybertwee-mixer` folder):

   ```bash
   git init
   git add .
   git commit -m "cybertwee accelerationist dashboard"
   gh repo create cybertwee-mixer --public --source=. --push
   ```

   (No `gh` CLI? Create the repo on github.com instead, then:
   `git remote add origin https://github.com/YOUR-USERNAME/cybertwee-mixer.git`
   `git branch -M main`
   `git push -u origin main`)

2. **Enable Pages**:
   - Go to your repo on GitHub → **Settings** → **Pages**.
   - Under "Build and deployment", set **Source** to `Deploy from a branch`.
   - Set **Branch** to `main` and folder to `/ (root)`, then **Save**.

3. Wait a minute, then your site is live at:

   ```
   https://YOUR-USERNAME.github.io/cybertwee-mixer/
   ```

## Iterating with Claude Code

Once this is in a repo, you can keep vibe-coding it with Claude Code:

```bash
cd cybertwee-mixer
claude
```

Then just describe changes in plain language — new blend effects, different tube shapes, sound on mix, whatever. Since it's a static site, every push to `main` updates the live GitHub Pages site automatically within a minute or two.

## Files

- `index.html` — structure: two source tubes, controls, result tube
- `style.css` — cybertwee visual language: glass test tubes, glitch title, neon pastel palette
- `script.js` — the mixing engine: canvas blend modes, chroma shift, glitch slices, pixelation, sparkles
