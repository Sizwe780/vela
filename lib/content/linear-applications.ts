import { exploration as make, type Exploration, type ExplorationStage } from "./exploration";

function withPlots(
  model: Exploration,
  plots: readonly NonNullable<ExplorationStage["plot"]>[],
): Exploration {
  return { ...model, stages: model.stages.map((stage, i) => ({ ...stage, plot: plots[i] })) };
}

export const linearApplications = {
  verify: make(
    "Test both original equations",
    "Check candidates against x + y = 5 and 2x − y = 1. Compare the computed value with the target in every row.",
    ["Equation", "Left side", "Target"],
    [
      [
        "Try (3, 2)",
        "x + y|5|5\n2x − y|4|1",
        "One matching reading cannot verify a simultaneous solution.",
        1,
      ],
      [
        "Try (2, 3)",
        "x + y|5|5\n2x − y|1|1",
        "Both rows agree. For a model, still check any additional conditions on the inputs.",
      ],
    ],
  ),
  homogeneous: make(
    "Scale a cancellation direction",
    "Use x + 2y = 0. Pick y and trace how the two terms cancel.",
    ["Term", "Value"],
    [
      [
        "Zero input",
        "x|0\n2y|0\nSum|0",
        "A homogeneous linear system always admits the zero tuple.",
      ],
      ["y = 1", "x|−2\n2y|2\nSum|0", "A free variable gives nonzero solutions here.", 2],
      [
        "y = −3",
        "x|6\n2y|−6\nSum|0",
        "Scaling the tuple by −3 scales both contributions, leaving their zero sum.",
        2,
      ],
    ],
  ),
  zeroProduct: make(
    "Two nonzero actions can have a zero product",
    "Begin at (3, 2). P keeps the horizontal coordinate and Q keeps the vertical coordinate.",
    ["Action", "Output"],
    [
      ["Apply P alone", "Input|(3, 2)\nP(x, y) = (x, 0)|(3, 0)", "P has some nonzero outputs."],
      [
        "Apply Q alone",
        "Input|(3, 2)\nQ(x, y) = (0, y)|(0, 2)",
        "Q also has some nonzero outputs.",
      ],
      [
        "Apply P then Q",
        "P output|(3, 0)\nQ after P|(0, 0)",
        "Every output of P lies on the axis that Q sends to zero.",
        1,
      ],
    ],
  ),
  factors: make(
    "Trace elementary factors in execution order",
    "Starting with I, swap the rows, then add three times the first row to the second. Watch the product grow on the left.",
    ["Step", "First row", "Second row"],
    [
      ["Identity", "I|1, 0|0, 1", "No operation has been applied."],
      [
        "Swap",
        "E₁I|0, 1|1, 0",
        "E₁ acts first and will be nearest the input in the final product.",
      ],
      [
        "Replace",
        "E₂E₁I|0, 1|1, 3",
        "The second action multiplies on the left. To recover I, undo replacement before undoing the swap.",
      ],
    ],
  ),
  rhs: make(
    "Keep each right-hand side attached to its solution",
    "Use the coefficient rows (2, 1) and (1, 1). Subtract the second row from the first in both data columns.",
    ["Quantity", "Target A", "Target B"],
    [
      [
        "Starting readings",
        "2x + y|5|2\nx + y|3|4",
        "Both columns share the same coefficient block.",
      ],
      [
        "Subtract to find x",
        "x|2|−2\nx + y|3|4",
        "The same row move produces two different right-hand sides.",
        0,
      ],
      [
        "Recover y",
        "x|2|−2\ny|1|6",
        "The solution columns solve separate systems and keep their original labels.",
        1,
      ],
    ],
  ),
  rectangular: make(
    "Test a third reading after recovering the input",
    "The map sends (x, y) to (x, y, x + y). In each case ask whether the last reading agrees with the first two.",
    ["Reading", "Required", "Observed"],
    [
      [
        "Target (2, 3, 5)",
        "First|2|2\nSecond|3|3\nThird|5|5",
        "All readings agree with the unique input (2, 3).",
      ],
      [
        "Target (2, 3, 4)",
        "First|2|2\nSecond|3|3\nThird|5|4",
        "The candidate satisfies the first two rows, then fails the third. This output lies outside the image.",
        2,
      ],
    ],
  ),
  productTranspose: make(
    "Match a product entry with its transposed partner",
    "Use row (2, −1) from A and column (4, 1) from B. Track the two factors after transposition.",
    ["Factor", "First vector", "Second vector"],
    [
      [
        "Entry of AB",
        "Locations|Row 1 of A|Column 2 of B\nComponents|(2, −1)|(4, 1)\nDot product|8 − 1|7",
        "The entry occupies location (1, 2).",
      ],
      [
        "Entry of BᵀAᵀ",
        "Locations|Row 2 of Bᵀ|Column 1 of Aᵀ\nComponents|(4, 1)|(2, −1)\nDot product|8 − 1|7",
        "The entry has moved to (2, 1). The swapped scalar factors give the same two products.",
        0,
      ],
    ],
  ),
  inverseSymmetry: make(
    "Compare reversal and reflection",
    "Use the symmetric matrix S = [[2, 1], [1, 1]]. Compare its original and inverse entries across the diagonal.",
    ["Check", "First reading", "Second reading or result"],
    [
      [
        "Compare off-diagonal entries",
        "(1, 2)|1|−1\n(2, 1)|1|−1",
        "The inverse is symmetric as well.",
      ],
      [
        "Check by composition",
        "Row 1 · column 1|2 × 1 + 1 × (−1)|1\nRow 1 · column 2|2 × (−1) + 1 × 2|0",
        "The first row of SS⁻¹ is the first row of I. The inverse entries can differ from the corresponding original entries.",
      ],
      [
        "Generalize",
        "Transpose of the inverse|(S⁻¹)ᵀ|(Sᵀ)⁻¹\nWhen Sᵀ = S|(S⁻¹)ᵀ|S⁻¹",
        "Apply the transpose-of-product rule to the identity to relate transposition and inversion.",
      ],
    ],
  ),
  columnCofactors: make(
    "Read the cofactor sign from the original column",
    "Use rows (1, 2, 0), (0, 3, 1), (2, 0, 4). Expand down column 3.",
    ["Position", "Entry × signed minor", "Contribution"],
    [
      ["Skip the zero", "(1, 3)|0 × its cofactor|0", "The zero entry supplies no term."],
      [
        "Inspect the middle term",
        "(2, 3)|1 × (−1) × (−4)|4",
        "Deleting row 2 and column 3 leaves rows (1, 2) and (2, 0). The original location has negative sign.",
      ],
      [
        "Add the last term",
        "(2, 3)|Already computed|4\n(3, 3)|4 × (+1) × 3|12\nTotal|4 + 12|16",
        "A column expansion reaches the same scalar as the row expansion.",
        2,
      ],
    ],
  ),
  triangular: make(
    "Track the determinant while making a triangle",
    "Use rows (2, 1) and (4, 5). Compare two elimination paths and undo their determinant scale factors.",
    ["Path", "Resulting rows", "Value and scale"],
    [
      [
        "Replace R₂ by R₂ − 2R₁",
        "Pure replacement|(2, 1), (0, 3)|Diagonal product 6",
        "Replacement preserves the determinant, so the original determinant is 6.",
      ],
      [
        "Scale R₂ by ½, then subtract R₁",
        "Scale + replacement|(2, 1), (0, 1.5)|Diagonal product 3",
        "The scale step halved the determinant. Divide 3 by ½ to recover 6.",
      ],
      [
        "Scale R₁ by ½, then subtract 4R₁",
        "Scale + replacement|(1, 0.5), (0, 3)|Diagonal product 3",
        "Fractional entries alone say nothing about the determinant scale. Record the actual operations.",
      ],
    ],
  ),
  dependentReadings: make(
    "Test data against dependent rows",
    "Use coefficient rows (1, 2) and (2, 4). The determinant is zero in both cases. Compare the right-hand sides.",
    ["Check", "First row", "Second row"],
    [
      [
        "Readings (4, 8)",
        "Coefficient relation|(1, 2)|2 × (1, 2)\nRight side|4|8\nAfter elimination|x + 2y = 4|0 = 0",
        "The readings follow the same dependency, so one free variable remains.",
        2,
      ],
      [
        "Readings (4, 9)",
        "Coefficient relation|(1, 2)|2 × (1, 2)\nRight side|4|9\nAfter elimination|x + 2y = 4|0 = 1",
        "The same singular coefficient matrix can produce an inconsistent system when the observed data do not follow the dependency.",
        2,
      ],
    ],
  ),
  adjugate: make(
    "Test the adjugate identity at and away from zero",
    "Use A with rows (2, 1) and (4, k). Change k and compare the product A·adj(A) with det(A)I.",
    ["Quantity", "Value"],
    [
      [
        "k = 3",
        "Adjugate rows|(3, −1), (−4, 2)\nDeterminant|2\nProduct|2I",
        "Dividing the adjugate by 2 gives an inverse.",
        2,
      ],
      [
        "k = 2",
        "Adjugate rows|(2, −1), (−4, 2)\nDeterminant|0\nProduct|Zero matrix",
        "The identity still holds at the singular value. The adjugate cannot be divided by a zero determinant.",
        1,
      ],
    ],
  ),
  spatial: make(
    "Recover coordinates and track volume separately",
    "Use the three-dimensional diagonal map (x, y, z) → (2x, −y, 3z). Keep coordinate readings separate from geometric volume.",
    ["Axis", "Scale", "Reading or input"],
    [
      [
        "Read the output",
        "x|2|6\ny|−1|4\nz|3|3",
        "Each coordinate reading can be recovered independently.",
      ],
      [
        "Recover the input",
        "x|Divide by 2|3\ny|Divide by −1|−4\nz|Divide by 3|1",
        "The inverse uses the reciprocal scales.",
        1,
      ],
      [
        "Track volume",
        "Signed scale|2 × (−1) × 3|−6\nVolume factor|Absolute value|6",
        "The negative sign records orientation. Geometric volume is multiplied by 6.",
        0,
      ],
    ],
  ),
  higher: make(
    "Compare four coordinates without flattening them",
    "Step through p = (1, −2, 0, 4) and q = (3, 1, −1, 2). Compare component differences and their squared contributions.",
    ["Coordinate", "First value", "Second value"],
    [
      [
        "Align the inputs",
        "1|1|3\n2|−2|1\n3|0|−1\n4|4|2",
        "Pair entries by index, as you would in two dimensions.",
      ],
      [
        "Subtract and square",
        "1|2|4\n2|3|9\n3|−1|1\n4|−2|4",
        "The columns now show differences q − p and their squares. Adding the squares gives 18, so the distance is √18.",
        2,
      ],
    ],
  ),
  route: withPlots(
    make(
      "Compare a route, a displacement and its direction",
      "Travel from A = (0, 0) through B = (3, 0) to C = (3, 4). Compare lengths on one scale.",
      ["Object", "Value"],
      [
        [
          "Follow the route",
          "First leg|3\nSecond leg|4\nDistance travelled|7",
          "Sum the individual leg lengths.",
          2,
        ],
        [
          "Use the direct segment",
          "Displacement|(3, 4)\nLength|5",
          "The endpoint separation is the hypotenuse of the right triangle.",
          1,
        ],
        [
          "Keep only direction",
          "Unit direction|(0.6, 0.8)\nLength|1",
          "Divide both displacement components by 5 to preserve orientation and set length to one.",
        ],
      ],
    ),
    [
      {
        points: [
          ["A", 0, 0],
          ["B", 3, 0],
          ["C", 3, 4],
        ],
        segments: [
          [0, 1],
          [1, 2],
        ],
      },
      {
        points: [
          ["A", 0, 0],
          ["C", 3, 4],
        ],
        segments: [[0, 1]],
      },
      {
        points: [
          ["A", 0, 0],
          ["Unit", 0.6, 0.8],
        ],
        segments: [[0, 1]],
      },
    ],
  ),
  cross: withPlots(
    make(
      "Swap the inputs to a cross product",
      "Use arrows (2, 0, 0) and (1, 3, 0) in the xy plane. Compare the parallelogram with its perpendicular vector.",
      ["Quantity", "Value"],
      [
        [
          "Use u then v",
          "Cross product|(0, 0, 6)\nParallelogram area|6",
          "The normal points in the positive z direction.",
        ],
        [
          "Use v then u",
          "Cross product|(0, 0, −6)\nParallelogram area|6",
          "The same flat shape gives the same area. Swapping inputs reverses the normal.",
          0,
        ],
      ],
    ),
    [
      {
        points: [
          ["O", 0, 0],
          ["u", 2, 0],
          ["u + v", 3, 3],
          ["v", 1, 3],
        ],
        segments: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ],
      },
      {
        points: [
          ["O", 0, 0],
          ["v", 1, 3],
          ["v + u", 3, 3],
          ["u", 2, 0],
        ],
        segments: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ],
      },
    ],
  ),
  line: withPlots(
    make(
      "Move along a line by changing its parameter",
      "Start at p = (1, 1) and use d = (2, 1). Inspect p + td on both sides of p.",
      ["Quantity", "Value"],
      [
        ["t = −1", "Displacement|(−2, −1)\nLocation|(−1, 0)", "Negative t moves opposite to d."],
        [
          "t = 0",
          "Displacement|(0, 0)\nLocation|(1, 1)",
          "The parameter zero selects the base point p.",
        ],
        [
          "t = 1",
          "Displacement|(2, 1)\nLocation|(3, 2)",
          "The same direction vector supplies the step in both coordinates.",
        ],
      ],
    ),
    [
      {
        points: [
          ["p", 1, 1],
          ["p − d", -1, 0],
        ],
        segments: [[0, 1]],
      },
      { points: [["p", 1, 1]], segments: [] },
      {
        points: [
          ["p", 1, 1],
          ["p + d", 3, 2],
        ],
        segments: [[0, 1]],
      },
    ],
  ),
  plane: make(
    "Use a normal to test plane membership",
    "Take plane x + 2z = 4, base point p = (0, 0, 2), and normal n = (1, 0, 2). Compare n · (q − p) for two points.",
    ["Quantity", "Value"],
    [
      [
        "q = (2, 3, 1)",
        "Displacement|(2, 3, −1)\nDot product|2 − 2 = 0\nMembership|On plane",
        "The displacement is perpendicular to n. The y coordinate is unrestricted by this plane equation.",
        1,
      ],
      [
        "q = (2, 3, 2)",
        "Displacement|(2, 3, 0)\nDot product|2\nMembership|Off plane",
        "Changing z alone moves the point off the plane.",
      ],
    ],
  ),
  distance: make(
    "Compare the normal foot with another point on the plane",
    "From q = (3, 0, 3), compare a perpendicular and an oblique approach to x + 2z = 4.",
    ["Quantity", "Value"],
    [
      [
        "Use the normal foot",
        "Plane point|(2, 0, 1)\nDisplacement|(1, 0, 2)\nLength|√5",
        "The displacement is parallel to n = (1, 0, 2).",
      ],
      [
        "Move 2 along the plane",
        "Plane point|(2, 2, 1)\nDisplacement|(1, −2, 2)\nLength|3",
        "The extra motion lies in the plane and is perpendicular to the normal. Pythagoras gives √(5 + 4) = 3.",
        2,
      ],
    ],
  ),
  powers: withPlots(
    make(
      "Follow the turn and stretch of a complex power",
      "Use z = 1 + i. Each multiplication by z turns the arrow by 45° and multiplies its length by √2.",
      ["Quantity", "Value"],
      [
        [
          "First power",
          "Coordinates|(1, 1)\nAngle|45°\nModulus|√2",
          "The angle starts in the first quadrant.",
        ],
        [
          "Square",
          "Coordinates|(0, 2)\nAngle|90°\nModulus|2",
          "Sines and cosines of the doubled angle recover the new coordinates.",
        ],
        [
          "Cube",
          "Coordinates|(−2, 2)\nAngle|135°\nModulus|2√2",
          "The real part is negative. Expanding (cos θ + i sin θ)³ and comparing the real parts gives the triple-angle identity for cosine.",
        ],
      ],
    ),
    [
      {
        points: [
          ["O", 0, 0],
          ["z", 1, 1],
        ],
        segments: [[0, 1]],
      },
      {
        points: [
          ["O", 0, 0],
          ["z squared", 0, 2],
        ],
        segments: [[0, 1]],
      },
      {
        points: [
          ["O", 0, 0],
          ["z cubed", -2, 2],
        ],
        segments: [[0, 1]],
      },
    ],
  ),
};
