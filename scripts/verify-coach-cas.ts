import { checkWorkingOnServer } from "../lib/coach/server-cas";
async function main() {
  const result = await checkWorkingOnServer([
    { number: 1, latex: "-(2x-5)", description: "", uncertain: false },
    { number: 2, latex: "-2x-5", description: "", uncertain: false },
  ]);
  console.log(JSON.stringify(result));
  if (result[0]?.result.status !== "not-equivalent") process.exitCode = 1;
}
main();
