/** Marker sometimes reads the publisher's end-of-example triangle as a bogus TeX command.
 * Only repair a recognized trailing decoration; unknown commands still fail validation.
 * Verified against the source PDF on nine MAT1503 pages, 17 November 2026.
 */
export function normalizeMarkerArtifacts(markdown:string){
 return markdown.replace(/\\blast(?:arrow|right|er|e)?\b(?=\s*(?:\$\$|\\end\{aligned\}))/g,"");
}
