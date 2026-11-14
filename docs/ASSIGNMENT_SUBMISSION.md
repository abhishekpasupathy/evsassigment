# BCS508 Assignment Form — Ready-to-use Responses

**Selected problem:** Forest Fire Detection

**Project name:** ForestGuard — Forest Fire Detection and Early-Warning Support

## Why Does This Problem Matter?
Forest fires destroy trees, vegetation and wildlife habitats, reduce biodiversity, and create smoke and air pollution. They can release greenhouse gases and spread rapidly when they are not detected and reported early. In remote forest regions, timely observation and accurate location details can be difficult. A digital reporting and image-screening system can help bring possible incidents to the attention of authorised personnel sooner, allowing them to verify the situation and decide on an appropriate response.

## Proposed Digital Solution
ForestGuard is a web-based forest-fire observation and early-warning concept. It accepts forest photographs and field incident reports containing the observation type, time and optional GPS coordinates. In the proposed full system, a computer-vision model trained on labelled fire, smoke and normal forest images analyses photographs. The result is combined with location, weather and satellite hotspot context to prioritise possible incidents in a dashboard for human verification. The repository contains an interactive browser prototype with an operations dashboard, persistent local incident queue, report creation, rule-based priority scores using incident type and manually entered weather conditions, status updates, coordinate plotting, search/filter controls, CSV export and local image screening using a clearly labelled colour-pixel heuristic. It does not contain a trained ML model, live data feed, cloud backend or automatic emergency alert.

## Technology Used
**Implemented:** Web Application (HTML, CSS, JavaScript), local browser storage, rule-based scoring, CSV export and a schematic coordinate plot.

**Proposed extension:** Computer Vision, Machine Learning, GIS and Cloud Computing. These are planned technologies for the full system, not capabilities already implemented in the current demo.

## Input Data Required and Possible Sources
- Forest images with timestamp and approximate GPS location — field staff, authorised lookout/camera sources.
- Labelled examples of fire, smoke and normal forest scenes — verified field images and appropriately licensed research datasets.
- Incident type, notes, date/time and latitude/longitude — forest guards or community reports.
- Temperature, humidity, wind and rainfall — India Meteorological Department (IMD), subject to availability.
- Satellite hotspot coordinates, time and confidence — NASA FIRMS and other authorised remote-sensing sources.
- Forest boundaries and vegetation layers — relevant state forest department or authorised GIS data.

## Input → Processing → Output
**Input:** Forest photographs; field reports; GPS coordinates and timestamps; proposed weather and satellite hotspot observations.

**Processing:** Validate input and coordinates; preprocess images; run a trained fire/smoke computer-vision model (proposed); combine the result with location and contextual data; prioritise possible incidents; send the candidate to a human reviewer.

**Output:** An incident dashboard/map showing the image, location, timestamp and model score; human-verified incident status; notification to authorised responders through an approved channel.

**Prototype clarification:** The current dashboard stores reports persistently in the browser's localStorage, calculates illustrative rule-based priority scores, allows status updates and CSV export, and plots supplied coordinates schematically. Image screening uses a basic colour-pixel heuristic, not a trained classifier; it cannot confirm or rule out fire. There is no shared server or notification service, so reports remain on the same browser/device and no authority is notified.

## Expected Environmental Benefits
1. Faster identification and investigation of possible forest fires.
2. Potential reduction in fire spread and damage through timely verified response.
3. Better protection of trees, wildlife habitats and biodiversity.
4. Lower smoke, particulate pollution and greenhouse-gas emissions if large fires are prevented.
5. Historical incident records to help identify hotspots and improve prevention planning.

## Project Link
https://github.com/abhishekpasupathy/evsassigment

## Demonstration
Open `index.html` and launch `dashboard.html` in a browser, or use the GitHub Pages URL after enabling Pages in repository settings. Click **Load sample data**, demonstrate the queue and status updates, create a report, refresh to show local persistence, export CSV, and test the image screening panel. The README contains full run instructions.
