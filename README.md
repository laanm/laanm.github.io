# Agustín Donnian — interactive portfolio

Personal software engineering portfolio. The page renders a continuous 3D space scene with Three.js. Scrolling travels through the scene; pointer movement shifts and approaches the camera. The starfields and galaxies are GPU-rendered at the visitor's display resolution. Planetary textures are stored locally, so the scene does not rely on third-party image hosts at runtime.

`space-source.js` is the readable scene source. `space-v2.js` is the browser bundle. To rebuild with Node.js: `npm install` and `npm run build`.

The SylClips walkthrough contains fictional data. It does not connect to the private project, process video, or expose real channel information. Sentinel Desk is also a fictional frontend demo. Public contact is LinkedIn only.

Planetary imagery credits:

- Earth: NASA/Goddard Space Flight Center Scientific Visualization Studio, Blue Marble Next Generation, data courtesy of Reto Stöckli and NASA's Earth Observatory. Source: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
- Jupiter: NASA/JPL/Space Science Institute, Cassini cylindrical map of Jupiter. Source: https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/

The work section's ringed worlds use Jupiter imagery as an artistic treatment. Planet positions and scale are illustrative.
