import test from "node:test";
import assert from "node:assert/strict";
import { convertQuantity, checkQuantity, quantitySI } from "../lib/math-practice/quantity";
import {
  evaluateScientific as calc,
  calculatorNumber,
} from "../lib/math-practice/scientific-calculator";
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-12 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
test("unit aliases convert without destroying SI prefix case", () => {
  for (const [value, unit, target, expected] of [
    [2.5, "l", "ml", 2500],
    [1, "cc", "cm³", 1],
    [1, "m³", "L", 1000],
    [1, "hr", "min", 60],
    [1, "atm", "kPa", 101.325],
    [1, "eV", "J", 1.602176634e-19],
    [1, "mPa", "MPa", 1e-9],
    [1, "ML", "ml", 1e9],
  ] as const)
    close(convertQuantity({ value: String(value), unit }, target).value, expected);
  assert.equal(
    checkQuantity({ value: "2.5", unit: "l" }, { value: "2500", unit: "ml" }).status,
    "equivalent",
  );
  assert.equal(convertQuantity({ value: "1", unit: "m/s²" }, "cm/s^2").dimension, "L T⁻²");
  assert.notEqual(
    quantitySI({ value: "1", unit: "mmHg" }).value,
    quantitySI({ value: "1", unit: "torr" }).value,
  );
});
test("temperature offsets remain separate from electrical charge", () => {
  close(convertQuantity({ value: "25", unit: "C" }, "K").value, 298.15);
  close(convertQuantity({ value: "273.15", unit: "K" }, "°C").value, 0);
  close(convertQuantity({ value: "1", unit: "C" }, "A*s").value, 1);
  assert.throws(() => convertQuantity({ value: "2", unit: "°C/s" }, "K/s"));
  assert.equal(
    checkQuantity({ value: "1", unit: "m" }, { value: "1", unit: "s" }).status,
    "not-equivalent",
  );
  for (const value of ["", "1e999", "1e-999", "NaN"])
    assert.throws(() => convertQuantity({ value, unit: "m" }, "cm"));
  assert.throws(() => convertQuantity({ value: "1", unit: "invalid" }, "m"));
  close(convertQuantity({ value: "1", unit: "J/(mol K)" }, "J/mol/K").value, 1);
});
test("scientific calculator handles angles, arithmetic precedence and numeric functions", () => {
  close(calc("sin(30)", "DEG"), 0.5);
  close(calc("sin(pi/6)", "RAD"), 0.5);
  assert.equal(calc("cos(90)", "DEG"), 0);
  assert.throws(() => calc("tan(90)", "DEG"));
  close(calc("asin(0.5)", "DEG"), 30);
  close(calc("atan(1)", "RAD"), Math.PI / 4);
  for (const [input, expected] of [
    ["-2^2", -4],
    ["2^-3", 0.125],
    ["2^3^2", 512],
    ["2(3+4)", 14],
    ["root(-27,3)", -3],
    ["sqrt(81)", 9],
    ["ln(e)", 1],
    ["log10(100)", 2],
    ["5!", 120],
    ["ncr(10,3)", 120],
    ["npr(5,2)", 20],
    ["2.5e-3", 0.0025],
    ["exp(0)", 1],
    ["1/4", 0.25],
  ] as const)
    close(calc(input), expected);
  assert.equal(calc("Ans+2", "RAD", 3), 5);
  assert.equal(calculatorNumber(4.0), "4");
  assert.ok(calc("1e-20") > 0);
});
test("calculator rejects invalid domains and executable syntax", () => {
  for (const text of [
    "1/0",
    "sqrt(-1)",
    "ln(0)",
    "asin(2)",
    "171!",
    "ncr(3,4)",
    "root(-4,2)",
    "exp(1000)",
    "globalThis.alert(1)",
    "(()=>1)()",
    "2;3",
    "sin(",
    "x+1",
    "(".repeat(40) + "1" + ")".repeat(40),
  ])
    assert.throws(() => calc(text), text);
});
