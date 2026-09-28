import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";

/**
 * Syntax-highlighting grammars for code blocks (EDIT-06, ADR-34). A curated
 * set rather than lowlight's ~35-language `common` bundle, which added ~70 kB
 * to the note page's first load. Each grammar also registers its aliases
 * (`ts`, `js`, `py`, `sh`, `html`, `yml`, …). A fence in any other language
 * still round-trips untouched — it just renders unhighlighted.
 */
export const codeLowlight = createLowlight({
  bash,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  markdown,
  python,
  rust,
  shell,
  sql,
  typescript,
  xml,
  yaml,
});
