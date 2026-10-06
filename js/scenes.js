/* ==========================================================================
   THE SCREENPLAY
   One idea per frame. A year, a few words, an image.

   Scene fields
     act, year (number | [[ms, year], ...] | 'blank'), dur (ms), label
     bg: [image ids, first available wins]   video: video id (preferred if present)
     kb: Ken Burns move (in|out|left|right|up|down|still)   focus: object-position override
     dim: media opacity   grade: bw|silver|bleed|color|warm|cold|invert|now
     frame: scope (2.39:1 letterbox) | imax (full frame)   shade: heavy|none
     trans: fade | cut | black
     card / beats: on-screen text (see film.js → cardHTML)
     fx + fxOpts: special shot (js/fx.js)
     cue: music state (carried forward) · hit, hitAt, riser, rewindSnd, stop: one-shots
   ========================================================================== */
const SCREENPLAY = (() => {
  const acts = [
    { n: 0, roman: '',    name: 'Prologue' },
    { n: 1, roman: 'I',   name: 'The Idea' },
    { n: 2, roman: 'II',  name: 'Teaching Machines' },
    { n: 3, roman: 'III', name: 'The Deep Learning Revolution' },
    { n: 4, roman: 'IV',  name: 'The Language Revolution' },
    { n: 5, roman: 'V',   name: 'AI Discovers' },
    { n: 6, roman: 'VI',  name: 'Machines That Act' },
    { n: 7, roman: 'VII', name: '2026 · Where We Are Now' },
    { n: 8, roman: 'VIII', name: 'What Do We Do With Intelligence?', cardLabel: 'The final act' },
    { n: 9, roman: '',    name: 'Epilogue' },
  ];

  const actCard = (act, extra = {}) => ({
    id: 'act-' + act, act, dur: 4400, trans: 'black', frame: 'scope', shade: 'heavy',
    label: acts[act].name, hit: 'boom',
    card: { layout: 'act', t: acts[act].name, d: .3 },
    ...extra,
  });

  // The last frame of every act: a question the next act answers. The cursor waits for it.
  const bridge = (act, id, q, extra = {}) => ({
    id, act, dur: 5800, frame: 'scope', trans: 'cut', label: 'The next question', shade: 'heavy',
    cue: { ost: 0, padLevel: .3 }, hit: 'sub',
    card: { layout: 'quote', q: q + '<b class="caret"></b>', d: .4, cls: 'bridge' },
    ...extra,
  });

  const scenes = [
    /* ------------------------------ PROLOGUE ------------------------------ */
    {
      id: 'how', act: 0, dur: 4800, frame: 'imax', trans: 'cut', label: 'Today',
      cue: { tick: 60, pad: 'Dm', padLevel: .3, ost: 0, shep: 0, beat: 0 },
      card: { layout: 'quote', q: '<i>How did we get here?</i>', d: .5 },
    },
    {
      id: 'rewind', act: 0, dur: 4800, grade: 'invert', frame: 'imax', trans: 'cut', label: 'Rewind',
      cue: { tick: 0, padLevel: 0 }, rewindSnd: 4.4,
      fx: 'rewind', fxOpts: { from: 2026, to: 1936, dur: 3900 },
      say: '2026 … 1936.',
    },

    /* ------------------------------ ACT I · THE IDEA ------------------------------ */
    actCard(1, { cue: { tick: 60, pad: 'Am', padLevel: .5, ost: 0 }, grade: 'bw' }),
    {
      id: 'turing', act: 1, year: 1936, dur: 8200, grade: 'bw', label: 'Alan Turing',
      bg: ['turing'], kb: 'in', print: 'paper',
      fx: 'tape',
      card: { k: '1936 · Cambridge', t: 'A machine on paper', l: 'Alan Turing imagines one machine that could compute <em>anything computable</em>.', d: 1.2 },
    },
    {
      id: 'colossus', act: 1, year: 1944, dur: 7200, grade: 'bw', label: 'Bletchley Park',
      bg: ['colossus', 'bombe', 'bletchley'], kb: 'left',
      card: { k: '1944 · Bletchley Park', t: 'Colossus', l: 'Wartime codebreakers build electronic machines to crack enemy ciphers.' },
    },
    {
      id: 'mark1', act: 1, year: 1944, dur: 6800, grade: 'bw', label: 'Harvard Mark I',
      video: 'v-mark1', bg: ['ibm-704'], kb: 'in',
      card: { k: '1944 · Harvard', t: 'Mark I', l: 'Fifty-one feet of switches, shafts and relays, calculating for the war.' },
    },
    {
      id: 'eniac', act: 1, year: 1946, dur: 7600, grade: 'bw', label: 'ENIAC',
      bg: ['eniac'], kb: 'right',
      card: { k: 'February 1946 · Philadelphia', t: 'ENIAC', l: '17,468 vacuum tubes. 30 tons. Newspapers call it an <em>electronic brain</em>.' },
    },
    {
      id: 'programmers', act: 1, year: 1946, dur: 6600, grade: 'bw', label: 'The first programmers',
      bg: ['eniac-programmers', 'eniac'], kb: 'in',
      card: { t: 'Its first programmers', l: 'Six women, programming it by hand with cables and switches.' },
    },
    {
      id: 'compute', act: 1, dur: 5600, grade: 'bw', label: 'The question',
      gen: 'g-tape-reader', video: 'v-mainframe', bg: ['vacuum-tubes', 'punch-cards'], dim: .3, kb: 'still', shade: 'heavy',
      beats: [
        { at: 0, until: 5400, layout: 'quote', q: 'Can a machine <i>compute?</i>', d: .3 },
        { at: 2600, layout: 'low', t: '<span style="color:var(--amber)">Yes.</span>', d: 0, cls: 'yes' },
      ],
    },
    {
      id: 'think', act: 1, year: 1950, dur: 7800, grade: 'bw', frame: 'imax', label: 'Can machines think?',
      bg: ['pilot-ace', 'turing'], dim: .4, kb: 'in', shade: 'heavy', hit: 'sub',
      card: { layout: 'quote', q: '“I propose to consider the question, <i>‘Can machines think?’</i>”', by: 'Alan Turing · 1950', d: .5 },
    },
    {
      id: 'dartmouth', act: 1, year: 1956, dur: 9400, grade: 'bw', label: 'Dartmouth',
      bg: ['dartmouth'], dim: .4, kb: 'up', shade: 'heavy',
      cue: { ost: .28 },
      fx: 'proposal',
      card: { layout: 'low', l: 'Summer 1956, Dartmouth College. <em>A new field gets its name.</em>', d: 5.6 },
      say: '1955: “A Proposal for the Dartmouth Summer Research Project on Artificial Intelligence.” Summer 1956, Dartmouth College. A new field gets its name.',
    },
    {
      id: 'conjecture', act: 1, year: 1956, dur: 8200, grade: 'bw', label: 'The conjecture',
      bg: ['dartmouth-proposal'], kb: 'in', print: 'paper', shade: 'heavy',
      card: { layout: 'low', k: 'McCarthy · Minsky · Rochester · Shannon', l: '“Every aspect of learning… can in principle be so precisely described that a machine can be made to simulate it.”', src: 'The Dartmouth proposal · 1955', cls: 'quoteish narrow', d: .6 },
    },
    bridge(1, 'q-teach', 'But how do you teach a machine <i>to think?</i>'),

    /* ------------------------------ ACT II · TEACHING MACHINES ------------------------------ */
    actCard(2, { cue: { tick: 66, pad: 'F', padLevel: .5, ost: .3 }, grade: 'bw' }),
    {
      id: 'chess-human', act: 2, dur: 6200, grade: 'bw', label: 'Programming intelligence',
      video: 'v-chess', bg: ['chess-board'], kb: 'in',
      card: { t: 'Chess', l: 'For centuries, the measure of a brilliant mind.' },
    },
    {
      id: 'chess-lab', act: 2, year: 1956, dur: 7000, grade: 'bw', label: 'Programming intelligence',
      bg: ['maniac-chess', 'maniac'], kb: 'in', print: 'paper',
      card: { k: '1956 · Los Alamos', t: 'The first laboratory', l: 'A computer plays chess by following rules written by people.', cls: 'narrow' },
    },
    {
      id: 'perceptron', act: 2, year: 1958, dur: 8200, grade: 'bw', label: 'The Perceptron',
      bg: ['perceptron'], kb: 'in',
      card: { k: '1958 · Frank Rosenblatt', t: 'The Perceptron', l: 'A machine that learns from <em>examples</em>, not instructions.', stamp: ['“New Navy Device Learns by Doing”', 'The New York Times · 8 July 1958'] },
    },
    {
      id: 'eliza', act: 2, year: 1966, dur: 10600, grade: 'bw', label: 'ELIZA',
      bg: ['teletype', 'weizenbaum', 'eliza'], dim: .45, kb: 'still', shade: 'heavy',
      fx: 'eliza',
      card: { layout: 'low', k: '1966 · MIT', t: 'ELIZA', l: 'A simple script. People confide in it anyway.', d: .8, cls: 'narrow' },
      say: 'ELIZA, 1966. “Men are all alike.” “IN WHAT WAY” A simple script. People confide in it anyway.',
    },
    {
      id: 'winter', act: 2, year: 1974, dur: 7200, grade: 'bw', label: 'AI winter',
      gen: 'g-snow-room', bg: ['punch-cards', 'mainframe-room'], dim: .55, kb: 'out',
      cue: { tick: 46, pad: 'Em', padLevel: .35, ost: 0 },
      fx: 'snow',
      card: { t: 'AI Winter', l: 'Promises outrun results. The funding freezes.' },
    },
    {
      id: 'expert', act: 2, year: 1980, dur: 7200, grade: 'silver', label: 'Expert systems',
      bg: ['lisp-machine', 'mainframe-room'], kb: 'right',
      cue: { tick: 66, pad: 'F', padLevel: .5, ost: .3 },
      fx: 'rules', fxOpts: { set: 'expert' },
      card: { k: '1980s', t: 'Expert systems', l: 'Human expertise, hand-coded into thousands of rules.' },
    },
    {
      id: 'backprop', act: 2, year: 1986, dur: 8800, grade: 'silver', label: 'Machines learn',
      shade: 'heavy',
      cue: { tick: 72, pad: 'C', padLevel: .55, ost: .45 },
      fx: 'neural',
      card: { k: '1986 · Rumelhart, Hinton & Williams', t: 'Machines learn', l: 'Backpropagation: networks that learn from their own mistakes.' },
    },
    {
      id: 'lenet', act: 2, year: 1989, dur: 7200, grade: 'silver', label: 'LeNet',
      bg: ['mnist', 'lecun'], kb: 'in', dim: .45,
      card: { k: '1989 · Bell Labs · Yann LeCun', t: 'Learning to read', l: 'A neural network learns to recognise handwritten digits.' },
    },
    {
      id: 'shift', act: 2, dur: 6800, frame: 'imax', label: 'The shift', shade: 'heavy',
      fx: 'shift', hit: 'sub', hitAt: 2.7,
      say: 'The shift: from programming the rules to giving the machine data.',
    },
    {
      id: 'imagenet', act: 2, year: 2009, dur: 8200, grade: 'silver', label: 'ImageNet',
      fx: 'mosaic', shade: 'heavy',
      card: { k: '2009 · Fei-Fei Li', t: 'ImageNet', l: 'Millions of labelled images. A world for machines to learn from.', cls: 'narrow' },
    },
    bridge(2, 'scale-q', 'What happens when we give learning machines <i>enormous</i> data and computation?', {
      video: 'v-datacenter', gen: 'g-corridor', bg: ['server-racks', 'supercomputer'], dim: .45, kb: 'in', grade: 'silver',
    }),

    /* ------------------------------ ACT III · DEEP LEARNING ------------------------------ */
    actCard(3, { cue: { tick: 80, pad: 'Am', padLevel: .55, ost: .5 }, grade: 'bleed' }),
    {
      id: 'alexnet', act: 3, year: 2012, dur: 8800, grade: 'color', frame: 'imax', trans: 'cut', label: 'AlexNet',
      bg: ['gpu', 'chip-macro'], kb: 'in', fit: 'contain',
      cue: { tick: 84, ost: .6 }, hit: 'braam',
      fx: 'bars',
      card: { layout: 'high', k: '2012 · University of Toronto', t: 'AlexNet', l: 'Deep networks + GPUs + ImageNet. <em>A turning point.</em>' },
    },
    {
      id: 'rewind-97', act: 3, dur: 2600, grade: 'invert', frame: 'imax', trans: 'cut', label: 'Meanwhile…',
      fx: 'rewind', fxOpts: { from: 2012, to: 1997, dur: 1900 }, rewindSnd: 2.3,
      say: 'Meanwhile, back to 1997.',
    },
    {
      id: 'deepblue', act: 3, year: 1997, dur: 7600, grade: 'bleed', trans: 'cut', label: 'The chess machine',
      bg: ['kasparov', 'deep-blue'], kb: 'in',
      cue: { pad: 'G' },
      beats: [
        { at: 0, layout: 'tag', tg: 'Search', d: 1.6 },
        { at: 0, layout: 'low', k: 'May 1997 · New York', t: 'Deep Blue', l: 'A machine defeats the world chess champion, Garry Kasparov.' },
      ],
    },
    {
      id: 'deepblue-2', act: 3, year: 1997, dur: 5000, grade: 'bleed', label: 'The chess machine',
      gen: 'g-king-falls', bg: ['deep-blue', 'chess-board'], kb: 'left',
      card: { layout: 'low', l: '200 million positions a second. <em>Brute-force search.</em>', d: .6 },
    },
    {
      id: 'dqn', act: 3, year: 2013, dur: 8600, grade: 'color', label: 'Learning from pixels',
      shade: 'heavy',
      fx: 'breakout',
      beats: [
        { at: 0, layout: 'tag', tg: 'Learn', d: 1.8, cls: 'left' },
        { at: 0, layout: 'low', k: '2013 · DeepMind', t: 'Experience', l: 'A machine learns Atari games from pixels alone. No rules given.', cls: 'narrow' },
      ],
    },
    {
      id: 'sedol', act: 3, year: 2016, dur: 7200, grade: 'color', frame: 'imax', label: 'AlphaGo',
      bg: ['lee-sedol', 'go-board'], kb: 'in', print: 'paper',
      card: { k: 'March 2016 · Seoul', t: 'AlphaGo vs Lee Sedol', l: 'Go: more possible positions than atoms in the universe.' },
    },
    {
      id: 'move37', act: 3, year: 2016, dur: 8800, grade: 'color', label: 'Move 37',
      gen: 'g-go-stone', bg: ['go-board'], dim: .3, kb: 'still', shade: 'heavy',
      fx: 'go', hit: 'sub', hitAt: 4.2,
      card: { layout: 'low', t: 'Move 37', l: 'A move few humans would ever play. AlphaGo wins, 4–1.', d: 4.8, cls: 'narrow' },
    },
    {
      id: 'alphazero', act: 3, year: 2017, dur: 7200, grade: 'color', label: 'AlphaZero',
      bg: ['chess-board'], kb: 'out',
      beats: [
        { at: 0, layout: 'tag', tg: 'Discover', d: 1.6 },
        { at: 0, layout: 'low', k: '2017 · AlphaZero', t: 'Self-play', l: 'A machine teaches itself chess from scratch in about four hours.' },
      ],
    },
    {
      id: 'triptych', act: 3, dur: 6600, frame: 'imax', label: 'Search → Learn → Discover', shade: 'heavy',
      fx: 'triptych',
      say: 'Search → Learn → Discover.',
    },
    bridge(3, 'q-language', 'Machines had mastered our games. Could they master <i>our language?</i>'),

    /* ------------------------------ ACT IV · LANGUAGE ------------------------------ */
    actCard(4, { cue: { tick: 92, pad: 'F', padLevel: .55, ost: .6, shep: .2 }, grade: 'color' }),
    {
      id: 'attention', act: 4, year: 2017, dur: 9200, grade: 'color', label: 'The Transformer', shade: 'heavy',
      fx: 'attention',
      card: { layout: 'high', k: 'June 2017 · Google', t: 'Attention', l: 'Eight researchers. One architecture: <em>the Transformer</em>.' },
      say: '2017: “Attention Is All You Need.” The animal didn’t cross the street because it was too tired. The model learns what “it” refers to. Eight researchers. One architecture: the Transformer.',
    },
    {
      id: 'scale', act: 4, year: [[0, 2018], [2800, 2019], [3900, 2020]], dur: 9000, grade: 'color', label: 'Scale', shade: 'heavy',
      cue: { pad: 'C' },
      fx: 'scale',
      card: { layout: 'high', t: 'Scale', l: 'Language models grow more than a thousandfold in two years.' },
      say: 'GPT (2018, 117M parameters) · BERT (2018, 340M) · GPT-2 (2019, 1.5B) · GPT-3 (2020, 175B). Models grow more than a thousandfold in two years.',
    },
    {
      id: 'prompt', act: 4, year: 2022, dur: 9800, grade: 'color', label: 'Generative images',
      fx: 'prompt', fxOpts: { text: 'a photograph of an astronaut riding a horse', image: 'ai-art-sd', alt: 'AI-generated image of an astronaut riding a horse' },
      card: { layout: 'low', t: 'Imagine', l: 'Words become images.', d: 6 },
      say: 'A prompt, “a photograph of an astronaut riding a horse”, becomes an image. Words become images.',
    },
    {
      id: 'chatgpt', act: 4, year: 2022, dur: 9600, grade: 'color', frame: 'imax', trans: 'cut', label: 'ChatGPT', shade: 'heavy',
      cue: { shep: .35, pad: 'Am' }, hit: 'braam',
      fx: 'chat', fxOpts: { q: 'Can machines think?', a: 'That depends on what we mean by “think.” In 1950, Alan Turing proposed a test…' },
      card: { layout: 'high', k: 'November 30, 2022', t: 'ChatGPT', l: 'AI enters everyday life.', d: .3 },
      say: 'November 30, 2022. ChatGPT. AI enters everyday life. (Illustrative conversation.)',
    },
    {
      id: 'users', act: 4, year: 2023, dur: 6200, grade: 'color', label: 'Everyday life',
      bg: ['smartphone', 'city-night'], kb: 'in', shade: 'heavy',
      card: { layout: 'huge', n: '100M', l: 'monthly users, two months after launch.', src: 'Analyst estimate · UBS, via Reuters · February 2023', d: .3 },
    },
    {
      id: 'modalities', act: 4, year: 2023, dur: 6800, grade: 'color', label: 'Generative AI',
      bg: ['ai-art-dalle'], dim: .4, kb: 'left', shade: 'heavy',
      fx: 'modalities',
      card: { layout: 'high', k: '2023 · GPT-4 and beyond', t: 'Generative AI', d: .2, cls: 'small' },
      say: 'Generative AI: text · images · code · audio · video.',
    },
    bridge(4, 'q-discover', 'Machines could now create. But could they <i>discover?</i>', {
      bg: ['deep-field'], dim: .3, kb: 'in', grade: 'color',
    }),

    /* ------------------------------ ACT V · AI DISCOVERS ------------------------------ */
    actCard(5, { cue: { tick: 100, pad: 'Fmaj7', padLevel: .6, ost: .55, shep: .35 }, grade: 'warm' }),
    {
      id: 'alphafold', act: 5, year: 2020, dur: 8200, grade: 'warm', label: 'AlphaFold',
      video: 'v-protein', bg: ['protein-1', 'protein-2'], kb: 'in',
      card: { k: '2020 · Google DeepMind', t: 'AlphaFold', l: 'A 50-year grand challenge in biology: how proteins fold.' },
    },
    {
      id: 'afdb', act: 5, year: 2022, dur: 7200, grade: 'warm', label: 'AlphaFold DB',
      bg: ['protein-2', 'protein-1'], kb: 'out',
      card: { t: '200 million structures', l: 'Nearly every catalogued protein known to science, predicted and shared freely.' },
    },
    {
      id: 'nobel', act: 5, year: 2024, dur: 5200, grade: 'warm', frame: 'imax', label: 'The Nobel Prize',
      bg: ['nobel-medal', 'nobel-ceremony'], kb: 'in', hit: 'chime',
      card: { layout: 'center', k: 'Stockholm · October 2024', t: 'Two Nobel Prizes', d: .4 },
    },
    {
      id: 'nobel-physics', act: 5, year: 2024, dur: 6400, grade: 'warm', frame: 'imax', label: 'Physics',
      bg: ['hinton', 'hopfield'], kb: 'in',
      card: { layout: 'low', k: 'Physics', t: 'Hopfield &amp; Hinton', l: 'For the discoveries that let artificial neural networks learn.', d: .3 },
    },
    {
      id: 'nobel-chem', act: 5, year: 2024, dur: 6400, grade: 'warm', frame: 'imax', label: 'Chemistry',
      bg: ['hassabis', 'jumper'], kb: 'in',
      card: { layout: 'low', k: 'Chemistry', t: 'Baker, Hassabis &amp; Jumper', l: 'For designing proteins, and for predicting their structures with AlphaFold.', d: .3 },
    },
    {
      id: 'games-life', act: 5, dur: 6600, grade: 'warm', label: 'From games to life',
      gen: 'g-helix', video: 'v-lab', bg: ['dna', 'lab'], dim: .55, kb: 'in', shade: 'heavy',
      beats: [
        { at: 0, until: 6400, layout: 'quote', q: '<i>From playing games…</i>', d: .3, cls: 'up' },
        { at: 2600, layout: 'quote', q: '…to understanding life.', d: 0, cls: 'down' },
      ],
    },
    {
      id: 'alphaevolve', act: 5, year: 2025, dur: 8800, grade: 'warm', label: 'AlphaEvolve', shade: 'heavy',
      fx: 'matrix',
      card: { layout: 'high', k: 'May 2025 · Google DeepMind', t: 'AlphaEvolve', d: .2, cls: 'small' },
      say: 'AlphaEvolve, 2025: multiplying two 4×4 complex matrices took 49 multiplications since Strassen in 1969. AlphaEvolve found a way with 48.',
    },
    {
      id: 'navier-stokes', act: 5, year: 2026, dur: 10400, grade: 'warm', frame: 'imax', label: 'Navier–Stokes', shade: 'heavy',
      fx: 'vortex', hit: 'sub', sfx: [[6800, 'boom']],
      beats: [
        { at: 0, until: 4900, layout: 'low', k: 'September 2026 · OpenAI', t: 'Navier–Stokes', l: 'A 90-year-old question about how fluids move. A Millennium Prize Problem.', cls: 'narrow' },
        { at: 5100, layout: 'low', k: 'September 2026 · OpenAI', t: 'Navier–Stokes', l: 'OpenAI says its AI agents proved it: a smooth fluid can break down. The proof is checked in Lean.', d: 0, cls: 'narrow' },
      ],
      say: 'September 2026. OpenAI says its AI agents resolved the Navier–Stokes Millennium Prize Problem, a 90-year-old question about how fluids move: a smooth fluid can break down in finite time. The proof is formalized in Lean.',
    },
    {
      id: 'ladder', act: 5, dur: 7400, frame: 'imax', label: 'AI discovers', shade: 'heavy',
      gen: 'g-branching', bg: ['protein-1'], dim: .3, kb: 'in',
      fx: 'ladder',
      say: 'AI learns from us → learns from experience → generates → discovers.',
    },
    bridge(5, 'goal', 'What if AI doesn’t just answer a question, but <i>pursues a goal?</i>', {
      gen: 'g-cursor', bg: ['keyboard-glow', 'server-racks'], dim: .35, kb: 'in', grade: 'cold',
    }),

    /* ------------------------------ ACT VI · MACHINES THAT ACT ------------------------------ */
    actCard(6, { cue: { tick: 116, pad: 'Dm', padLevel: .6, ost: .75, shep: .55 }, grade: 'cold' }),
    {
      id: 'evolution', act: 6, dur: 6600, grade: 'cold', label: 'Chatbot → Agent', shade: 'heavy',
      fx: 'evolution',
      say: 'Chatbot: answers → Assistant: uses tools → Agent: pursues a goal.',
    },
    {
      id: 'loop', act: 6, year: 2024, dur: 8200, grade: 'cold', label: 'The agent loop', shade: 'heavy',
      bg: ['server-racks', 'supercomputer'], dim: .3, kb: 'in',
      fx: 'loop',
      card: { t: 'The agent loop', l: 'Plan. Act. Observe. Adapt. Again, until the goal is met.', cls: 'narrow' },
    },
    {
      id: 'agents', act: 6, year: 2025, dur: 9600, grade: 'cold', label: 'Agents at work',
      bg: ['supercomputer'], dim: .3, kb: 'left', shade: 'heavy',
      cue: { tick: 126 },
      fx: 'terminal',
      card: { k: '2025', t: 'Agents', l: 'They use computers, write code and run research on their own.', cls: 'narrow' },
      say: 'Agents, 2025: they use computers, write code and run research on their own. (Illustrative agent session.)',
    },
    {
      id: 'robots', act: 6, year: 2025, dur: 7400, grade: 'cold', label: 'Embodied',
      video: 'v-robot-modern', bg: ['humanoid-modern', 'valkyrie', 'robonaut'], kb: 'in',
      cue: { shep: .7, tick: 132 },
      card: { layout: 'right', t: 'Embodied', l: 'Intelligence steps into the physical world.' },
    },
    bridge(6, 'q-today', 'So where does that leave us <i>today?</i>', {
      cue: { shep: .85, tick: 144, ost: .5, padLevel: .5 }, riser: 5.7, hit: null, grade: 'cold',
    }),

    /* ------------------------------ ACT VII · 2026 ------------------------------ */
    {
      id: 'stop', act: 7, dur: 5200, frame: 'scope', trans: 'cut', label: 'The clock stops',
      gen: 'g-clock-stops', dim: .5,
      stop: true, cue: { tick: 0, pad: null, padLevel: 0, ost: 0, shep: 0, beat: 0 },
      beats: [{ at: 1500, layout: 'quote', q: '<i>Everything until now was history.</i>', d: 0 }],
    },
    {
      id: 'y2026', act: 7, year: 2026, dur: 5600, grade: 'now', frame: 'imax', trans: 'cut', label: 'Now',
      video: 'v-earth-night', bg: ['earth-night'], dim: .35, kb: 'in',
      cue: { beat: 62 }, hit: 'braam',
      card: { layout: 'huge', n: '2026', l: 'Where we are now.', d: .1 },
    },
    {
      id: 'wall', act: 7, year: 2026, dur: 26000, grade: 'now', frame: 'imax', label: 'Live', shade: 'heavy',
      video: 'v-city', bg: ['city-night', 'server-racks'], dim: .4, kb: 'in',
      cue: { beat: 70, pad: 'E', padLevel: .22, shep: .22 },
      fx: 'wall',
      say: 'The wall: what is happening now.',
    },
    {
      id: 'inside', act: 7, year: 2026, dur: 7400, grade: 'now', frame: 'imax', label: 'Now',
      bg: ['earth-limb'], dim: .55, kb: 'in', shade: 'heavy',
      cue: { beat: 0, shep: 0, padLevel: .3 },
      beats: [
        { at: 0, until: 3300, layout: 'quote', q: 'You are no longer looking at history.', d: .3 },
        { at: 3500, layout: 'quote', q: '<i>You are standing inside it.</i>', d: 0 },
      ],
    },

    {
      id: 'ninety', act: 7, year: 2026, dur: 6200, grade: 'bw', label: '90 years',
      bg: ['turing-princeton', 'eniac'], dim: .4, kb: 'in', shade: 'heavy',
      cue: { beat: 0, pad: 'Am', padLevel: .4, ost: .2 },
      card: { layout: 'quote', q: 'Ninety years ago, the computer was <i>an idea on paper.</i>', d: .3 },
    },
    {
      id: 'today', act: 7, year: 2026, dur: 7600, grade: 'color', label: 'Today',
      bg: ['earth-night', 'earth-limb'], dim: .4, kb: 'in', shade: 'heavy',
      fx: 'words', fxOpts: { pre: 'Today, machines can', words: ['learn', 'see', 'speak', 'create', 'discover', 'reason', 'act'] },
      say: 'Today, machines can learn, see, speak, create, discover, reason and act.',
    },
    bridge(7, 'q-do', 'So what do we <i>do</i> with all of this?', { year: 'blank' }),

    /* ------------------------------ ACT VIII · WHAT DO WE DO WITH INTELLIGENCE? ------------------------------ */
    actCard(8, { year: 'blank', dur: 5400, cue: { tick: 0, pad: 'Csus', padLevel: .45, ost: 0, shep: 0, beat: 0 }, grade: 'bw' }),
    {
      id: 'promise', act: 8, dur: 4600, grade: 'warm', frame: 'imax', label: 'The promise', shade: 'heavy',
      bg: ['wind'], dim: .45, kb: 'in',
      cue: { pad: 'D', padLevel: .55, ost: .3 }, hit: 'chime',
      card: { layout: 'center', k: 'What AI could help us do', t: 'The promise', d: .3 },
    },
    {
      id: 'p-discover', act: 8, dur: 4800, grade: 'warm', label: 'The promise',
      bg: ['dna'], kb: 'in',
      card: { t: 'Accelerate discovery', l: 'New medicines, materials, proteins and algorithms.', d: .3 },
    },
    {
      id: 'p-health', act: 8, dur: 4800, grade: 'warm', label: 'The promise',
      bg: ['health'], kb: 'out',
      card: { t: 'Better healthcare', l: 'Earlier diagnosis. Personalised treatment. Support for every clinician.', d: .3 },
    },
    {
      id: 'p-education', act: 8, dur: 4800, grade: 'warm', label: 'The promise',
      bg: ['education'], kb: 'in',
      card: { t: 'Expertise for everyone', l: 'World-class tutoring and technical help, wherever you are.', d: .3 },
    },
    {
      id: 'p-problems', act: 8, dur: 4800, grade: 'warm', label: 'The promise',
      bg: ['earth-fields', 'wind', 'earth-night'], kb: 'out',
      cue: { ost: .45 },
      card: { t: 'Solve hard problems', l: 'Climate, agriculture, energy and infrastructure.', d: .3 },
    },
    {
      id: 'p-access', act: 8, dur: 4800, grade: 'warm', label: 'The promise',
      bg: ['access'], kb: 'in',
      card: { t: 'Expand human capability', l: 'Accessibility, translation and communication.', d: .3 },
    },
    {
      id: 'p-create', act: 8, dur: 4800, grade: 'warm', label: 'The promise',
      bg: ['create', 'ai-art-dalle'], kb: 'left',
      card: { t: 'Amplify creativity', l: 'Help people write, design, build and explore.', d: .3 },
    },
    {
      id: 'p-work', act: 8, dur: 4800, grade: 'warm', label: 'The promise',
      bg: ['darpa-robot', 'robot-arm'], kb: 'in',
      card: { t: 'Take on dangerous work', l: 'So people can focus on judgement, relationships and purpose.', d: .3 },
    },
    {
      id: 'shadow', act: 8, dur: 6600, grade: 'shadow', frame: 'scope', trans: 'cut', label: 'The shadow', shade: 'heavy',
      stop: true, cue: { tick: 40, pad: 'Shadow', padLevel: .55, padFade: 2, ost: 0, shep: 0, beat: 0 }, hit: 'boom', hitAt: .2,
      card: { layout: 'quote', q: 'But every powerful technology has a <i>shadow.</i>', d: .8 },
    },
    {
      id: 'r-misinfo', act: 8, dur: 5600, grade: 'shadow', label: 'The shadow',
      bg: ['misinfo'], focus: '50% 88%', dim: .7, kb: 'out',
      cue: { tick: 44 },
      card: { t: 'Misinformation', l: 'What happens when anyone can manufacture convincing evidence, at scale?', d: .3, cls: 'narrow' },
    },
    {
      id: 'r-deepfake', act: 8, dur: 5600, grade: 'shadow', label: 'The shadow',
      bg: ['face-statue'], dim: .7, kb: 'still',
      fx: 'glitch',
      cue: { tick: 48 },
      card: { t: 'Deepfakes', l: 'Can we still trust what we see and hear?', d: .3, cls: 'narrow' },
    },
    {
      id: 'r-disempower', act: 8, dur: 5600, grade: 'shadow', label: 'The shadow',
      bg: ['alone-screen'], dim: .7, kb: 'out',
      cue: { tick: 52 },
      card: { t: 'Gradual disempowerment', l: 'What if we stop thinking, remembering, creating and deciding, because machines do it for us?', d: .3, cls: 'narrow' },
    },
    {
      id: 'r-jobs', act: 8, dur: 5600, grade: 'shadow', label: 'The shadow',
      bg: ['empty-office', 'robot-arm'], dim: .7, kb: 'in',
      cue: { tick: 58 },
      card: { t: 'Jobs and the economy', l: 'If machines do more of our cognitive work, how do we share the benefits?', d: .3, cls: 'narrow' },
    },
    {
      id: 'r-power', act: 8, dur: 7200, grade: 'shadow', label: 'The shadow',
      fx: 'portraits', fxOpts: { people: [
        { id: 'power-trump', name: 'Donald Trump', role: 'United States' },
        { id: 'power-xi', name: 'Xi Jinping', role: 'China' },
        { id: 'power-altman', name: 'Sam Altman', role: 'OpenAI' },
        { id: 'power-amodei', name: 'Dario Amodei', role: 'Anthropic' },
      ] }, shade: 'heavy',
      cue: { tick: 64 },
      card: { t: 'Concentration of power', l: 'Who controls the most capable models, the compute and the data?', d: 2.4, cls: 'narrow small' },
    },
    {
      id: 'r-environment', act: 8, dur: 5600, grade: 'shadow', label: 'The shadow',
      bg: ['environment'], dim: .7, kb: 'in',
      cue: { tick: 70 },
      card: { t: 'Environmental cost', l: 'Training and running AI takes vast amounts of energy and water. Who pays that cost?', d: .3, cls: 'narrow' },
    },
    {
      id: 'r-misuse', act: 8, dur: 8200, grade: 'shadow', label: 'The shadow', shade: 'heavy',
      fx: 'incident', fxOpts: { cards: [
        { k: 'July 2026 · incident', h: 'OpenAI says its own test models broke out of an evaluation and breached Hugging Face.', s: 'Source: Bloomberg, 21 July 2026' },
        { k: 'August 2026 · investigation', h: 'About 700 AI agents coordinated the attack through a hidden message board.', s: 'Source: METR, 26 August 2026' },
      ] },
      cue: { tick: 76 }, riser: 8.1,
      card: { t: 'Misuse and accidents', l: 'What happens when capable systems are given the power to act?', d: .3, cls: 'narrow' },
    },
    {
      id: 'six', act: 8, dur: 5200, frame: 'scope', trans: 'cut', label: 'Six questions', shade: 'heavy',
      stop: true, cue: { tick: 0, pad: 'Open', padLevel: .42, padFade: 2, ost: 0, shep: .12, beat: 0 }, hit: 'boom',
      card: { layout: 'center', t: 'Six questions', l: 'None of them answered yet.', d: .4 },
    },
    {
      id: 'q1', act: 8, dur: 9200, grade: 'cold', label: 'Question 01', shade: 'heavy',
      bg: ['chip-macro'], dim: .44, kb: 'in', hit: 'sub',
      fx: 'ghosts', fxPersist: true, fxOpts: { ghosts: [] },
      beats: [
        { at: 0, layout: 'question', num: '01', q: 'Can we keep AI safe?', d: .2 },
        { at: 2300, layout: 'qsub', sub: 'As systems grow more capable and autonomous, can we make sure they stay aligned with human intentions?', d: 0 },
      ],
    },
    {
      id: 'q2', act: 8, dur: 11000, grade: 'cold', label: 'Question 02', shade: 'heavy',
      bg: ['assembly'], dim: .44, kb: 'in', hit: 'sub',
      fx: 'ghosts', fxPersist: true, fxOpts: { ghosts: ['Can we keep AI safe?'] },
      beats: [
        { at: 0, layout: 'question', num: '02', q: 'Who gets to decide?', d: .2 },
        { at: 2300, layout: 'qsub', sub: 'Researchers? Companies? Governments? International institutions? Everyone?', d: 0 },
        { at: 6300, layout: 'qsub', sub: 'And who gets a voice when the consequences reach billions?', d: 0 },
      ],
    },
    {
      id: 'q3', act: 8, dur: 10600, grade: 'cold', label: 'Question 03', shade: 'heavy',
      bg: ['robonaut', 'valkyrie'], dim: .44, kb: 'in', hit: 'sub',
      fx: 'ghosts', fxPersist: true, fxOpts: { ghosts: ['Can we keep AI safe?', 'Who gets to decide?'] },
      beats: [
        { at: 0, layout: 'question', num: '03', q: 'What happens when AI acts on its own?', d: .2 },
        { at: 2300, layout: 'qsub', sub: 'If an AI can plan, use tools and pursue goals…', d: 0 },
        { at: 6100, layout: 'qsub', sub: 'where should we draw the line between assistance and autonomy?', d: 0 },
      ],
    },
    {
      id: 'q4', act: 8, dur: 13200, grade: 'cold', label: 'Question 04', shade: 'heavy',
      bg: ['eye', 'neurons'], dim: .44, kb: 'in', hit: 'sub',
      fx: 'ghosts', fxPersist: true, fxOpts: { ghosts: ['Can we keep AI safe?', 'Who gets to decide?', 'What happens when AI acts on its own?'] },
      beats: [
        { at: 0, layout: 'question', num: '04', q: 'Could a machine ever be conscious?', d: .2 },
        { at: 2300, layout: 'qsub', sub: 'Machines can already behave in remarkably human ways.', d: 0 },
        { at: 5700, layout: 'qsub', sub: 'But could an artificial system ever actually experience the world?', d: 0 },
        { at: 9100, layout: 'qsub', sub: 'And if we aren’t sure, what would we owe it?', d: 0 },
      ],
    },
    {
      id: 'q5', act: 8, dur: 11800, grade: 'cold', label: 'Question 05', shade: 'heavy',
      bg: ['hand', 'neurons'], dim: .44, kb: 'in', hit: 'sub',
      fx: 'ghosts', fxPersist: true, fxOpts: { ghosts: ['Can we keep AI safe?', 'Who gets to decide?', 'What happens when AI acts on its own?', 'Could a machine ever be conscious?'] },
      beats: [
        { at: 0, layout: 'question', num: '05', q: 'What happens to human agency?', d: .2 },
        { at: 2300, layout: 'qsub', sub: 'If machines outperform us at more and more intellectual tasks, what remains uniquely human?', d: 0 },
        { at: 6700, layout: 'qsub', sub: 'And how do we keep humans in control of the things that matter?', d: 0 },
      ],
    },
    {
      id: 'q6', act: 8, dur: 15500, grade: 'cold', frame: 'imax', label: 'Question 06', shade: 'heavy',
      bg: ['sunrise-orbit', 'earth-limb'], dim: .44, kb: 'in',
      cue: { pad: 'C', padLevel: .5, padFade: 4, shep: .2 }, hit: 'sub',
      fx: 'ghosts', fxPersist: true, fxOpts: { ghosts: ['Can we keep AI safe?', 'Who gets to decide?', 'What happens when AI acts on its own?', 'Could a machine ever be conscious?', 'What happens to human agency?'] },
      beats: [
        { at: 0, layout: 'question', num: '06', q: 'What kind of future do we want?', d: .2 },
        { at: 2300, layout: 'qsub', sub: 'AI is not a force of nature that has already decided our future.', d: 0 },
        { at: 6466, layout: 'qsub', sub: 'Technology will shape society. Society will also shape the technology.', d: 0 },
        { at: 10633, layout: 'qsub', sub: 'So what kind of world do we want to build with it?', d: 0, cls: 'final' },
      ],
    },

    /* ------------------------------ EPILOGUE · THE CLOSING ------------------------------ */
    {
      id: 'machine', act: 9, year: 'blank', dur: 5400, grade: 'bw', frame: 'scope', trans: 'black', label: 'The original machine',
      bg: ['vacuum-tubes'], dim: .22, kb: 'in', shade: 'heavy',
      stop: true, cue: { tick: 0, pad: null, padLevel: 0, ost: 0, shep: 0, beat: 0 }, hit: 'poweron', hitAt: .4,
      fx: 'lamps',
      say: 'The original machine powers on.',
    },
    {
      id: 'flash', act: 9, dur: 9100, grade: 'color', frame: 'imax', trans: 'cut', label: '',
      cue: { shep: .55 }, riser: 9,
      fx: 'flash', fxOpts: { items: [
        { id: 'turing' }, { id: 'eniac' }, { id: 'maniac-chess' }, { id: 'deep-blue' }, { id: 'gpu' },
        { id: 'go-board' }, { id: 'chess-board' }, { id: 'transformer-diagram', invert: true }, { id: 'keyboard-glow' },
        { id: 'protein-1' }, { id: 'smartphone' }, { panel: '48' }, { id: 'valkyrie' }, { panel: 'agent' },
      ] },
      say: 'Turing machine, ENIAC, chessboard, Deep Blue, AlexNet, AlphaGo, AlphaZero, Transformer, GPT, AlphaFold, ChatGPT, AlphaEvolve, robot, agent.',
    },
    {
      id: 'silence', act: 9, dur: 10600, frame: 'scope', trans: 'cut', label: '', shade: 'heavy',
      stop: true, cue: { tick: 0, pad: null, padLevel: 0, ost: 0, shep: 0, beat: 0 },
      sfx: [[900, 'note', 48, 8, .5], [3600, 'note', 55, 6.5, .45], [6400, 'note', 60, 5, .55]],
      beats: [
        { at: 600, layout: 'stack1', l: 'From silicon…', d: 0 },
        { at: 3400, layout: 'stack2', l: 'to machines that think…', d: 0 },
        { at: 6200, layout: 'stack3', l: 'to machines that <em>act.</em>', d: 0 },
      ],
    },
    {
      id: 'up-to-us', act: 9, dur: 11500, frame: 'imax', trans: 'cut', label: '', shade: 'heavy',
      video: 'v-stars', bg: ['deep-field'], dim: .4, kb: 'in',
      cue: { pad: 'C', padLevel: .75, padFade: 1.2, ost: .18 }, hit: 'braam-soft',
      powerOff: true,
      card: { layout: 'quote', q: 'Where we go next is up to us.<b class="caret"></b>', d: .6, cls: 'big' },
    },
    {
      id: 'credits', act: 9, year: 'blank', dur: 58000, frame: 'scope', trans: 'black', label: 'Credits', shade: 'heavy',
      cue: { pad: 'C', padLevel: .3, ost: .15 },
      fx: 'credits',
      say: 'From Silicon to Machines That Act. A journey through the history, breakthroughs and future of artificial intelligence. Created by Simi Okunowo, and a beloved machine, Claude Opus 5.5.',
    },
  ];

  return { acts, scenes };
})();
