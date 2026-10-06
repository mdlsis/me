# me

Personal page of **M Daniel Lana**: https://mdlsis.github.io/me/

A small VS Code simulation built with vanilla HTML, CSS and JavaScript
(ES modules, no frameworks, no build step). Visitors fix the "bugs" in
`Program.cs`, run the program and get my contact info.

## Features

- Responsive workbench (desktop, tablet and phone) with CSS Grid
- Explorer, tabs, breadcrumbs, minimap, folding and indent guides
- Diagnostics with squiggles, inline messages, hovers and quick fixes
- Interactive terminal (`help`, `dotnet run`, `fix`, `contact`, `projects`…)
- Command palette (`Ctrl+Shift+P`), quick open (`Ctrl+P`), go to line (`Ctrl+G`)
- Color themes: MDL Dark, Monokai and Light+
- Respects `prefers-reduced-motion`

## Structure

```
index.html            page shell + SEO metadata
css/main.css          layout, themes and responsive rules
js/app.js             entry point and command registration
js/data/files.js      content: profile, files and problems  <- edit me
js/core/              event bus, workspace model, highlighter, commands, themes, build simulation
js/ui/                editor, minimap, panel, terminal, palette, menus, side bar, status bar
```

## Run locally

ES modules need a web server (opening the file directly won't work):

```
python3 -m http.server 8000
```

Then open http://localhost:8000.
