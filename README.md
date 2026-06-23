# Lychees.studio

Portfolio en zakelijke website voor Lychees.studio — een webdesignstudio gespecialiseerd in toegankelijke, razendsnelle websites voor het Nederlandse MKB.

**Live:** [lychees.studio](https://lychees.studio)

---

## Tech stack

| Onderdeel | Keuze |
|---|---|
| Build tool | Vite 5 |
| 3D animatie | Three.js 0.160 |
| Styling | Vanilla CSS (CSS Nesting, custom properties) |
| Deployment | Netlify (auto-deploy via GitHub) |
| Analytics | Plausible (privacy-first, geen cookies) |
| Formulieren | Formspree |

Geen frameworks, geen onnodige dependencies. Alles is handgeschreven HTML, CSS en JavaScript.

---

## Projectstructuur

```
/
├── index.html          # Nederlandstalige homepage
├── en/
│   └── index.html      # Engelstalige homepage
├── werk/               # Projectpagina's
│   ├── luxcleaning.html
│   ├── strakplan.html
│   └── artquake.html
├── styles/
│   ├── styleguide.css  # Design tokens, reset, globale componenten
│   ├── style.css       # Homepage-specifieke stijlen
│   └── project.css     # Stijlen voor werkpagina's
├── images/             # Projectafbeeldingen (AVIF)
├── main.js             # Three.js animatie + interactie
├── vite.config.js
└── netlify.toml
```

---

## Designkeuzes

### Lychee-intro (Three.js)
De homepage opent met een interactieve 3D-lychee die de volledige viewport vult. De bezoeker moet hem aanklikken om de site te "openen". Dit is een bewuste keuze voor **perceived performance**: in plaats van een laadscherm krijgt de bezoeker iets om mee te interageren. De animatieloop pauzeert automatisch als de tab verborgen is om CPU te sparen.

De lychee is opgebouwd uit een `SphereGeometry` met procedurele displacement (wiskundige noise-functie) om de ruwe, organische schil na te bootsen. De toon-shading (`MeshToonMaterial`) geeft het een grafische, illustratieve uitstraling passend bij het merkkarakter.

### Kleurpalet
```
--color-bg:      #f9e9e9   Warme crème achtergrond (intro)
--color-primary: #c9293f   Lychee-rood (CTA's, accenten)
--color-ink:     #111      Bijna-zwart voor tekst en borders
```
Het rood is direct ontleend aan de lychee-vrucht. De crème achtergrond zorgt voor zachte contrasten zonder het koude gevoel van wit. Na de intro-animatie kleurt de achtergrond volledig rood — de lychee barst open en onthult de site.

### Typografie
Systeemfonts (`sans-serif`) zonder externe fontlaadtijd. Koppen zijn altijd `font-weight: 800` en gebruiken `clamp()` voor vloeiende responsieve schaalgrootte zonder breakpoints.

### Toegankelijkheid
- Skip-link naar `#main` voor toetsenbordgebruikers
- Alle animaties respecteren `prefers-reduced-motion`
- WCAG 2.1 AA contrast op alle tekst
- Canvas is `aria-hidden="true"` — decoratief, niet in de focusvolgorde
- Carrouselpijlen hebben expliciete `aria-label`
- Formuliervelden hebben gekoppelde `<label>` elementen

### Buttons en cards (neo-brutalist)
Buttons en kaarten hebben een harde `box-shadow: 2px 2px 0 #111` zonder blur. Bij hover verschuift het element 2px naar linksboven zodat de schaduw groter lijkt — een neo-brutalistisch interactiepatroon dat click-feedback simuleert.

### Responsive images
Projectafbeeldingen in de carrousel worden geladen als `<img loading="lazy" decoding="async">` met expliciete `width` en `height` attributen (1920×1440) voor CLS-preventie. De afbeeldingen faden in via `@starting-style` voor een soepele perceived loading-ervaring. Tijdens het laden is een donkere placeholder zichtbaar.

### CSS animaties
Scroll-gestuurde animaties via `animation-timeline: view()` en `animation-range: entry` — geen JavaScript nodig voor fade-in bij scrollen. Woorden in de H1 poppen één voor één in via een `--i` CSS custom property als vertraging-index.

---

## Lokale ontwikkeling

```bash
npm install
npm run dev      # Dev server op localhost:5173
npm run build    # Productie-build naar dist/
```

---

## Deployment

Netlify deployt automatisch bij elke push naar `main`. De `netlify.toml` configureert het build commando en de publish directory:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```
