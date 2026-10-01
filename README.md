# Agustín Donnian — interactive portfolio

Personal software engineering portfolio. The page renders a continuous 3D space scene with Three.js. Scrolling travels through the scene; pointer movement shifts and subtly zooms the camera. The starfields and galaxies are GPU-rendered at the visitor's display resolution. Small planet maps provide an immediate base, and detailed maps load before their chapters. Original transparent nebula textures are placed at different depths; the dark background hue changes along the journey. A static space background remains visible until WebGL has rendered a frame and if its context is lost.

`space-source.js` is the readable scene source. `space-v2.js` is the browser bundle. To rebuild with Node.js: `npm install` and `npm run build`.

The SylClips walkthrough contains fictional data. It does not connect to the private project, process video, or expose real channel information. Sentinel Desk is also a fictional frontend demo. Public contact is LinkedIn only.

The original transparent nebula layers (`nebula-cyan.png` and `nebula-magenta.png`) were generated for this site with an image generation tool using the user's example images as color and atmosphere references; they do not copy the supplied images. The prompt requested detailed cyan/indigo and magenta/violet gas clouds with dark dust lanes, transparent edges and no stars, planets, text or watermarks.

Planetary imagery credits:

- Currently used Earth, Jupiter, Saturn, Mars, Neptune and Uranus maps, Saturn's ring alpha map, plus Earth's cloud layer: Solar System Scope / INOVE, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source: https://www.solarsystemscope.com/textures/. The maps draw on NASA imagery and elevation data with artistic color adjustments and gap filling. Desktop uses the original detailed maps where available; smaller maps serve mobile devices. `neptune-detailed-4k.jpg` and `uranus-detailed-4k.jpg` are visual enhancements of the 2K source maps with subtle procedural cloud variation; they are not higher-resolution observational data. `create_ice_giant_maps.py` records that transformation. Downloaded copies came from public GitHub mirrors because the source site's direct download returned 403.
- Retained but unused from earlier versions: NASA/Goddard Space Flight Center Scientific Visualization Studio, Blue Marble Next Generation, data courtesy of Reto Stöckli and NASA's Earth Observatory: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/; and NASA/JPL/Space Science Institute Cassini Jupiter map: https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/.

Planet positions and scale are illustrative; the maps depict distinct real Solar System planets.
