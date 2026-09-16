# Top Feature Section — Design Spec (user-approved)

The homepage introduction shows **exactly two** feature cards. No other feature
items. Do not mention search, saving, or registration in this section — those
functions live elsewhere in the interface.

## Cards

### 1. 🗺️ EXPLORE THE MAP
- Heading: **"Find events near you"**
- Text: **"See what's happening across Boston and how far away it is."**
- Icon: map illustration or map-pin icon.
- Click behavior: smooth-scrolls directly to the map section.

### 2. 💬 HEAR FROM ATTENDEES
- Heading: **"See what people think"**
- Text: **"Like, dislike, and join the conversation about each event."**
- Icon: conversation bubbles or reaction icons.
- Click behavior: opens the Gallery view with community activity visible.

## Design rules
- Side by side on desktop; stacked vertically on mobile.
- Warm palette: orange, yellow, pink, purple (see `app/globals.css` tokens).
- One sentence of description per card — no more.
- Both cards clickable (real links/buttons, keyboard accessible).
- No popup, no modal, no extra explanatory paragraph.
- The whole section must be compact enough to fit above the map.
- Removed items (do NOT reintroduce): "Check the details", "Describe what you
  want", "Save and register".
