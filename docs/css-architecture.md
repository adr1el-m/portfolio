# CSS Architecture

The legacy visual system still lives in `public/style.css`.

New or touched feature styles should go into smaller files under `public/styles/` and be loaded after the legacy stylesheet. The first enhancement layer is:

- `public/styles/portfolio-enhancements.css` - project preview cards, timeline filters, contact backend states, and admin analytics badges.

When a legacy section is substantially refactored, move its styles out of `public/style.css` into a named enhancement file instead of adding another large block to the bottom of the legacy stylesheet.
