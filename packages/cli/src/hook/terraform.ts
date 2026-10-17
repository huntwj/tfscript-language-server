import * as path from "node:path";

/**
 * .tf is Terraform's extension too. Before the Claude Code hook checks a .tf file it asks whether
 * the file is Terraform (HCL), and leaves it alone if so. Only cheap signals that Terraform shows
 * and tf scripts don't are used, and a doubtful file counts as Terraform: a missed tf check is
 * better than tf diagnostics all over a Terraform file.
 */

/** What the gate reads: a file's text and a folder's entries, each undefined when it can't be read. */
export interface GateHost {
  readFile(file: string): string | undefined;
  listDir(dir: string): string[] | undefined;
}

/** A file or folder beside the edited file that only a Terraform project has. */
function isTerraformEntry(name: string): boolean {
  return (
    name === ".terraform" ||
    name === ".terraform.lock.hcl" ||
    /\.tfvars(\.json)?$/.test(name) ||
    name.endsWith(".tf.json") ||
    /\.tfstate(\.backup)?$/.test(name)
  );
}

/** An HCL block label: quoted, or a bare identifier (`resource aws_instance web {`). */
const LABEL = String.raw`(?:"[^"\n]*"|[A-Za-z_][\w-]*)`;

/**
 * A line that starts one of Terraform's top-level blocks: one that takes labels (`resource "`,
 * `data "`, `module "`, `variable "`, `output "`, `provider "`, `check "`, `ephemeral "`, or the
 * same with bare labels and a `{`), or one that takes none (`terraform {`, `locals {`, `moved {`,
 * `import {`, `removed {`). In a tf script such a line would be a `not-a-command` error: a line
 * that doesn't start with `/` stops tf loading the file there. So a working script hardly ever
 * has one.
 */
const HCL_BLOCK = new RegExp(
  String.raw`^[ \t]*(?:` +
    String.raw`(?:resource|data|module|variable|output|provider|check|ephemeral)[ \t]+(?:"|${LABEL}(?:[ \t]+${LABEL})*[ \t]*\{)` +
    String.raw`|(?:terraform|locals|moved|import|removed)[ \t]*\{` +
    String.raw`)`,
  "m",
);

/** `ident [labels] {`: the shape of any HCL block's first line. */
const ANY_BLOCK = new RegExp(String.raw`^[A-Za-z_][\w-]*(?:[ \t]+${LABEL})*[ \t]*\{`);

/**
 * The first line that is neither blank nor a comment, in either language: `#`, `//` and `;`
 * lines, and a leading `/* ... *\/` block, are skipped.
 */
function firstSignificantLine(text: string): string | undefined {
  let rest = text;
  for (;;) {
    rest = rest.replace(/^\s+/, "");
    if (rest.startsWith("/*")) {
      const end = rest.indexOf("*/");
      if (end < 0) return undefined;
      rest = rest.slice(end + 2);
      continue;
    }
    if (rest === "") return undefined;
    const newline = rest.indexOf("\n");
    const line = newline < 0 ? rest : rest.slice(0, newline);
    if (line.startsWith("#") || line.startsWith("//") || line.startsWith(";")) {
      rest = newline < 0 ? "" : rest.slice(newline + 1);
      continue;
    }
    return line.replace(/\r$/, "");
  }
}

/**
 * Why `file` looks like Terraform rather than a tf script, as a short phrase, or undefined when
 * nothing says so. Only a .tf file is ever Terraform; a tfrc or .tfrc never is.
 */
export function terraformSign(file: string, host: GateHost): string | undefined {
  if (!file.toLowerCase().endsWith(".tf")) return undefined;
  const dir = path.dirname(file);
  const beside = (host.listDir(dir) ?? []).find(isTerraformEntry);
  if (beside !== undefined) return `${beside} is in its folder`;
  const raw = host.readFile(file);
  if (raw === undefined) return undefined;
  const text = raw.replace(/^﻿/, "");
  const match = HCL_BLOCK.exec(text);
  if (match) return `it has a Terraform block (${match[0].trim()})`;
  const first = firstSignificantLine(text);
  if (first !== undefined && ANY_BLOCK.test(first)) return `its first line opens an HCL block (${first.trim()})`;
  return undefined;
}
