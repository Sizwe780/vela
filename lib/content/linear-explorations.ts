import { exploration as make } from "./exploration";
import { linearApplications } from "./linear-applications";

export const linearExplorations = {
  ...linearApplications,
  augmented: make(
    "Place each coefficient in its own column",
    "Read the equations 2x − z = 4 and 3y + z = 5. Switch rows and see where a missing variable goes.",
    ["Term", "Equation", "Matrix entry"],
    [
      [
        "First equation",
        "x|2x|2\ny|Missing|0\nz|−z|−1\nConstant|4|4",
        "A missing y term still occupies the y column.",
        1,
      ],
      [
        "Second equation",
        "x|Missing|0\ny|3y|3\nz|z|1\nConstant|5|5",
        "The column labels stay fixed even when the leading variable changes.",
        0,
      ],
    ],
  ),
  rowMoves: make(
    "Change the row as a whole",
    "Use the original augmented rows [1, 2 | 7] and [3, 1 | 8] each time. Check what happens to the constant column.",
    ["Row", "x", "y", "Constant"],
    [
      [
        "Swap rows",
        "R₁|3|1|8\nR₂|1|2|7",
        "Swapping the equations preserves their common solutions.",
      ],
      [
        "Double the second row",
        "R₁|1|2|7\nR₂|6|2|16",
        "Scaling by 2 changes the entire equation. Scaling by ½ undoes the move.",
        1,
      ],
      [
        "Subtract three first rows",
        "R₁|1|2|7\nR₂|0|−5|−13",
        "Adding three times the first row undoes this replacement.",
        1,
      ],
    ],
  ),
  backSubstitution: make(
    "Follow the pivot dependency",
    "Start with x + 2y = 11 and 3y = 12. Track which value becomes available at each step.",
    ["Row", "Current equation", "Information"],
    [
      [
        "Read the lower pivot",
        "First|x + 2y = 11|Depends on y\nSecond|3y = 12|Solve here first",
        "The lower row contains one unknown.",
        1,
      ],
      [
        "Carry y upward",
        "First|x + 8 = 11|Substitute y = 4\nSecond|y = 4|Known",
        "The first equation can now isolate x.",
        0,
      ],
      [
        "Record the tuple",
        "First|x = 3|Known\nSecond|y = 4|Known",
        "The reduced form makes both pivot values readable directly.",
      ],
    ],
  ),
  free: make(
    "See how a free variable moves the solution",
    "Set z = t in x + 2z = 7 and y − z = 1. Compare the resulting complete tuples.",
    ["Variable", "Dependency", "Value"],
    [
      [
        "Set t = −1",
        "x|7 − 2t|9\ny|1 + t|0\nz|t|−1",
        "All three entries describe one solution.",
        2,
      ],
      [
        "Set t = 0",
        "x|7 − 2t|7\ny|1 + t|1\nz|t|0",
        "Setting the parameter to zero selects a particular point.",
        2,
      ],
      [
        "Set t = 2",
        "x|7 − 2t|3\ny|1 + t|3\nz|t|2",
        "Both pivot values follow from the same choice of t.",
        2,
      ],
    ],
  ),
  consistency: make(
    "Check the last column before naming the solution set",
    "Keep the coefficient rows identical. Change only the last entry of the second row.",
    ["Row", "Coefficients", "Constant", "Equation"],
    [
      [
        "Allow the free variable",
        "R₁|(1, 2)|5|x + 2y = 5\nR₂|(0, 0)|0|0 = 0",
        "The second row imposes no additional constraint.",
        1,
      ],
      [
        "Create a contradiction",
        "R₁|(1, 2)|5|x + 2y = 5\nR₂|(0, 0)|3|0 = 3",
        "The contradiction rules out every tuple, even though the coefficient block is identical.",
        1,
      ],
    ],
  ),
  product: make(
    "Pair a row and a column",
    "Multiply A with rows (2, −1) and (1, 3) by B with columns (4, 1) and (2, 5). Select an output cell to see its two contributions.",
    ["Location", "Pairing", "Contribution"],
    [
      [
        "Cell (1, 1)",
        "First index|2 × 4|8\nSecond index|−1 × 1|−1\nSum|8 − 1|7",
        "Row 1 of A pairs with column 1 of B.",
        2,
      ],
      [
        "Cell (1, 2)",
        "First index|2 × 2|4\nSecond index|−1 × 5|−5\nSum|4 − 5|−1",
        "The selected column changes while the row stays fixed.",
        2,
      ],
      [
        "Cell (2, 2)",
        "First index|1 × 2|2\nSecond index|3 × 5|15\nSum|2 + 15|17",
        "Changing the row changes both pairings.",
        2,
      ],
    ],
  ),
  composition: make(
    "Track the order through two transformations",
    "Start at (1, 2). Let S(x, y) = (x + y, y) be a shear and D(x, y) = (2x, y) double the horizontal coordinate.",
    ["Stage", "Action", "Point"],
    [
      [
        "Shear, then stretch",
        "Input|Start|(1, 2)\nFirst|S|(3, 2)\nSecond|D|(6, 2)",
        "Read D·S from right to left on column vectors.",
        2,
      ],
      [
        "Stretch, then shear",
        "Input|Start|(1, 2)\nFirst|D|(2, 2)\nSecond|S|(4, 2)",
        "S·D reaches a different point from the same input.",
        2,
      ],
      [
        "Undo the first route",
        "Input|Start at D·S output|(6, 2)\nFirst|Undo D|(3, 2)\nSecond|Undo S|(1, 2)",
        "Undo the outer action first to retrace the route.",
        2,
      ],
    ],
  ),
  transpose: make(
    "Follow the indices across the diagonal",
    "Move entries from a 2 × 3 array into its transpose. Read the target coordinates as (column, row).",
    ["Entry", "Original location", "Transposed location"],
    [
      [
        "Track row 1",
        "2|(1, 1)|(1, 1)\n−3|(1, 2)|(2, 1)\n5|(1, 3)|(3, 1)",
        "The original first row becomes the first column of a 3 × 2 array.",
        2,
      ],
      [
        "Track row 2",
        "8|(2, 1)|(1, 2)\n4|(2, 2)|(2, 2)\n0|(2, 3)|(3, 2)",
        "The same index rule applies to every location. Entries with equal indices keep their locations.",
        1,
      ],
    ],
  ),
  inverseLedger: make(
    "Carry the same moves across the divider",
    "Apply row operations to [A | I] for A = [[1, 2], [1, 3]]. Watch the last two columns while the first two become the identity.",
    ["Row", "Left block", "Right block"],
    [
      [
        "Begin with [A | I]",
        "R₁|1, 2|1, 0\nR₂|1, 3|0, 1",
        "The identity block records the same row operations applied to A.",
      ],
      ["R₂ ← R₂ − R₁", "R₁|1, 2|1, 0\nR₂|0, 1|−1, 1", "Subtract the first row in both blocks.", 1],
      [
        "R₁ ← R₁ − 2R₂",
        "R₁|1, 0|3, −2\nR₂|0, 1|−1, 1",
        "The left block is now I. Multiplying A by the resulting right block gives I.",
        0,
      ],
    ],
  ),
  singularLedger: make(
    "Watch a pivot disappear",
    "Try starting the inverse procedure with proportional rows. Follow the same replacement on the attached identity.",
    ["Row", "Left block", "Right block"],
    [
      [
        "Attach the identity",
        "R₁|1, 2|1, 0\nR₂|2, 4|0, 1",
        "The second coefficient row is twice the first.",
      ],
      [
        "R₂ ← R₂ − 2R₁",
        "R₁|1, 2|1, 0\nR₂|0, 0|−2, 1",
        "Only one pivot is available in the coefficient block. The two identity targets cannot both be reached.",
        1,
      ],
    ],
  ),
  parameter: make(
    "Branch before dividing by the pivot",
    "Compare possible final rows [0, k | b]. Inspect k before dividing the relation ky = b.",
    ["Quantity", "Value", "Implication"],
    [
      [
        "k = 2, b = 6",
        "Pivot|2|Division permitted\nRight side|6|y = 3",
        "The remaining variable has a fixed value from this row.",
      ],
      [
        "k = 0, b = 0",
        "Pivot|0|No division\nRight side|0|0 = 0",
        "This row places no restriction on y.",
        1,
      ],
      ["k = 0, b = 6", "Pivot|0|No division\nRight side|6|0 = 6", "The system has no solution.", 1],
    ],
  ),
  symmetric: make(
    "Compare an entry with its reflected partner",
    "Use A = [[4, 7], [−1, 2]]. Split each mirrored pair into its average and its signed difference.",
    ["Location", "A", "Symmetric part", "Skew part"],
    [
      [
        "Off-diagonal pair",
        "(1, 2)|7|3|4\n(2, 1)|−1|3|−4",
        "The mean is shared. Half the difference changes sign across the diagonal.",
        1,
      ],
      [
        "Diagonal entries",
        "(1, 1)|4|4|0\n(2, 2)|2|2|0",
        "Subtracting a diagonal entry from itself leaves zero in the skew part.",
      ],
    ],
  ),
  cofactors: make(
    "Delete a row and column, then apply the sign",
    "Use rows (1, 2, 0), (0, 3, 1), (2, 0, 4). Select a location and track its original checkerboard sign.",
    ["Quantity", "Value"],
    [
      [
        "Position (1, 1)",
        "Retained rows|[3, 1] and [0, 4]\nMinor|12\nCheckerboard sign|+\nCofactor|12",
        "The top-left location has positive sign.",
        2,
      ],
      [
        "Position (1, 2)",
        "Retained rows|[0, 1] and [2, 4]\nMinor|−2\nCheckerboard sign|−\nCofactor|2",
        "The negative position sign reverses the already negative minor.",
        2,
      ],
      [
        "Expand along row 1",
        "First contribution|1 × 12 = 12\nSecond contribution|2 × 2 = 4\nThird contribution|0\nDeterminant|16",
        "The zero entry makes its contribution zero. Add the signed contributions.",
        2,
      ],
    ],
  ),
  rowDeterminant: make(
    "Maintain a determinant ledger",
    "Start with rows (2, 1) and (3, 4), determinant 5. Choose one row operation at a time and compare its effect.",
    ["Entry", "Reading"],
    [
      [
        "Scale the first row by 3",
        "Rows|(6, 3), (3, 4)\nDeterminant|15\nFactor|3",
        "One scaled row contributes one factor of 3.",
        2,
      ],
      [
        "Scale the whole matrix by 3",
        "Rows|(6, 3), (9, 12)\nDeterminant|45\nFactor|9",
        "Two rows were scaled, giving a factor of 3².",
        2,
      ],
      [
        "Add the first row to the second",
        "Rows|(2, 1), (5, 5)\nDeterminant|5\nFactor|1",
        "A row replacement keeps the determinant fixed.",
        2,
      ],
    ],
  ),
  cramer: make(
    "Replace just one column",
    "The coefficient columns are (2, 1) and (1, 3); the target is (7, 11). Watch which slot changes.",
    ["Slot", "Column"],
    [
      [
        "Denominator",
        "Column 1|(2, 1)\nColumn 2|(1, 3)\nDeterminant|5",
        "A nonzero denominator allows Cramer's rule.",
        2,
      ],
      [
        "Numerator for x",
        "Column 1|(7, 11)\nColumn 2|(1, 3)\nDeterminant|10",
        "Only column 1 changes, giving x = 10/5 = 2.",
        0,
      ],
      [
        "Numerator for y",
        "Column 1|(2, 1)\nColumn 2|(7, 11)\nDeterminant|15",
        "Restore the first column before replacing the second. The result gives y = 15/5 = 3.",
        1,
      ],
    ],
  ),
  complex: make(
    "Track signs when a point is reflected",
    "Begin with −3 + 4i. Compare its conjugate and the reflected point across the imaginary axis.",
    ["Quantity", "Value"],
    [
      [
        "Original",
        "Coordinates|(−3, 4)\nQuadrant|II\nModulus|5",
        "An inverse tangent of the component ratio alone can give the wrong quadrant.",
        1,
      ],
      [
        "Conjugate",
        "Coordinates|(−3, −4)\nQuadrant|III\nModulus|5",
        "Reflection in the real axis reverses the imaginary coordinate.",
        0,
      ],
      [
        "Reflect in the imaginary axis",
        "Coordinates|(3, 4)\nQuadrant|I\nModulus|5",
        "This reflection reverses the real coordinate instead.",
        0,
      ],
    ],
  ),
};
