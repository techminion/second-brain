import { Editor } from "@tiptap/react";
import { afterEach, describe, expect, it } from "vitest";

import { FindInNote, findInNotePluginKey, findMatches } from "./find-in-note-extension";
import { markdownEditorExtensions } from "./markdown-editor-extensions";

let editor: Editor | undefined;
afterEach(() => editor?.destroy());

function create(markdown: string): Editor {
  editor = new Editor({
    content: markdown,
    contentType: "markdown",
    extensions: [...markdownEditorExtensions, FindInNote],
  });
  return editor;
}

function matchedText(target: Editor): string[] {
  const state = findInNotePluginKey.getState(target.state);
  return (state?.matches ?? []).map(({ from, to }) => target.state.doc.textBetween(from, to));
}

describe("findMatches (EDIT-18)", () => {
  it("finds every case-insensitive occurrence, across blocks and marks", () => {
    const target = create("Plan the **Pla**n\n\n- planning\n\n```\nplan()\n```");
    expect(
      findMatches(target.state.doc, "plan").map(({ from, to }) =>
        target.state.doc.textBetween(from, to),
      ),
    ).toEqual(["Plan", "Plan", "plan", "plan"]);
  });

  it("never matches across two blocks", () => {
    const target = create("ends with pl\n\nan starts");
    expect(findMatches(target.state.doc, "plan")).toEqual([]);
  });

  it("returns nothing for an empty query", () => {
    expect(findMatches(create("text").state.doc, "")).toEqual([]);
  });
});

describe("find commands (EDIT-18)", () => {
  it("highlights matches, steps with wrap-around and selects the current match", () => {
    const target = create("one two one three one");
    target.commands.setTextSelection(1);
    target.commands.setFindQuery("one");

    expect(matchedText(target)).toEqual(["one", "one", "one"]);
    expect(findInNotePluginKey.getState(target.state)?.current).toBe(0);
    expect(target.view.dom.querySelectorAll("[data-find-match]")).toHaveLength(3);
    expect(target.view.dom.querySelectorAll('[data-find-match="current"]')).toHaveLength(1);

    target.commands.stepFindMatch(1);
    expect(findInNotePluginKey.getState(target.state)?.current).toBe(1);
    const { from, to } = target.state.selection;
    expect(target.state.doc.textBetween(from, to)).toBe("one");

    target.commands.stepFindMatch(1);
    target.commands.stepFindMatch(1);
    expect(findInNotePluginKey.getState(target.state)?.current).toBe(0);
    target.commands.stepFindMatch(-1);
    expect(findInNotePluginKey.getState(target.state)?.current).toBe(2);
  });

  it("starts at the first match at or after the cursor", () => {
    const target = create("alpha beta alpha beta");
    target.commands.setTextSelection(8);
    target.commands.setFindQuery("alpha");
    expect(findInNotePluginKey.getState(target.state)?.current).toBe(1);
  });

  it("re-finds after edits and clears cleanly", () => {
    const target = create("cat");
    target.commands.setFindQuery("cat");
    target.commands.insertContentAt(target.state.doc.content.size - 1, " cat");
    expect(matchedText(target)).toEqual(["cat", "cat"]);

    target.commands.clearFind();
    expect(findInNotePluginKey.getState(target.state)?.matches).toEqual([]);
    expect(target.view.dom.querySelectorAll("[data-find-match]")).toHaveLength(0);
  });

  it("selects the current match on request (closing the find bar)", () => {
    const target = create("keep the second word");
    target.commands.setTextSelection(1);
    target.commands.setFindQuery("second");
    expect(target.commands.selectCurrentFindMatch()).toBe(true);
    const { from, to } = target.state.selection;
    expect(target.state.doc.textBetween(from, to)).toBe("second");

    target.commands.setFindQuery("absent");
    expect(target.commands.selectCurrentFindMatch()).toBe(false);
  });

  it("does not step when there are no matches", () => {
    const target = create("nothing here");
    target.commands.setFindQuery("absent");
    expect(target.commands.stepFindMatch(1)).toBe(false);
  });
});
