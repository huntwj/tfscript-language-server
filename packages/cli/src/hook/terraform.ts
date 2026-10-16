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
  return name === ".terraform" || name === ".terraform.lock.hcl" || /\.tfvars(\.json)?$/.test(name) || name.endsWith(".tf.json");
}

/**
 * A line that starts one of Terraform's top-level blocks: `resource "`, `data "`, `module "`,
 * `variable "`, `output "` or `provider "`, or `terraform {` or `locals {`. tf would send such a
 * line to the world as text, which a script hardly ever does.
 */
const HCL_BLOCK = /^[ \t]*(?:(?:resource|data|module|variable|output|provider)[ \t]+"|(?:terraform|locals)[ \t]*\{)/m;

/**
 * Why `file` looks like Terraform rather than a tf script, as a short phrase, or undefined when
 * nothing says so. Only a .tf file is ever Terraform; a tfrc or .tfrc never is.
 */
export function terraformSign(file: string, host: GateHost): string | undefined {
  if (!file.toLowerCase().endsWith(".tf")) return undefined;
  const dir = path.dirname(file);
  const beside = (host.listDir(dir) ?? []).find(isTerraformEntry);
  if (beside !== undefined) return `${beside} is in its folder`;
  const text = host.readFile(file);
  const match = text === undefined ? null : HCL_BLOCK.exec(text);
  if (match) return `it has a Terraform block (${match[0].trim()})`;
  return undefined;
}
