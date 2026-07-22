# Plant Photos

This folder is where the app looks for **portable** plant photos — the ones that should travel with the `Plant_Care` folder when you copy it between devices.

## How it works

When you load the app, each plant page tries to display:

```
data/images/<plant_id>.jpg
```

If a file with that exact name exists here, it loads instantly. If not, the app falls back to whatever's in your browser's localStorage (the photo you uploaded earlier).

## Filename = Plant ID

You **must** name the file using the plant's internal ID (lowercase, underscores). The 8 owned plants are:

| Filename                  | Plant             |
|---------------------------|-------------------|
| `prayer_plant.jpg`        | Prayer Plant      |
| `monstera.jpg`            | Monstera          |
| `ginseng_ficus.jpg`       | Ginseng Ficus     |
| `snake_plant.jpg`         | Snake Plant       |
| `aloe_vera.jpg`           | Aloe Vera         |
| `mondo_grass.jpg`         | Mondo Grass       |
| `firestick.jpg`           | Firestick         |
| `kalanchoe.jpg`           | Kalanchoe         |

Pothos variants: `pothos_silver_stripe.jpg`, `pothos_hawaiian.jpg`, `pothos_marble_queen.jpg`

Custom plants get IDs like `user_1719158400000_abc12.jpg` — exported automatically when you click "Save photo to folder".

## How to save a photo here

1. Upload a photo using the **Plant Profile** form on the Log & Data tab — it gets resized and stored in your browser.
2. Open the plant's page in the Care Guide.
3. Click **💾 Save photo to folder** below the photo.
4. The file downloads with the correct name. Move it into this folder (`Plant_Care/data/images/`).
5. Reload the app. The folder version now takes precedence and works on any device that opens this folder.

## Notes

- Only JPEG (`.jpg`) is auto-detected. If you have a PNG you'd like to use instead, you'd need to extend `app.js` to check additional extensions.
- This auto-detection only works when running via a local web server (`python -m http.server`, etc.) — opening `index.html` with `file://` may or may not load relative-path images depending on browser. Either way the localStorage fallback still works.
- This folder is checked into your project and travels with the `Plant_Care` directory anywhere you copy it.
