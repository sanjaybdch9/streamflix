// Demo catalog. Titles and synopses are fictional; every video and every image is openly
// licensed: Blender Foundation / Blender Studio open movies (CC BY 3.0 / 4.0) and MDN's CC0
// flower clip. Images are stills from those films (frontend/public/titles); credits in README.
const V = {
  sintelW3c: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  bunnyTrailer: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
  bunnyFull: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
  bunnyClip: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  elephantsDream: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
  sintelClip: 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  flower: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  cosmosLaundromat: 'https://archive.org/download/CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20%281080p%29.mp4',
  spriteFright: 'https://archive.org/download/sprite-fright/Sprite%20Fright%20-%20Open%20Movie%20by%20Blender%20Studio-804p.mp4',
  caminandes1: 'https://archive.org/download/Caminandes1LlamaDrama/01_llama_drama_1080p.mp4',
  caminandes2: 'https://archive.org/download/Caminandes2GranDillama/02_gran_dillama_1080p.mp4',
  caminandes3: 'https://archive.org/download/CaminandesLlamigos/Caminandes_%20Llamigos-1080p.mp4',
};

export const seedTitles = [
  {
    id: 'ember-protocol', title: 'The Ember Protocol', kind: 'movie', year: 2025, maturity: '16+', durationMinutes: 124,
    genres: ['Action', 'Fantasy'], cast: ['Mira Okafor', 'Daniel Reyes'], palette: ['#7f1d1d', '#f97316'],
    popularity: 98, featured: true, videoUrl: V.sintelW3c,
    posterUrl: '/titles/ember-protocol.jpg', backdropUrl: '/titles/ember-protocol-wide.jpg',
    synopsis: 'Hunted through a city of ash and embers, a young fighter with nothing left to lose sets out to take back the one thing that was ever hers.',
  },
  {
    id: 'meadow-run', title: 'Meadow Run', kind: 'movie', year: 2024, maturity: 'U', durationMinutes: 92,
    genres: ['Animation', 'Comedy', 'Family'], cast: ['Theo Lund', 'Priya Nair'], palette: ['#14532d', '#a3e635'],
    popularity: 91, featured: true, videoUrl: V.bunnyFull,
    posterUrl: '/titles/meadow-run.jpg', backdropUrl: '/titles/meadow-run-wide.jpg',
    synopsis: 'A gentle giant of a rabbit is pushed one prank too far by three mischievous forest critters. Revenge has never been this fluffy.',
  },
  {
    id: 'iron-dreams', title: 'Iron Dreams', kind: 'movie', year: 2023, maturity: '13+', durationMinutes: 108,
    genres: ['Sci-Fi', 'Drama'], cast: ['Jonas Feld', 'Aiko Mori'], palette: ['#1e1b4b', '#6366f1'],
    popularity: 84, featured: false, videoUrl: V.elephantsDream,
    posterUrl: '/titles/iron-dreams.jpg', backdropUrl: '/titles/iron-dreams-wide.jpg',
    synopsis: 'Two engineers trapped inside an endless machine argue about whether the world beyond its walls is real.',
  },
  {
    id: 'dragon-keeper', title: 'Dragon Keeper', kind: 'series', year: 2025, maturity: '13+', durationMinutes: 52,
    genres: ['Fantasy', 'Adventure'], cast: ['Sel Harrow', 'Kenji Ito'], palette: ['#422006', '#eab308'],
    popularity: 95, featured: true, videoUrl: V.sintelW3c,
    posterUrl: '/titles/dragon-keeper.jpg', backdropUrl: '/titles/dragon-keeper-wide.jpg',
    synopsis: 'A lone wanderer crosses frozen mountains searching for the young dragon she raised — and the hunters who took it.',
  },
  {
    id: 'bloom', title: 'Bloom', kind: 'movie', year: 2021, maturity: 'U', durationMinutes: 78,
    genres: ['Documentary', 'Nature'], cast: ['Narrated by Lucía Romero'], palette: ['#4a044e', '#f472b6'],
    popularity: 58, featured: false, videoUrl: V.flower,
    posterUrl: '/titles/bloom.jpg', backdropUrl: '/titles/bloom-wide.jpg',
    synopsis: 'Time-lapse cameras reveal the hidden drama of flowers competing for light, water and the attention of pollinators.',
  },
  {
    id: 'last-light', title: 'Last Light', kind: 'movie', year: 2025, maturity: '16+', durationMinutes: 117,
    genres: ['Drama', 'Sci-Fi'], cast: ['Hana Kim', 'Oskar Brandt'], palette: ['#1c1917', '#fbbf24'],
    popularity: 88, featured: false, videoUrl: V.cosmosLaundromat,
    posterUrl: '/titles/last-light.jpg', backdropUrl: '/titles/last-light-wide.jpg',
    synopsis: 'On a windswept island at the edge of the world, a weary sheep is offered a deal by a smooth-talking stranger: any life he wants — for a price.',
  },
  {
    id: 'carrot-heist', title: 'The Great Carrot Heist', kind: 'movie', year: 2023, maturity: 'U', durationMinutes: 84,
    genres: ['Animation', 'Comedy', 'Family'], cast: ['Bea Oduya', 'Marco Silva'], palette: ['#7c2d12', '#fb923c'],
    popularity: 74, featured: false, videoUrl: V.bunnyTrailer,
    posterUrl: '/titles/carrot-heist.jpg', backdropUrl: '/titles/carrot-heist-wide.jpg',
    synopsis: 'The most elaborate vegetable robbery in woodland history goes wrong in every possible way.',
  },
  {
    id: 'frostbound', title: 'Frostbound', kind: 'series', year: 2024, maturity: '16+', durationMinutes: 48,
    genres: ['Fantasy', 'Action'], cast: ['Ingrid Sol', 'Tavi Mensah'], palette: ['#0f172a', '#93c5fd'],
    popularity: 82, featured: false, videoUrl: V.sintelClip,
    posterUrl: '/titles/frostbound.jpg', backdropUrl: '/titles/frostbound-wide.jpg',
    synopsis: 'In a kingdom of endless winter, a hooded sword-for-hire is offered a fortune to escort a child across the frozen passes.',
  },
  {
    id: 'circuit-city', title: 'Circuit City', kind: 'series', year: 2025, maturity: '16+', durationMinutes: 41,
    genres: ['Sci-Fi', 'Thriller'], cast: ['Rafael Duarte', 'Noor Haddad'], palette: ['#172554', '#22d3ee'],
    popularity: 87, featured: false, videoUrl: V.elephantsDream,
    posterUrl: '/titles/circuit-city.jpg', backdropUrl: '/titles/circuit-city-wide.jpg',
    synopsis: 'In a city run by a single algorithm, a courier discovers a glitch that lets her see the decisions before they’re made.',
  },
  {
    id: 'small-wonders', title: 'Small Wonders', kind: 'series', year: 2022, maturity: 'U', durationMinutes: 30,
    genres: ['Animation', 'Family'], cast: ['Ava Chen', 'Leo Park'], palette: ['#365314', '#fde047'],
    popularity: 63, featured: false, videoUrl: V.bunnyClip,
    posterUrl: '/titles/small-wonders.jpg', backdropUrl: '/titles/small-wonders-wide.jpg',
    synopsis: 'Bite-sized adventures from the busiest meadow in the valley.',
  },
  {
    id: 'scale-and-shadow', title: 'Scale & Shadow', kind: 'movie', year: 2025, maturity: '13+', durationMinutes: 131,
    genres: ['Fantasy', 'Adventure', 'Action'], cast: ['Sel Harrow', 'Ruben Okoye'], palette: ['#450a0a', '#fca5a5'],
    popularity: 93, featured: true, videoUrl: V.sintelW3c,
    posterUrl: '/titles/scale-and-shadow.jpg', backdropUrl: '/titles/scale-and-shadow-wide.jpg',
    synopsis: 'The epic conclusion of the Keeper saga: one last flight over the burning peaks.',
  },
  {
    id: 'paper-moons', title: 'Paper Moons', kind: 'movie', year: 2021, maturity: 'U', durationMinutes: 96,
    genres: ['Drama', 'Family'], cast: ['Lila Moreau', 'Kwame Asante'], palette: ['#1e293b', '#e2e8f0'],
    popularity: 60, featured: false, videoUrl: V.flower,
    posterUrl: '/titles/paper-moons.jpg', backdropUrl: '/titles/paper-moons-wide.jpg',
    synopsis: 'A grandmother and granddaughter rebuild a shuttered greenhouse — and a relationship — one season at a time.',
  },
  {
    id: 'zero-gravity-club', title: 'Zero Gravity Club', kind: 'series', year: 2025, maturity: '13+', durationMinutes: 38,
    genres: ['Sci-Fi', 'Comedy'], cast: ['Yusuf Kaya', 'Bree Collins'], palette: ['#2e1065', '#c084fc'],
    popularity: 85, featured: false, videoUrl: V.elephantsDream,
    posterUrl: '/titles/zero-gravity-club.jpg', backdropUrl: '/titles/zero-gravity-club-wide.jpg',
    synopsis: 'Six misfit trainees. One very old space station. Zero chance of everything going to plan.',
  },
  {
    id: 'hollow-woods', title: 'Hollow Woods', kind: 'movie', year: 2024, maturity: '13+', durationMinutes: 89,
    genres: ['Horror', 'Comedy'], cast: ['Priya Nair', 'Tom Hale'], palette: ['#14532d', '#ef4444'],
    popularity: 90, featured: false, videoUrl: V.spriteFright,
    posterUrl: '/titles/hollow-woods.jpg', backdropUrl: '/titles/hollow-woods-wide.jpg',
    synopsis: 'A rowdy group of friends camping in a sleepy forest discovers that the tiny locals take littering very, very personally.',
  },
  {
    id: 'koro', title: 'Koro', kind: 'series', year: 2023, maturity: 'U', durationMinutes: 12,
    genres: ['Animation', 'Comedy', 'Family'], cast: ['Lucas Ferrer'], palette: ['#78350f', '#fcd34d'],
    popularity: 81, featured: false, videoUrl: V.caminandes1,
    posterUrl: '/titles/koro.jpg', backdropUrl: '/titles/koro-wide.jpg',
    synopsis: 'Koro the llama just wants to get to the other side of the road. The road has other plans.',
  },
  {
    id: 'fence-lines', title: 'Fence Lines', kind: 'movie', year: 2024, maturity: 'U', durationMinutes: 78,
    genres: ['Animation', 'Comedy', 'Family'], cast: ['Lucas Ferrer', 'Ana Ruiz'], palette: ['#1e3a8a', '#fb923c'],
    popularity: 76, featured: false, videoUrl: V.caminandes2,
    posterUrl: '/titles/fence-lines.jpg', backdropUrl: '/titles/fence-lines-wide.jpg',
    synopsis: 'The juiciest leaves in Patagonia grow on the far side of an electric fence. One stubborn llama will not take no for an answer.',
  },
  {
    id: 'winter-rivals', title: 'Winter Rivals', kind: 'movie', year: 2025, maturity: 'U', durationMinutes: 85,
    genres: ['Animation', 'Comedy', 'Family'], cast: ['Lucas Ferrer', 'Mia Sato'], palette: ['#0c4a6e', '#e11d48'],
    popularity: 83, featured: false, videoUrl: V.caminandes3,
    posterUrl: '/titles/winter-rivals.jpg', backdropUrl: '/titles/winter-rivals-wide.jpg',
    synopsis: 'In the frozen south, a hungry llama and a penguin with big ideas team up — and fall out — over the last berries of winter.',
  },
];

// Titles removed from the demo catalog (their footage was copyrighted, unclearly licensed or a
// test pattern). Deleted on every start so existing databases match this file.
export const retiredTitleIds = ['deep-blue-hours', 'drift', 'the-long-shift', 'laugh-track', 'undertow'];

// Sources that stopped working, mapped to their replacements. Applied on every start, so
// databases seeded before a source broke get repaired without being re-seeded.
// download.blender.org returns 403 to AWS data-centre IPs, so video failed on EKS.
export const retiredVideoUrls = {
  'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4': V.sintelW3c,
};
