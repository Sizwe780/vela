import { test } from "node:test";
import assert from "node:assert/strict";
import { streamText } from "ai";
import { configuredAI } from "../lib/ai/config";
import { createChatModel } from "../lib/ai/chat-model";
import { embedTokens } from "../lib/ingest/embeddings";
import { validateGeneratedQuiz, normalizeAnswer } from "../lib/quiz/generator";
import { normalizeCloudflareStream } from "../lib/ai/cloudflare-stream";

test("Cloudflare uses its own endpoint, credentials and text embeddings, never the saved OpenAI/Ollama settings", async () => {
  Object.assign(process.env, { AI_PROVIDER: "ollama", OPENAI_BASE_URL: "http://localhost:11434/v1", OPENAI_API_KEY: "must-not-leak", CHAT_MODEL: "llama3", EMBEDDING_MODEL: "nomic-embed-text", CLOUDFLARE_ACCOUNT_ID: "a".repeat(32), CLOUDFLARE_API_TOKEN: "cloudflare-test-token" });
  const config = configuredAI("cloudflare");
  assert.equal(config.baseUrl, `https://api.cloudflare.com/client/v4/accounts/${"a".repeat(32)}/ai/v1`);
  assert.equal(config.chatModel, "@cf/mistralai/mistral-small-3.1-24b-instruct");
  assert.equal(config.embeddingSpace.dimensions, 768);
  assert.equal(config.apiKey, "cloudflare-test-token");
  const saved = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), `${config.baseUrl}/embeddings`);
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer cloudflare-test-token");
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.input, ["A tangent measures local gradient."]);
      assert.equal(body.dimensions, undefined); assert.equal(body.model, "@cf/baai/bge-base-en-v1.5");
      return Response.json({ data: [{ index: 0, embedding: [1, ...Array(767).fill(0)] }] });
    };
    const vectors = await embedTokens([[1]], { purpose: "query", texts: ["A tangent measures local gradient."], provider: "cloudflare" });
    assert.equal(vectors[0].length, 768);
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), `${config.baseUrl}/chat/completions`);
      const body = JSON.parse(String(init?.body)); assert.equal(body.model, config.chatModel);
      return new Response('data: {"id":"t","choices":[{"index":0,"delta":{"content":"Live"},"finish_reason":null}]}\n\ndata: {"id":"t","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', { headers: { "Content-Type": "text/event-stream" } });
    };
    assert.equal(await streamText({ model: createChatModel("cloudflare"), prompt: "Question", maxRetries: 0 }).text, "Live");
  } finally { globalThis.fetch = saved; }
});

test("AI quiz validation rejects fabricated source IDs, evidence, duplicate options and unsupported short answers", () => {
  const sources = [{ id: "c", learningOutcomeId: "lo", title: "Reading", body: "A tangent measures the local gradient of a curve. Velocity is a rate of change." }];
  const mc = { sourceChunkId: "c", kind: "MULTIPLE_CHOICE", prompt: "Which term describes the local gradient?", options: [{ id: "a", text: "tangent" }, { id: "b", text: "average" }, { id: "c", text: "total" }, { id: "d", text: "volume" }], answer: { optionId: "a" }, explanation: "The source links tangent to gradient.", evidence: "A tangent measures the local gradient of a curve." };
  const short = { sourceChunkId: "c", kind: "SHORT_ANSWER", prompt: "Give the source term for a rate of change.", options: null, answer: { accepted: ["Velocity"] }, explanation: "Velocity is named in the source text.", evidence: "Velocity is a rate of change." };
  assert.equal(validateGeneratedQuiz({ questions: [mc, short] }, sources).length, 2);
  for (const modified of [{ ...short, sourceChunkId: "foreign" }, { ...short, evidence: "Invented unsupported quote" }, { ...short, answer: { accepted: ["fabricated"] } }, { ...mc, options: [mc.options[0], mc.options[0], mc.options[2], mc.options[3]] }]) assert.throws(() => validateGeneratedQuiz({ questions: [mc, modified] }, sources));
  assert.notEqual(normalizeAnswer("-2"), normalizeAnswer("2"));
  assert.notEqual(normalizeAnswer("x^2"), normalizeAnswer("x2"));
});

test("Cloudflare numeric deltas survive the AI SDK and split UTF-8 SSE boundaries without losing citations", async () => {
  const original = globalThis.fetch;
  const wire = 'data: {"id":"test","choices":[{"index":0,"delta":{"content":"Rate π [C"},"finish_reason":null}]}\r\n\r\ndata: {"id":"test","choices":[{"index":0,"delta":{"content":1},"finish_reason":null}]}\n\ndata: {"id":"test","choices":[{"index":0,"delta":{"content":"]"},"finish_reason":null}]}\n\ndata: {"id":"test","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n';
  const bytes = new TextEncoder().encode(wire);
  try {
    globalThis.fetch = async () => new Response(new ReadableStream({ start(controller) { for (let offset = 0; offset < bytes.length; offset += 7) controller.enqueue(bytes.slice(offset, offset + 7)); controller.close(); } }), { headers: { "Content-Type": "text/event-stream" } });
    const result = streamText({ model: createChatModel("cloudflare"), prompt: "Source citation", maxRetries: 0 });
    const errors: unknown[] = []; let answer = "";
    for await (const part of result.fullStream) { if (part.type === "error") errors.push(part.error); if (part.type === "text-delta") answer += part.text; }
    assert.deepEqual(errors, []); assert.equal(answer, "Rate π [C1]");
    const error = Response.json({ error: "provider failure" }, { status: 429 }); assert.equal(normalizeCloudflareStream(error), error);
    const invalid = new Response('data: {"choices":[{"delta":{"content":{"invalid":"object"}}}]}\n\ndata: [DONE]\n\n', { headers: { "Content-Type": "text/event-stream" } });
    assert.ok((await normalizeCloudflareStream(invalid).text()).includes('"content":{"invalid":"object"}'));
  } finally { globalThis.fetch = original; }
});

test("Cloudflare boolean text tokens survive the SDK without masking malformed objects",async()=>{const original=globalThis.fetch;try{const frames=[{id:"bool",choices:[{index:0,delta:{content:true}}]},{id:"bool",choices:[{index:0,delta:{content:" "}}]},{id:"bool",choices:[{index:0,delta:{content:false}}]},{id:"bool",choices:[{index:0,delta:{},finish_reason:"stop"}]}];globalThis.fetch=async()=>new Response(frames.map(f=>`data: ${JSON.stringify(f)}\n\n`).join("")+"data: [DONE]\n\n",{headers:{"Content-Type":"text/event-stream"}});let text="";const errors=[];for await(const part of streamText({model:createChatModel("cloudflare"),prompt:"Classify",maxRetries:0}).fullStream){if(part.type==="text-delta")text+=part.text;if(part.type==="error")errors.push(part.error);}assert.deepEqual(errors,[]);assert.equal(text,"true false");}finally{globalThis.fetch=original;}});
