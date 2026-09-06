# menusprijzen.nl

Static prijzengids voor fastfood- en bezorgketens in Nederland. Plain HTML/CSS/JS,
geen build. Deel-chrome (header/footer/zoek) wordt door `assets/app.js` geïnjecteerd;
prijsgrafieken via Chart.js; interactieve prijsvergelijker op `prijsvergelijker.html`.

## Lokaal draaien
    python3 -m http.server 8765   # http://localhost:8765

## Deploy
Auto-deploy via Vercel op elke push naar `main` (framework: none, output = repo-root).
