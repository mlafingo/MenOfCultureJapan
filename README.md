# VlogRoute Studio — MoC in Japan
### Guide: Adding & Fixing Locations via `japanVlogsData.json`

This website is completely self-sustainable. All video metadata, route paths, timestamps, and Google Maps locations are stored in a single pure JSON file:

```
src/data/japanVlogsData.json
```

Whenever you edit `japanVlogsData.json`, the website automatically updates:
- **Navigation & Days Bar** (Day 1 through Day 16, Complete Series)
- **Region Filters** (`Tokyo`, `Kyoto`, `Osaka`, `Nara`, etc., derived dynamically)
- **Synchronized Route & Walking Stages** (GPS interpolation with easing speeds)
- **Visited Stops List** with 1-click **Play** (seeks YouTube video) and **Maps** (opens Google Maps)
- **Interactive Map Markers & Live Tracing Pin**

---

## Note on AI & Ground-Truth Verification

The initial draft of the 16-day itinerary (including GPS coordinates, timestamps, and route segments) was synthesized using AI-assisted analysis of the publicly available vlog videos and dialogue transcripts. 

Because YouTube travel vlogs feature jump cuts, fast edits, and occasional off-camera transit, some coordinates or timestamps may be approximate. This repository is architected so that anyone can easily refine, fix, or add stops simply by editing the single `src/data/japanVlogsData.json` file. All location hints, addresses, and timestamps in the dataset serve as editable baselines.

---

## 1. Where the Data Lives

Open the following file in your code editor:
```
src/data/japanVlogsData.json
```

The file contains an array of episode objects:
```json
[
  {
    "id": "ep-01",
    "dayNumber": 1,
    "region": "Tokyo",
    "title": "We Are Finally in Japan - Episode 1",
    "youtubeId": "Ss8yhFSeiT8",
    "youtubeUrl": "https://youtu.be/Ss8yhFSeiT8",
    "totalDurationSeconds": 960,
    "overview": "...",
    "segments": [...],
    "places": [...]
  },
  ...
]
```

---

## 2. How to Add a Location Missed by AI

### Step A: Find the Target Episode
In `src/data/japanVlogsData.json`, search (`Ctrl + F` or `Cmd + F`) for the episode ID or day number:
- For Day 1: search `"id": "ep-01"`
- For Day 2: search `"id": "ep-02"`
- For Day 16: search `"id": "ep-16"`

Scroll down inside that episode to the `"places": [...]` array.

---

### Step B: Get Coordinates from Google Maps
1. Open [Google Maps](https://maps.google.com).
2. Search for the restaurant, hotel, shrine, or street spot shown in the video.
3. **Right-click** on the pin or exact location on the map.
4. Click on the latitude & longitude numbers at the top of the context menu (e.g. `35.71476, 139.79581`) to copy them to your clipboard.
5. In the JSON, format them as `[latitude, longitude]`:
   ```json
   "coordinates": [35.71476, 139.79581]
   ```

---

### Step C: Calculate the Video Timestamp in Seconds
Find the time in the YouTube video where they arrive at the stop (`MM:SS`):
- Formula: `(Minutes × 60) + Seconds`
- **Example 1**: `03:45` → `(3 × 60) + 45` = `225` seconds.
- **Example 2**: `11:20` → `(11 × 60) + 20` = `680` seconds.

---

### Step D: Add the Place JSON to `"places"`
Add a new object to the `"places"` array of that episode. Remember to separate objects with a comma:

```json
{
  "id": "ep2-place-06",
  "name": "Asakusa Menchi",
  "category": "food",
  "coordinates": [35.7126, 139.7954],
  "videoTimestamp": 415,
  "description": "Crispy fried ground beef and pork croquettes in Asakusa shopping arcade.",
  "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=35.7126,139.7954",
  "address": "2-3-3 Asakusa, Taito City, Tokyo"
}
```

#### Field Explanations:
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique ID for the place (e.g. `"ep2-place-06"`). |
| `name` | `string` | Name of the location, restaurant, or attraction. |
| `category` | `string` | One of: `"food"`, `"stay"`, `"landmark"`, `"transit"`, `"viewpoint"`, `"shop"`. |
| `coordinates` | `[lat, lng]` | Array with two numbers: `[latitude, longitude]`. |
| `videoTimestamp`| `number` | Playback second in the YouTube video when they visit. |
| `description` | `string` | Short note of what happens in the video. |
| `googleMapsUrl` | `string` | Direct link to Google Maps (`https://www.google.com/maps/search/?api=1&query=LAT,LNG` or official share link). |
| `address` | `string` | (Optional) Street address or neighborhood. |

---

## 3. How to Fix an Existing Stop

If a location has the wrong coordinates, wrong video time, or typo:

1. Open `src/data/japanVlogsData.json`.
2. Search for the place name (e.g. `"Shin-Yokohama Ramen Museum"`).
3. Update any of the fields directly:
   - **Fix GPS Pin**: Change `"coordinates": [35.5097, 139.6152]` and update the latitude/longitude in `"googleMapsUrl"`.
   - **Fix Video Seek Time**: Change `"videoTimestamp": 380` to the correct second.
   - **Fix Category**: Change `"category": "landmark"` to `"food"`, `"stay"`, `"transit"`, or `"viewpoint"`.
   - **Fix Description**: Edit the text in `"description"`.
4. Save the file. The website updates immediately!

---

## 4. How to Fix or Add Walking / Transit Route Paths

Each episode has a `"segments"` array that draws the red/teal GPS trail on the map and animates the pin in sync with playback.

To add or update a route stage:
```json
{
  "id": "ep2-seg-3",
  "title": "Walking through Nakamise Shopping Street",
  "timeStart": 240,
  "timeEnd": 480,
  "pacing": "easeIn",
  "description": "Browsing food stalls along the temple approach.",
  "path": [
    [35.7111, 139.7963],
    [35.7125, 139.7965],
    [35.7148, 139.7967]
  ]
}
```

- `timeStart`: Second in video when the walk begins.
- `timeEnd`: Second in video when the walk ends.
- `pacing`: Speed easing curve:
  - `"linear"`: Constant speed.
  - `"easeIn"`: Starts slowly, moves faster towards the end.
  - `"easeOut"`: Starts fast, slows down towards destination.
  - `"easeInOut"`: Smooth acceleration and deceleration.
- `path`: Array of coordinate pairs `[latitude, longitude]` tracing the walking path.

---

## 5. JSON Syntax Checklist

When editing `src/data/japanVlogsData.json`:
1. **Double Quotes**: All keys and strings must be enclosed in double quotes `""` (not single quotes `''`).
2. **Commas**: Ensure every property and array element is followed by a comma `,`, **except the last item** before a closing `}` or `]`.
3. **Numbers**: Do not put quotes around coordinates, timestamps, or durations (e.g. `35.7149`, not `"35.7149"`).
4. **Validation**: If you make a typo, your code editor will underline it with red squiggly lines. Running `npm run lint` will also verify JSON integrity.

---

## 6. What to Do After Editing & Putting on GitHub

Once you finish editing `japanVlogsData.json` locally on your computer, here is the exact step-by-step process to push it to GitHub and publish it live for free:

### Step 1: Initialize & Push to GitHub
In your project directory terminal:
```bash
# 1. Initialize git (if not already done)
git init

# 2. Stage your changes
git add .

# 3. Commit your changes
git commit -m "Update Japan vlog route and places data"

# 4. Set branch to main and link your GitHub repo
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 5. Push code
git push -u origin main
```

### Step 2: Deploy for Free (Zero Server Costs)

You have 3 free hosting choices. **Vercel** is recommended because it requires zero configuration:

#### Option A: Vercel (Recommended — 60 seconds setup)
1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.
2. Click **"Add New..."** → **"Project"**.
3. Select your GitHub repository.
4. Vercel automatically detects **Vite**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**.
6. **Done!** Whenever you edit `src/data/japanVlogsData.json` and push to GitHub, Vercel will automatically rebuild and deploy the live site in under 30 seconds.

#### Option B: GitHub Pages (Free inside GitHub)
If you want to host it entirely inside GitHub without 3rd party accounts:
1. In your GitHub repo, go to **Settings** → **Pages** → **Source** → select **GitHub Actions**.
2. In your repo root, create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```
*(Note: If hosting on `https://username.github.io/reponame/`, add `base: './'` to `vite.config.ts` so asset URLs resolve relative to the subpath).*

---

## 7. About the Map: Should You Change Provider or Get an API Key?

### Short Answer:
**Keep the current Leaflet setup. You DO NOT need to change providers or get any API key.**

### Here is why:

| Feature | Current Leaflet + CartoDB / Esri (Active) | Google Maps JS SDK | Mapbox GL |
| :--- | :--- | :--- | :--- |
| **API Key Needed?** | **NO** (Zero config) | YES (Requires Google Cloud) | YES (Requires Mapbox account) |
| **Credit Card Required?** | **NO** | YES (GCP billing required) | Optional initially |
| **Cost** | **100% Free forever** | $7/1k loads after $200 credit | Free up to 50k loads/month |
| **Public GitHub Safety** | **100% Safe** (No secrets to leak) | Not safe (risk of key leakage) | Moderate risk |
| **Performance** | Instant static tile CDN, sub-100ms | Slower JS bootstrap (~1.2MB) | WebGL shader compilation |
| **External Navigation** | Opens native Google Maps app | Same | Same |

### How the current map works:
1. **Tiles**: The website loads high-resolution vector-rendered raster tiles from **CartoDB Voyager** (`https://basemaps.cartocdn.com/rastertiles/voyager/`), **CartoDB Dark**, and satellite imagery from **Esri World Imagery**. These are open tile servers optimized for web viewing.
2. **POI Navigation**: When a user clicks **"Maps ↗"** on any place or marker, the app opens a direct Google Maps URL (`https://www.google.com/maps/search/?api=1&query=LAT,LNG`). This launches the **official Google Maps application** on iPhone/Android or Google Maps desktop. This is completely free and requires zero API keys.
3. **If you ever want Mapbox vector styles in the future**: You can easily swap the tile URL in `src/components/JourneyMap.tsx` with `https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=YOUR_KEY`, but CartoDB Voyager is already clean, ultra-responsive, and 100% maintenance-free.

