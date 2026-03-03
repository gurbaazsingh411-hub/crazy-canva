🎨 PRODUCT REQUIREMENT DOCUMENT
CRAZY CANVAS

An infinite public canvas where anyone can draw one pixel per minute.

1. Product Vision

CRAZY CANVAS is a real-time, multiplayer, infinite pixel board where:

Anyone can place 1 pixel per minute

No login required

Fully public

Real-time updates

Infinite scrollable grid

Inspired by:

r/place

Million Dollar Homepage

But:

Always live

No accounts

No time limit

Infinite expansion

2. Core Experience

User journey:

User opens website

Sees infinite pixel grid

Zooms & pans

Picks a color

Clicks a coordinate

Pixel updates instantly

60-second cooldown starts

Simple. Addictive. Competitive.

3. Feature Requirements
3.1 Infinite Canvas
Functional:

Infinite scroll in all directions

Smooth zoom (mouse wheel / pinch)

Logical grid system (1 cell = 1 pixel)

Only render visible viewport

Technical:

HTML5 Canvas OR WebGL

Virtualized rendering

Chunk-based loading (important)

3.2 Pixel Placement

Color picker (12–24 preset colors initially)

Click-to-place

Real-time update across users

Visual cooldown timer (60 seconds)

Validation:

One pixel per minute per client

Firestore rule prevents spam on same pixel

3.3 No Login System

Instead:

Generate anonymous session ID

Store in localStorage

Used for client-side cooldown tracking

No authentication required.

3.4 Real-Time Sync (Firebase)

Use:

Firebase Cloud Firestore

Data Model:

Collection: pixels

Document ID format:

"x_y"

Document structure:

{
  x: number,
  y: number,
  color: string,
  updatedAt: timestamp
}

Important:
Only store modified pixels.
Empty grid is NOT stored.

4. Viewport-Based Loading Strategy (Critical)

You MUST avoid loading entire collection.

When user moves:

Calculate visible bounds:

minX

maxX

minY

maxY

Query Firestore:

where("x", ">=", minX)
where("x", "<=", maxX)
where("y", ">=", minY)
where("y", "<=", maxY)

Subscribe using onSnapshot()

This ensures:

Low reads

Low cost

Scalability

If you skip this, you will burn Firebase quota.

5. Cooldown System
Client Side:

Store last placement timestamp in localStorage

Disable placement button

Show countdown timer

Firestore Rule (Basic Protection):
allow write: if request.time > resource.data.updatedAt + duration.value(60, "s");

Prevents same pixel spam.

Note:
This does NOT fully stop bots.
But good enough for MVP.

6. UI / UX Design Direction

Theme: Retro Hacker Pixel Chaos

Visual Style:

Dark background

Neon grid lines

Pixel font for headings

Minimal UI overlays

UI Elements:

Top Left:

CRAZY CANVAS logo

Top Right:

Live pixel counter

Active users counter (optional)

Bottom Center:

Cooldown timer

Right Sidebar:

Color palette

7. Performance Requirements

Initial load < 3 seconds

Smooth 60fps pan/zoom

Query limit per viewport movement

Avoid unnecessary re-subscribing

Optimization:

Divide world into chunks (e.g., 50x50)

Only re-query when chunk changes

Debounce viewport movement

8. Anti-Abuse Considerations

MVP Level:

60-second cooldown

Limited color palette

Write restrictions

Phase 2:

Firebase App Check

Bot detection

Cloud Functions for rate limiting

Per-IP soft cap

You will get trolls. Expect it.

9. Metrics to Track

Total pixels placed

Active users (snapshot count)

Pixels per minute

Most active region

Optional:
Daily leaderboard (anonymous)

10. Tech Stack

Frontend:

Next.js or React

Firebase SDK

Canvas or WebGL

Zustand or Context

Backend:

Firebase only (no custom server required)

Hosting:

Vercel (frontend)

Firebase handles DB

11. Future Expansion (Phase 2)

Time-lapse replay

Era reset events

Themed color weeks

Heatmap overlay

Mini territory scoring

12. Risk Analysis

Biggest Risks:

Firebase cost spike

Massive reads due to bad query design

Performance issues with too many pixels

Bots

If architecture is correct, Firebase free tier will handle early growth.

13. Development Phases
Phase 1 (Core MVP)

Canvas rendering

Pixel placement

Firestore integration

Cooldown system

Phase 2

Viewport-based querying

Performance optimization

Activity counters

Phase 3

Gamification

Heatmap

Events