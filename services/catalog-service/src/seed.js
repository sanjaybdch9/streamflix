// Demo catalog. Titles are fictional; every video is an openly licensed sample clip
// (Blender Foundation open movies, W3C/MDN test media, test-videos.co.uk, Video.js).
const V = {
  sintelW3c: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  bunnyTrailer: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
  bunnyFull: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
  bunnyClip: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  elephantsDream: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
  jellyfish: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
  sintelClip: 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  flower: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  oceans: 'https://vjs.zencdn.net/v/oceans.mp4',
  w3cMovie: 'https://media.w3.org/2010/05/video/movie_300.mp4',
};

export const seedTitles = [
  {
    id: 'ember-protocol', title: 'The Ember Protocol', kind: 'movie', year: 2025, maturity: '16+', durationMinutes: 124,
    genres: ['Action', 'Thriller'], cast: ['Mira Okafor', 'Daniel Reyes'], palette: ['#7f1d1d', '#f97316'],
    popularity: 98, featured: true, videoUrl: V.sintelW3c,
    synopsis: 'A disgraced field agent has 48 hours to stop a rogue AI from igniting a global blackout — with only a stolen key and a partner she cannot trust.',
  },
  {
    id: 'meadow-run', title: 'Meadow Run', kind: 'movie', year: 2024, maturity: 'U', durationMinutes: 92,
    genres: ['Animation', 'Comedy', 'Family'], cast: ['Theo Lund', 'Priya Nair'], palette: ['#14532d', '#a3e635'],
    popularity: 91, featured: true, videoUrl: V.bunnyFull,
    synopsis: 'A gentle giant of a rabbit is pushed one prank too far by three mischievous forest critters. Revenge has never been this fluffy.',
  },
  {
    id: 'iron-dreams', title: 'Iron Dreams', kind: 'movie', year: 2023, maturity: '13+', durationMinutes: 108,
    genres: ['Sci-Fi', 'Drama'], cast: ['Jonas Feld', 'Aiko Mori'], palette: ['#1e1b4b', '#6366f1'],
    popularity: 84, featured: false, videoUrl: V.elephantsDream,
    synopsis: 'Two engineers trapped inside an endless machine argue about whether the world beyond its walls is real.',
  },
  {
    id: 'dragon-keeper', title: 'Dragon Keeper', kind: 'series', year: 2025, maturity: '13+', durationMinutes: 52,
    genres: ['Fantasy', 'Adventure'], cast: ['Sel Harrow', 'Kenji Ito'], palette: ['#422006', '#eab308'],
    popularity: 95, featured: true, videoUrl: V.sintelW3c,
    synopsis: 'A lone wanderer crosses frozen mountains searching for the young dragon she raised — and the hunters who took it.',
  },
  {
    id: 'deep-blue-hours', title: 'Deep Blue Hours', kind: 'series', year: 2024, maturity: 'U', durationMinutes: 45,
    genres: ['Documentary', 'Nature'], cast: ['Narrated by Elena Voss'], palette: ['#082f49', '#06b6d4'],
    popularity: 79, featured: false, videoUrl: V.oceans,
    synopsis: 'From sunlit reefs to the midnight zone, a breathtaking journey through the ocean’s most mysterious ecosystems.',
  },
  {
    id: 'drift', title: 'Drift', kind: 'movie', year: 2022, maturity: 'U', durationMinutes: 61,
    genres: ['Documentary', 'Nature'], cast: ['Narrated by Sam Adeyemi'], palette: ['#0c4a6e', '#f0abfc'],
    popularity: 66, featured: false, videoUrl: V.jellyfish,
    synopsis: 'A meditative, wordless film about the jellyfish — the oldest multi-organ animal on Earth.',
  },
  {
    id: 'bloom', title: 'Bloom', kind: 'movie', year: 2021, maturity: 'U', durationMinutes: 78,
    genres: ['Documentary', 'Nature'], cast: ['Narrated by Lucía Romero'], palette: ['#4a044e', '#f472b6'],
    popularity: 58, featured: false, videoUrl: V.flower,
    synopsis: 'Time-lapse cameras reveal the hidden drama of flowers competing for light, water and the attention of pollinators.',
  },
  {
    id: 'last-light', title: 'Last Light', kind: 'movie', year: 2025, maturity: '16+', durationMinutes: 117,
    genres: ['Thriller', 'Drama'], cast: ['Hana Kim', 'Oskar Brandt'], palette: ['#1c1917', '#a8a29e'],
    popularity: 88, featured: false, videoUrl: V.w3cMovie,
    synopsis: 'A night-shift radio host realises the anonymous caller describing a crime is describing one that hasn’t happened yet.',
  },
  {
    id: 'carrot-heist', title: 'The Great Carrot Heist', kind: 'movie', year: 2023, maturity: 'U', durationMinutes: 84,
    genres: ['Animation', 'Comedy', 'Family'], cast: ['Bea Oduya', 'Marco Silva'], palette: ['#7c2d12', '#fb923c'],
    popularity: 74, featured: false, videoUrl: V.bunnyTrailer,
    synopsis: 'The most elaborate vegetable robbery in woodland history goes wrong in every possible way.',
  },
  {
    id: 'frostbound', title: 'Frostbound', kind: 'series', year: 2024, maturity: '16+', durationMinutes: 48,
    genres: ['Fantasy', 'Action'], cast: ['Ingrid Sol', 'Tavi Mensah'], palette: ['#0f172a', '#93c5fd'],
    popularity: 82, featured: false, videoUrl: V.sintelClip,
    synopsis: 'In a kingdom of endless winter, a sword-for-hire is offered a fortune to escort a child across enemy lines.',
  },
  {
    id: 'circuit-city', title: 'Circuit City', kind: 'series', year: 2025, maturity: '16+', durationMinutes: 41,
    genres: ['Sci-Fi', 'Thriller'], cast: ['Rafael Duarte', 'Noor Haddad'], palette: ['#172554', '#22d3ee'],
    popularity: 87, featured: false, videoUrl: V.elephantsDream,
    synopsis: 'In a city run by a single algorithm, a courier discovers a glitch that lets her see the decisions before they’re made.',
  },
  {
    id: 'small-wonders', title: 'Small Wonders', kind: 'series', year: 2022, maturity: 'U', durationMinutes: 30,
    genres: ['Animation', 'Family'], cast: ['Ava Chen', 'Leo Park'], palette: ['#365314', '#fde047'],
    popularity: 63, featured: false, videoUrl: V.bunnyClip,
    synopsis: 'Bite-sized adventures from the busiest meadow in the valley.',
  },
  {
    id: 'the-long-shift', title: 'The Long Shift', kind: 'movie', year: 2024, maturity: '13+', durationMinutes: 101,
    genres: ['Drama'], cast: ['Grace Achebe', 'Tomás Vidal'], palette: ['#3f3f46', '#fbbf24'],
    popularity: 71, featured: false, videoUrl: V.w3cMovie,
    synopsis: 'Over one chaotic night, an ER nurse balances impossible patients, a broken family and the promise she made to quit.',
  },
  {
    id: 'scale-and-shadow', title: 'Scale & Shadow', kind: 'movie', year: 2025, maturity: '13+', durationMinutes: 131,
    genres: ['Fantasy', 'Adventure', 'Action'], cast: ['Sel Harrow', 'Ruben Okoye'], palette: ['#450a0a', '#fca5a5'],
    popularity: 93, featured: true, videoUrl: V.sintelW3c,
    synopsis: 'The epic conclusion of the Keeper saga: one last flight over the burning peaks.',
  },
  {
    id: 'laugh-track', title: 'Laugh Track', kind: 'series', year: 2023, maturity: '13+', durationMinutes: 24,
    genres: ['Comedy'], cast: ['Dev Patel-Ross', 'June Albright'], palette: ['#701a75', '#facc15'],
    popularity: 77, featured: false, videoUrl: V.bunnyClip,
    synopsis: 'A failing sitcom’s writers’ room is more of a sitcom than the sitcom.',
  },
  {
    id: 'undertow', title: 'Undertow', kind: 'movie', year: 2022, maturity: '18+', durationMinutes: 112,
    genres: ['Thriller', 'Crime'], cast: ['Mira Okafor', 'Felix Novak'], palette: ['#042f2e', '#2dd4bf'],
    popularity: 80, featured: false, videoUrl: V.oceans,
    synopsis: 'A marine biologist finds evidence of a smuggling ring beneath the reef — and her own brother’s boat at the centre of it.',
  },
  {
    id: 'paper-moons', title: 'Paper Moons', kind: 'movie', year: 2021, maturity: 'U', durationMinutes: 96,
    genres: ['Drama', 'Family'], cast: ['Lila Moreau', 'Kwame Asante'], palette: ['#1e293b', '#e2e8f0'],
    popularity: 60, featured: false, videoUrl: V.flower,
    synopsis: 'A grandmother and granddaughter rebuild a shuttered greenhouse — and a relationship — one season at a time.',
  },
  {
    id: 'zero-gravity-club', title: 'Zero Gravity Club', kind: 'series', year: 2025, maturity: '13+', durationMinutes: 38,
    genres: ['Sci-Fi', 'Comedy'], cast: ['Yusuf Kaya', 'Bree Collins'], palette: ['#2e1065', '#c084fc'],
    popularity: 85, featured: false, videoUrl: V.elephantsDream,
    synopsis: 'Six misfit trainees. One very old space station. Zero chance of everything going to plan.',
  },
];

// Sources that stopped working, mapped to their replacements. Applied on every start, so
// databases seeded before a source broke get repaired without being re-seeded.
// download.blender.org returns 403 to AWS data-centre IPs, so video failed on EKS.
export const retiredVideoUrls = {
  'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4': V.sintelW3c,
};
