import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { terraformSign, type GateHost } from "../src/hook/terraform";
import { FIXTURES, WS } from "./fixtures";

const host: GateHost = {
  readFile: (f) => {
    try {
      return readFileSync(f, "utf8");
    } catch {
      return undefined;
    }
  },
  listDir: (d) => {
    try {
      return readdirSync(d);
    } catch {
      return undefined;
    }
  },
};

const TERRAFORM = path.join(FIXTURES, "terraform");
const TMP = mkdtempSync(path.join(tmpdir(), "tfscript-gate-"));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

/** A folder holding `names` (a name ending in / is a folder), and a tf script, script.tf, with no Terraform in it. */
function folder(...names: string[]): string {
  const dir = mkdtempSync(path.join(TMP, "f-"));
  for (const name of names) {
    if (name.endsWith("/")) mkdirSync(path.join(dir, name));
    else writeFileSync(path.join(dir, name), "");
  }
  writeFileSync(path.join(dir, "script.tf"), "/def hello = /echo hello\n");
  return dir;
}

describe("the Terraform gate", () => {
  it("knows Terraform by its top-level blocks", () => {
    for (const name of ["main.tf", "variables.tf", "outputs.tf", "locals.tf"]) {
      expect(terraformSign(path.join(TERRAFORM, name), host), name).toMatch(/^it has a Terraform block/);
    }
    expect(terraformSign(path.join(TERRAFORM, "outputs.tf"), host)).toBe('it has a Terraform block (output ")');
    const one = (text: string) => terraformSign("x.tf", { readFile: () => text, listDir: () => [] });
    for (const text of [
      'resource "a" "b" {}',
      'data "a" "b" {}',
      'module "m" {}',
      'provider "aws" {}',
      "terraform{\n}",
      "  locals {",
      "moved {\n  from = a.b\n}",
      "import {\n  to = a.b\n}",
      "removed {\n  from = a.b\n}",
      'check "health" {',
      'ephemeral "random_password" "db" {',
      "resource aws_instance web {",
      "variable region {",
      '﻿resource "a" "b" {}',
      "﻿# comment\nmoved {",
    ]) {
      expect(one(text), JSON.stringify(text)).toBeDefined();
    }
  });

  it("knows any file whose first significant line opens an HCL block", () => {
    const one = (text: string) => terraformSign("x.tf", { readFile: () => text, listDir: () => [] });
    expect(one("# managed by terraform\n// header\n/* licence\n */\n\nbackend_config local {\n}")).toBe("its first line opens an HCL block (backend_config local {)");
    expect(one('﻿dynamic "tag" {')).toBeDefined();
    expect(one("; a tf comment\n/def x = /echo {")).toBeUndefined();
    expect(one("")).toBeUndefined();
  });

  it("knows Terraform by what is beside the file", () => {
    for (const sign of [".terraform/", ".terraform.lock.hcl", "prod.tfvars", "prod.tfvars.json", "override.tf.json", "terraform.tfstate", "terraform.tfstate.backup"]) {
      expect(terraformSign(path.join(folder(sign), "script.tf"), host), sign).toBe(`${sign.replace(/\/$/, "")} is in its folder`);
    }
  });

  it("leaves tf scripts alone: the fixtures, and a script that merely mentions the words", () => {
    for (const name of readdirSync(WS)) expect(terraformSign(path.join(WS, name), host), name).toBeUndefined();
    expect(terraformSign(path.join(folder(), "script.tf"), host)).toBeUndefined();
    const one = (text: string) => terraformSign("x.tf", { readFile: () => text, listDir: () => [] });
    for (const text of [
      '/def -t"resource *" = /echo %*',
      '/echo variable "x"',
      ";output \"x\"",
      "/def locals = /echo {",
      "/set terraform=1",
      "/def data = /echo data",
      "/def -i check = /echo {",
      "/def moved = /echo {",
      "/import {",
      "/eval /echo resource aws {",
      "  /def -t'output * {' out = /echo",
    ]) {
      expect(one(text), text).toBeUndefined();
    }
  });

  it("never takes a tfrc or .tfrc for Terraform, nor a file it can't read", () => {
    const hcl: GateHost = { readFile: () => 'resource "a" "b" {}', listDir: () => [".terraform"] };
    expect(terraformSign(path.join("x", "tfrc"), hcl)).toBeUndefined();
    expect(terraformSign(path.join("x", ".tfrc"), hcl)).toBeUndefined();
    expect(terraformSign("x.tf", { readFile: () => undefined, listDir: () => undefined })).toBeUndefined();
  });

  // tf's own scripts (tinyfugue/lib/tf, a read-only sibling checkout) are the biggest real corpus.
  const LIB = path.join(__dirname, "..", "..", "..", "..", "tinyfugue", "lib", "tf");
  it.skipIf(!existsSync(LIB))("leaves every script bundled with tf alone", () => {
    const scripts = readdirSync(LIB).filter((f) => f.endsWith(".tf"));
    expect(scripts.length).toBeGreaterThan(30);
    for (const name of scripts) expect(terraformSign(path.join(LIB, name), host), name).toBeUndefined();
  });

  // The WoTMUD scripts (a read-only checkout beside ~/ai/mud), user-land scripts of one MUD.
  const WOTMUD = path.join(__dirname, "..", "..", "..", "..", "..", "wotmud", "tf");
  it.skipIf(!existsSync(WOTMUD))("leaves every WoTMUD script alone", () => {
    const scripts = readdirSync(WOTMUD).filter((f) => f.endsWith(".tf"));
    expect(scripts.length).toBeGreaterThan(5);
    for (const name of scripts) expect(terraformSign(path.join(WOTMUD, name), host), name).toBeUndefined();
  });
});
