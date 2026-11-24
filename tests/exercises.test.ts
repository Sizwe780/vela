import {test} from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {parseLearningBlocks} from "../lib/content/exercises";
import {ExerciseMarkdown} from "../components/exercise-markdown";
test("worked solution is absent from initial rendered DOM",()=>{
 const text="Teaching remains visible.\n:::exercise Estimate the result\nTry the expression yourself.\n:::answer\nUNIQUE_SECRET_SOLUTION $x=98431$\n:::end";
 assert.equal(parseLearningBlocks(text).errors.length,0);const html=renderToStaticMarkup(createElement(ExerciseMarkdown,{text}));assert.ok(html.includes("Show answer"));assert.ok(html.includes("Try the expression"));assert.ok(!html.includes("UNIQUE_SECRET_SOLUTION"));assert.ok(!html.includes("98431"));
});
test("malformed and partial solutions fail closed; code fences are not controls",()=>{
 for(const text of [":::exercise Missing end\nQuestion\n:::answer\nUNIQUE_SECRET", ":::exercise\nQuestion\n:::answer\nUNIQUE_SECRET\n:::end"]){assert.ok(parseLearningBlocks(text).errors.length);assert.ok(!renderToStaticMarkup(createElement(ExerciseMarkdown,{text})).includes("UNIQUE_SECRET"));}
 assert.equal(parseLearningBlocks("````text\n```\n:::answer\n````").errors.length,0);
});
