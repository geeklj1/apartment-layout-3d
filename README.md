# Apartment layout viewer

Mobile-friendly 3D reference floorplan with room areas, dimension lines and a zoom-calibrated metre scale. Static site, no backend or external runtime requests.

## Run

Serve this directory with a local HTTP server, then open index.html. Run `node check.mjs` for geometry and asset checks. Run `node build-plan.mjs` after changing geometry to regenerate the no-WebGL fallback.

## Measurement notes

Geometry is a 7th-floor reference model, not a surveyed 20th-floor plan. Wall differences remain unverified. Areas sum XZ triangle projections, before rounding. Irregular rooms show their maximum bounding dimensions; width × depth is not their area. Model floor area is not registered building area, and their difference is not a reliable common-area calculation.

The public version omits the development name, building identifier, private video/photos and personal information. Three.js is vendored under its MIT license in vendor/THREE-LICENSE.txt.
