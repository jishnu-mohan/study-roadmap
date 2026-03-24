# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A 12-week interview preparation roadmap for Backend SDE2 roles. It is a content-only repository — no build system, no tests, no package manager. All study material is in markdown files; two static HTML pages provide a browser-based viewer.

## Repository Structure

- `00-master-roadmap.md` — the top-level plan (strengths/gaps analysis, 12-week schedule, weekly breakdown)
- `STUDY-GUIDE.md` — learning order with spaced repetition schedule
- `index.html` — dashboard landing page linking to all topics
- `viewer.html` — renders individual markdown files in the browser (fetches `.md` via query param)
- `dsa/` — data structures (`data-structures/`) and algorithm patterns (`patterns/`), plus practice problems and a revision cheatsheet
- `system-design/` — building blocks, HLD problems, and LLD problems
- `backend/` — APIs, databases, and distributed systems deep dives
- `behavioral/` — STAR stories and common questions
- `revision/` — spaced repetition tracker
- `split/` — alternate/split versions of some system-design content

## Conventions

- Markdown files are numbered with a two-digit prefix (`01-`, `02-`, …) to enforce reading order within each directory.
- Each topic file is self-contained with theory, examples, interview tips, and practice problems.
- The HTML viewer (`viewer.html`) loads markdown files client-side using the `marked` library and `highlight.js` for code blocks.

## Working With This Repo

There are no build or test commands. To preview locally, serve the directory with any static file server (e.g., `python3 -m http.server`) and open `index.html`.
