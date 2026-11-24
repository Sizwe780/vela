type LessonFigure = {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  width: number;
  height: number;
  sourceUrl?: string;
  license?: { name: string; url: string };
  notice?: string;
  digest?: string;
  retrievedOn?: string;
  variants?: readonly { src: string; width: number }[];
};

const classroomLayout: LessonFigure = {
  src: "/lesson-figures/classroom-discussion.svg",
  alt: "Two room plans. Both have a clear aisle. Rows face the board in the first; small groups face a shared work surface in the second.",
  caption: "Compare seating for a short demonstration and for structured discussion. In both arrangements, keep paths usable and check sightlines and audibility with learners.",
  credit: "Original Vela schematic · fictional layouts · not to scale",
  width: 720,
  height: 300,
};

const precipitation: LessonFigure = {
  src: "/lesson-figures/precipitate.webp",
  alt: "Cloudy white solid suspended in a clear liquid in a laboratory vessel.",
  caption: "The white solid is silver chloride. Cloudiness signals a suspended solid here. The appearance alone does not establish its identity.",
  credit: "Luisbrudna · Wikimedia Commons · WebP conversion",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Silver_chloride_(AgCl).jpg",
  license: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  digest: "5e3488b188e472afea5b2d4ac492fb651e0bd6b9cf3ca32eeee22cb9df50c87a",
  retrievedOn: "2026-11-23",
  width: 800,
  height: 832,
  variants: [{ src: "/lesson-figures/precipitate-small.webp", width: 400 }, { src: "/lesson-figures/precipitate.webp", width: 800 }],
};

const portfolioEvidence: LessonFigure = {
  src: "/lesson-figures/portfolio-evidence.svg",
  alt: "Example lesson evidence sheet. Claim: some learners justify equal areas. Evidence: 8 of 12 cite the same unit area. Limit: no earlier comparison. Next trial: collect an individual response before and after discussion.",
  caption: "A portfolio entry can show a claim, evidence, its limit and the next test on one sheet.",
  credit: "Original Vela teaching artefact · fictional evidence",
  width: 680,
  height: 418,
};

const practicumPortfolio: LessonFigure = {
  src: "/lesson-figures/practicum-portfolio-port06.svg",
  alt: "Anonymised portfolio excerpt PORT06. Three student teachers shared the work. One taught, one assisted, and one observed the class and gave feedback. The annotation suggests pairing the observation with an anonymous learner response.",
  caption: "This excerpt documents peer observation in a physical education practicum. The annotations distinguish the teaching activity from the evidence needed to judge learning.",
  credit: "Roberto Tadeu Iaochite and Roraima Alves da Costa Filho (2016), Motriz 22(3), Results and Discussion · published PORT06 excerpt with Vela annotations",
  sourceUrl: "https://doi.org/10.1590/S1980-6574201600030009",
  license: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  digest: "392ddfcf4ba02dbbde0ef08c3c5b99638e776448143e60964bd8a7022b58c2b2",
  retrievedOn: "2026-11-23",
  width: 720,
  height: 436,
};

const zwelemfundoClassroom: LessonFigure = {
  src: "/lesson-figures/zwelemfundo-classroom.webp",
  alt: "An empty classroom at Zwelemfundo Public School with three windows along one wall, a door on the right and a display board on the left.",
  caption: "Zwelemfundo Public School, East London, South Africa, May 2022. Use the doorway, window light and display position to think through a layout before choosing where desks should go.",
  credit: "U.S. Army Corps of Engineers, Europe District · DVIDS photo 7323402 · resized and converted to WebP",
  sourceUrl: "https://www.dvidshub.net/image/7323402/us-army-helps-improve-south-african-schools-clinics",
  license: { name: "Public domain · DVIDS usage terms", url: "https://www.dvidshub.net/about/copyright" },
  notice: "The appearance of U.S. Department of War (DoW) visual information does not imply or constitute DoW endorsement.",
  digest: "272edd92608b9af588db3defac2277bc102ab347558310964845397c6a85e1f6",
  retrievedOn: "2026-11-23",
  width: 1000,
  height: 750,
  variants: [{ src: "/lesson-figures/zwelemfundo-classroom-small.webp", width: 500 }, { src: "/lesson-figures/zwelemfundo-classroom.webp", width: 1000 }],
};

const dilutionPhoto: LessonFigure = {
  src: "/lesson-figures/dilution-photo.webp",
  alt: "Two graduated cylinders. The left contains a smaller volume of darker blue solution. The right holds a larger volume of lighter blue solution.",
  caption: "Both cylinders contain the same amount of copper nitrate. Adding solvent increases the volume and reduces the concentration.",
  credit: "Mark Ott · OpenStax Chemistry 2e, archived CC BY edition · WebP conversion",
  sourceUrl: "https://github.com/openstax/osbooks-chemistry-bundle/blob/32c719622f/media/CNX_Chem_03_04_dilution.jpg",
  license: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  digest: "a6f4481ecc9a81fc63722f30948658017ad8d1a2fd0eacc665c775dd9544f48a",
  retrievedOn: "2026-11-23",
  width: 650,
  height: 385,
  variants: [{ src: "/lesson-figures/dilution-photo-small.webp", width: 325 }, { src: "/lesson-figures/dilution-photo.webp", width: 650 }],
};

const classroomPhoto: LessonFigure = {
  src: "/lesson-figures/classroom.webp",
  alt: "An empty classroom with chairs placed on closely spaced desks beside windows.",
  caption: "Use the visible room constraints to plan movement and sightlines before choosing a group setup. The chairs are on desks in this observation, so the photo cannot tell you how learners normally sit.",
  credit: "Onderwijsgek · Wikimedia Commons · resized and converted to WebP",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Empty_classroom.jpg",
  license: { name: "CC BY-SA 3.0 Netherlands", url: "https://creativecommons.org/licenses/by-sa/3.0/nl/deed.en" },
  digest: "40d71efc435399f148d87fd9939a3667552c804055baa14e7c11815b4f59e7c3",
  retrievedOn: "2026-11-23",
  width: 960,
  height: 623,
  variants: [{ src: "/lesson-figures/classroom-small.webp", width: 480 }, { src: "/lesson-figures/classroom.webp", width: 960 }],
};

const flamePhoto: LessonFigure = {
  src: "/lesson-figures/flame.webp",
  alt: "A tall yellow sodium flame above the small blue flame at the burner base.",
  caption: "Yellow light dominates this sodium flame. A spectroscope distinguishes the nearby emission lines that your eye sees together as yellow.",
  credit: "Søren Wedel Nielsen · Wikimedia Commons · resized and converted to WebP",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Flametest--Na.swn.jpg",
  license: { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" },
  digest: "e7177934ea636cca94294d35272a8fe27fafc150b1cbb1f13fa242c1cdaa692b",
  retrievedOn: "2026-11-23",
  width: 500,
  height: 833,
  variants: [{ src: "/lesson-figures/flame-small.webp", width: 250 }, { src: "/lesson-figures/flame.webp", width: 500 }],
};

const flaskPhoto: LessonFigure = {
  src: "/lesson-figures/volumetric-flask.webp",
  alt: "A glass volumetric flask with a broad base, a narrow neck and a faint line around the neck.",
  caption: "The line on the narrow neck marks a single calibrated volume. This is the final solution volume in a dilution calculation.",
  credit: "Jeffrey M. Vinocur · Wikimedia Commons · resized and converted to WebP",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Volumetric_flask.jpg",
  license: { name: "CC BY 2.5", url: "https://creativecommons.org/licenses/by/2.5/" },
  digest: "172e4e6ecd4d38d0494bf7023caa5d5dab0b213ff84f00763286927c2c5abbfd",
  retrievedOn: "2026-11-23",
  width: 250,
  height: 641,
  variants: [{ src: "/lesson-figures/volumetric-flask-small.webp", width: 125 }, { src: "/lesson-figures/volumetric-flask.webp", width: 250 }],
};

const halitePhoto: LessonFigure = {
  src: "/lesson-figures/halite.webp",
  alt: "A transparent halite specimen showing flat faces that meet at near-right angles.",
  caption: "The faces of this salt crystal are visible at specimen scale. Compare that shape with the repeating sodium and chloride ion pattern in the model below.",
  credit: "Rob Lavinsky, iRocks.com · Wikimedia Commons · WebP conversion",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Halite-251628.jpg",
  license: { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" },
  digest: "ee372c814035e2af109088161561b80450c7090404e6b544237c5dfc5b9b1972",
  retrievedOn: "2026-11-23",
  width: 381,
  height: 400,
  variants: [{ src: "/lesson-figures/halite-small.webp", width: 191 }, { src: "/lesson-figures/halite.webp", width: 381 }],
};

const vectorAddition: LessonFigure = {
  src: "/lesson-figures/vector-addition.svg",
  alt: "Vector addition drawn with the parallelogram rule.",
  caption: "Place two directed pieces tail-to-tail, complete the parallelogram, and read the diagonal as their sum.",
  credit: "Original Vela schematic",
  width: 320,
  height: 220,
};

const matrixTransformGrid: LessonFigure = {
  src: "/lesson-figures/matrix-transform-grid.svg",
  alt: "A unit square mapped by a two-by-two matrix to a parallelogram.",
  caption: "The matrix columns show where the standard basis vectors go. The output parallelogram has |det A| times the input area.",
  credit: "Original Vela schematic",
  width: 360,
  height: 200,
};

const epsilonDelta: LessonFigure = {
  src: "/lesson-figures/epsilon-delta.svg",
  alt: "Neighbourhood bands illustrating the epsilon-delta limit definition.",
  caption: "An input tolerance delta keeps nearby inputs inside the chosen output tolerance epsilon.",
  credit: "Original Vela schematic",
  width: 360,
  height: 240,
};

const riemannArea: LessonFigure = {
  src: "/lesson-figures/riemann-area.svg",
  alt: "Rectangles approximating area under a curve.",
  caption: "Refining the partition changes the finite rectangle sum towards the definite integral.",
  credit: "Original Vela schematic",
  width: 360,
  height: 220,
};

const hydrogenSpectrum: LessonFigure = {
  src: "/lesson-figures/hydrogen-spectrum.svg",
  alt: "Hydrogen emission lines at 410, 434, 486 and 656 nanometres.",
  caption: "The separated lines correspond to transitions between quantised energy levels.",
  credit: "Original Vela schematic based on standard hydrogen wavelengths",
  width: 520,
  height: 180,
};

const freeBodyDiagram: LessonFigure = {
  src: "/lesson-figures/free-body-diagram.svg",
  alt: "Free-body diagram of a block on an inclined plane.",
  caption: "Separate normal force, weight and friction into arrows at the block's centre of mass.",
  credit: "Original Vela schematic",
  width: 300,
  height: 280,
};

const analyticalBalance: LessonFigure = {
  src: "/lesson-figures/analytical-balance.webp",
  alt: "A laboratory analytical balance in a biochemical laboratory.",
  caption: "A stable calibrated reading supplies the mass used in a quantitative calculation.",
  credit: "Делфина · Wikimedia Commons · resized and converted to WebP",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Analytical_balance_in_biochemical_laboratory,_%D0%90%D0%BD%D0%B0%D0%BB%D0%B8%D1%82%D0%B8%D1%87%D0%BA%D0%B0_%D0%B2%D0%B0%D0%B3%D0%B0.jpg",
  license: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  digest: "92bd7d783fef832643d79f6d8598c5cba400a7368ac8fac251898e85fdb20d9c",
  retrievedOn: "2026-11-24",
  width: 960,
  height: 720,
  variants: [{ src: "/lesson-figures/analytical-balance-small.webp", width: 480 }, { src: "/lesson-figures/analytical-balance.webp", width: 960 }],
};

const magnesiumBurning: LessonFigure = {
  src: "/lesson-figures/magnesium-burning.webp",
  alt: "A strip of magnesium ribbon burning in a flame against a dark background.",
  caption: "The bright event is a redox reaction. Never view burning magnesium directly.",
  credit: "Capt. John Yossarian · Wikimedia Commons · resized and converted to WebP",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Magnesium_ribbon_burning.jpg",
  license: { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" },
  digest: "eb8b57e42f9d457b05c28c06913fa67e6580f12bb4eb610289371d07c8adfe01",
  retrievedOn: "2026-11-24",
  width: 960,
  height: 640,
  variants: [{ src: "/lesson-figures/magnesium-burning-small.webp", width: 480 }, { src: "/lesson-figures/magnesium-burning.webp", width: 960 }],
};

const stroboscopeBall: LessonFigure = {
  src: "/lesson-figures/stroboscope-ball.webp",
  alt: "A sequence of ball positions captured at equal time intervals.",
  caption: "Equal time samples reveal position spacing and the changing velocity of a bouncing ball.",
  credit: "MichaelMaggs · edited by Richard Bartz · Wikimedia Commons · converted to WebP",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Bouncing_ball_strobe_edit.jpg",
  license: { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" },
  digest: "5f3ae773b2d78454eac521b73eea4d952300b7b7c3fa51aa80ed449486ba142e",
  retrievedOn: "2026-11-24",
  width: 960,
  height: 618,
  variants: [{ src: "/lesson-figures/stroboscope-ball-small.webp", width: 480 }, { src: "/lesson-figures/stroboscope-ball.webp", width: 960 }],
};

const newtonCradle: LessonFigure = {
  src: "/lesson-figures/newton-cradle.webp",
  alt: "Newton's cradle with five suspended spheres.",
  caption: "An idealised collision model helps separate momentum transfer from the motion of individual spheres.",
  credit: "University of Dundee Museum Services · Wikimedia Commons · converted to WebP",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Newton%27s_cradle.jpg",
  license: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  digest: "eaaeacf53437584e55ff959051cff14d0469d1ec802ef25f8d416a5dcfa41aa0",
  retrievedOn: "2026-11-24",
  width: 352,
  height: 500,
  variants: [{ src: "/lesson-figures/newton-cradle-small.webp", width: 250 }, { src: "/lesson-figures/newton-cradle.webp", width: 352 }],
};

const observationRecord: LessonFigure = {
  src: "/lesson-figures/tps-observation-record.svg",
  alt: "A synthetic observation record separating time, observable event, interpretation and next evidence.",
  caption: "Keep the direct observation, tentative interpretation and follow-up evidence in separate columns.",
  credit: "Original Vela teaching-practice schematic · fictional",
  width: 720,
  height: 360,
};

const lessonRehearsalPlan: LessonFigure = {
  src: "/lesson-figures/tps-lesson-rehearsal.svg",
  alt: "A lesson rehearsal sequence linking intention, activity, evidence check and response.",
  caption: "Trace each rehearsal choice back to the intended learning and the evidence needed to judge it.",
  credit: "Original Vela teaching-practice schematic · fictional",
  width: 720,
  height: 360,
};

const portfolioEvidenceIndex: LessonFigure = {
  src: "/lesson-figures/tps-portfolio-evidence.svg",
  alt: "A portfolio evidence index linking an evidence card, claim, limitation and next check.",
  caption: "A strong reflection names the synthetic evidence, limits the claim and specifies the next check.",
  credit: "Original Vela teaching-practice schematic · fictional",
  width: 720,
  height: 380,
};

export const lessonFigures: readonly LessonFigure[] = [
  classroomLayout, portfolioEvidence, practicumPortfolio, classroomPhoto, zwelemfundoClassroom,
  precipitation, dilutionPhoto, flamePhoto, flaskPhoto, halitePhoto, vectorAddition,
  matrixTransformGrid, epsilonDelta, riemannArea, hydrogenSpectrum, freeBodyDiagram,
  analyticalBalance, magnesiumBurning, stroboscopeBall, newtonCradle,
  observationRecord, lessonRehearsalPlan, portfolioEvidenceIndex,
];
const figureRegistry = new Map(lessonFigures.map((figure) => [figure.src, figure]));

export function lessonFigure(src: string | undefined): LessonFigure | undefined {
  return src ? figureRegistry.get(src) : undefined;
}
