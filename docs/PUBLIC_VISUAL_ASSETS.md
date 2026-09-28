# HYDROLAND visual assets — reference corrections

Generated with the built-in image-generation tool on 2026-09-28 from the approved visitor reference `A541E292-BE1F-4C40-9273-1DBD0222AD39.jpeg`. Output PNGs were encoded as WebP without resizing or compositing. These are decorative illustrations, not photographs of a verified trip destination. Public trip cards label their artwork as illustrative.

Sultan explicitly requested re-auditing Phase 1 and correcting the approved-reference differences. The reference logo and runtime theme correction are part of that authorization. UI icons are native inline SVG. The map preview now uses real geographic geometry; its pins and provider availability still come from the existing map module.

## Ocean background

Path: `apps/web/public/assets/hydroland-ocean-reference.webp`

Final prompt (built-in tool):

> Use case: precise-object-edit. Asset type: production website hero background, landscape 2560x1280. Image 1 is the approved HYDROLAND website visual reference, and the edit target. Reconstruct ONLY the beautiful ocean background artwork in its upper hero area as a clean standalone full-bleed image. Remove ALL Arabic and English text, buttons, navigation, cards, logo, frames and other interface elements. Preserve the visual identity and existing scenic composition: a clear split waterline across the upper quarter, warm sunset and craggy Red Sea islands above water, a white yacht toward the upper right; below water brilliant cyan sun rays, a scuba diver with black mask and tanks on the LEFT swimming toward the center, a sea turtle further left in the foreground, colorful coral and fish around the lower left and lower edges. The right-middle underwater area must stay a deep clear navy/cyan with low detail so real HTML Arabic title and buttons can be laid over it legibly. Premium cinematic marine photography / richly detailed realistic illustration exactly like the reference. Keep the sea and subjects crisp, luminous and saturated, with natural golden highlights. Compose the artwork to span the whole wide image with no inset, borders, panels, labels, words, symbols, watermarks or branding. This is a decorative scenic background, not a website mockup and not a navigational chart. Output only that clean scene.

Actual output: 1774 × 887 pixels.

## Island artwork

Path: `apps/web/public/assets/hydroland-island-reference.webp`

Final prompt (built-in tool):

> Use case: precise-object-edit. Asset type: decorative marine-experiences website card background. Image 1 is the approved HYDROLAND UI reference, the edit target. Reconstruct the small ISLAND AND TURQUOISE LAGOON artwork seen in the left trip card and the left discovery banner as one clean standalone landscape photograph-like illustration, 1536x1024. A small rugged Red Sea island, warm beige rock formations, brilliant clear turquoise shallow water and pale sandy fringe, tiny white recreational boats offshore, deep blue sea toward distant rocky islands under a crisp blue sky. Match the luminous cyan/teal and gold scenic treatment of this exact reference. No text, labels, names, logos, UI, badges, borders, cards, frame, people close up, or watermark. This is a generic decorative island scene, not a documented or identifiable real destination and not a map. Output only the reconstructed island/lagoon scene filling the image.

Actual output: 1536 × 1024 pixels.


## Reference logo

Path: `apps/web/public/assets/hydroland-mark-reference.webp` — 1423 × 1105, alpha preserved.

Input: approved design-system board `149F868A-66E0-461A-842C-21B07A40711A(3).jpeg`. The built-in image-generation tool reconstructed the mark; this is not the original vector logo. Wordmark, Arabic name and tagline remain real HTML text.

Final prompt (built-in tool):

> Use case: background-extraction. Asset type: transparent production HYDROLAND logo mark. Input image 1 is the approved brand reference and edit target. Extract and faithfully reconstruct ONLY the logo SYMBOL at its top left, with no letters or tagline. Preserve this exact design: two tall rounded glossy blue/cyan vertical pillars forming an H, a small golden sun between their tops, layered flowing cyan/royal-blue/white ocean waves across their middle and lower half, and the small WHITE SCUBA DIVER silhouette diagonally swimming toward the upper right across the lower-right wave. The base is a flowing wave H, NOT a shield, not two thin lines. Match the original proportions, smooth premium dimensional shading and white highlights precisely. Center the mark with narrow even transparent margins, large enough for crisp web rendering. Remove all background, interface, photographs, text, borders and other elements. Genuine transparent background/alpha. No new interpretation, no redesign, no additional symbols. Output just the isolated original mark.

## Community card

Path: `apps/web/public/assets/hydroland-community-reference.webp` — 1536 × 1024.

Input: approved homepage `A541E292-BE1F-4C40-9273-1DBD0222AD39(3).jpeg`.

Final prompt (built-in tool):

> Use case: precise-object-edit. Asset type: HYDROLAND website community card photograph. Input image is the approved homepage reference and edit target. Faithfully extract and reconstruct ONLY the photographic scene inside the small bottom-left COMMUNITY card: a friendly group of three adult male scuba divers in dark wetsuits and casual dive shirts chatting beside their dive equipment on a boat at golden sunset, calm Red Sea water and warm rocky islands behind. Keep the figures and their black scuba gear grouped on the LEFT two-thirds, darker quiet blue sea on the right. Match the same intimate candid scene, blue/gold cinematic light and marine realism as that original bottom-left card. Landscape 1536x1024. No text, no logos, no interface, no button, no frames, no watermarks. Fill the image with the scene. Decorative illustration, not documentary photography.

## Marine assistant

Path: `apps/web/public/assets/hydroland-assistant-reference.webp` — 1356 × 1159, alpha preserved.

Input: approved homepage `A541E292-BE1F-4C40-9273-1DBD0222AD39(3).jpeg`.

Final prompt (built-in tool):

> Use case: background-extraction. Asset type: transparent HYDROLAND marine assistant mascot cutout for a small website card. Input image is the approved homepage, edit target. Faithfully extract/reconstruct ONLY the cute small futuristic SCUBA ROBOT at the bottom RIGHT of that reference. Same glossy dark navy rounded diving helmet, large glowing cyan eyes behind its black visor, small compact body, cyan luminous metallic edge accents, visible diving air tank/hoses, one hand gently raised. Three-quarter view facing LEFT toward the card text, matching the reference pose and premium 3D rendering. Isolate the robot, remove coral, water, UI, text, buttons, sparkles and background. Preserve the friendly diving mascot identity, not a generic box-shaped robot. Genuine transparent alpha background, narrow even margins, full upper body visible, no letters, no branding, no border.

## Local fonts

Six WOFF files are in `apps/web/public/assets/fonts/`, referenced by `src/hydroland-fonts.css`. They retain the complete source glyph sets. Google Fonts TTF sources were converted using fontTools, without changing outlines or subsetting. The two included OFL license files apply.

Official source: https://github.com/google/fonts

| Source file | Git blob SHA | Local output |
| --- | --- | --- |
| `ofl/tajawal/Tajawal-Regular.ttf` | `d23d25b8b68db86d5b727d181c2008fd874216eb` | `Tajawal-Regular.woff` |
| `ofl/tajawal/Tajawal-Medium.ttf` | `96dee5410d185adfa57475bb02695c11f8836208` | `Tajawal-Medium.woff` |
| `ofl/tajawal/Tajawal-Bold.ttf` | `71e1488e90215abcc8aedc541d94a2bcbec574f3` | `Tajawal-Bold.woff` |
| `ofl/tajawal/Tajawal-ExtraBold.ttf` | `e5abae9001cbfb8e9ec90e95ca669ef50bc3b138` | `Tajawal-ExtraBold.woff` |
| `ofl/tajawal/Tajawal-Black.ttf` | `eed4f4f37391e7b4833ead4aeac5245c305c9225` | `Tajawal-Black.woff` |
| `ofl/montserrat/Montserrat[wght].ttf` | `c97aca18592834d8706549c279cb8d5ac5d85f69` | `Montserrat.woff` (variable 100–900) |

## Geographic overview

Path: `apps/web/public/assets/red-sea-overview.svg` — native 300 × 200 SVG.

Source: Natural Earth 1:110m admin-0 countries, https://github.com/nvkelso/natural-earth-vector (`geojson/ne_110m_admin_0_countries.geojson`, blob `1e6ab74c7042f97013be69ceec798be8e1aff27d`). Natural Earth's data is public domain. Simplified polygons for Saudi Arabia, Egypt, Sudan, Eritrea, Yemen, Israel and Jordan are projected onto a Mercator view centered at 39°E, bounded by 30°N and 16°N. Land shading is decorative, not terrain or bathymetric information.

Pins use the same projection and only the existing validated trip coordinates. Duplicate positions are represented once; coordinates outside this overview are omitted from the thumbnail but remain available through the full map/list. This thumbnail is a geographic overview, not a navigation chart or satellite image. No AI-generated map or invented trip coordinates are used.
