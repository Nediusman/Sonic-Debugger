# Screen reader test script: structure tree

Covers `src/navigation`. Run it with NVDA (Windows, Firefox or Chrome) and VoiceOver (Mac, Safari). Record the result in `docs/a11y-checks.md` with date and version. Nothing here has been run yet.

Test file: any Python file with a class with two methods, a function with a loop, and a call inside the loop. The sample in `src/navigation/fixtures/trees.ts` has that shape.

Setup. Start the screen reader. Open the app. Keep speech (key T) off so the app does not talk over the reader. Do not use the mouse.

## NVDA

NVDA may start in browse mode. The tree should switch it to focus mode on its own. If letters move the NVDA cursor instead of acting, note it as a failure.

| Step | Do | Listen for | Pass if |
| --- | --- | --- | --- |
| 1 | Press Tab until focus enters the structure tree. | "Code structure, tree", then "module, 12 lines, item 1 of 1, level 1", then "expanded". | The name is read once, with the position, and the state is read. |
| 2 | Press Down arrow. | "class Shop, 2 methods, 6 lines, item 1 of 2, level 2" and "collapsed". | Read once. No second copy from a status message. |
| 3 | Press Right arrow. | "Expanded, 2 items" from the status region. | The message is heard once. Focus stays on the class. |
| 4 | Press Right arrow again. | The first method, for example "method add, 2 parameters, 3 lines, item 1 of 2, level 3". | Focus moved into the class. |
| 5 | On the method, press Left arrow. Then press Right arrow on the class and Left arrow again. | First the class name (Left on a leaf goes to the parent). Then, with the class open, "Collapsed". | Left on a leaf moves to the parent. Left on an open node says "Collapsed" and focus stays. |
| 6 | Press End, then Down arrow. | The last item, then "End of structure". | The boundary message is heard and focus does not move. |
| 7 | Press Home, then Up arrow. | The module, then "Start of structure". | Same as step 6 at the top. |
| 8 | Press Shift plus Slash. | The "Keyboard shortcuts" heading. The list says type-ahead is not supported. | Focus is on the heading. Escape closes the list and focus returns to the tree. |
| 9 | Press G, type 10, press Enter. | The call inside the loop, with level 4. | Ancestors opened. The name includes the position. |
| 10 | Press G, type 99, press Enter. | "Line 99 is outside the file, which has 12 lines". | Heard once. Focus does not move. |
| 11 | Press E with no run yet. | "No error to go to. Run the code first." | Heard once. |
| 12 | Press R. After the run fails, press E. | "Running", then an error alert, then the failing node's name. The failing node has the text "Error here". | The alert is heard when the run fails. E lands on the failing node. Check whether the reader says "Error here" as a description. Note it either way. |
| 13 | Press Tab. | Focus leaves the tree to the next control. | No keyboard trap. |
| 14 | Press Shift plus Tab. | Focus returns to the same item that was last focused. | One tab stop, and the reader reads that item's name. |
| 15 | Press P, then S. | Sound starts, then stops. "Sound stopped". | S and Escape both stop sound. |
| 16 | Press Ctrl plus Enter in the editor. | "Running". | The code runs from the editor. |
| 17 | Press R in the editor. | Nothing. The letter is typed. | Letter keys act only in the tree. |
| 18 | Turn on high contrast (browser or Windows) and zoom to 200 percent. | Not applicable. | Focus outline is visible. The text "Error here" shows. Nothing is clipped. |

## VoiceOver (Safari, Mac)

Use Control plus Option as the VoiceOver keys. Do not bind them. The app uses plain keys only.

| Step | Do | Listen for | Pass if |
| --- | --- | --- | --- |
| 1 | Tab to the tree. Or use VO plus arrows to reach it and VO plus Shift plus Down to interact. | "Code structure, tree", then the first item name, then position. | The name matches the NVDA wording. |
| 2 | Down arrow, Up arrow. | Item names with "item N of M, level L". VoiceOver may also add its own "N of M" text. | Note any doubled position text. |
| 3 | Right arrow, Left arrow. | "Expanded, 2 items", "Collapsed". | VoiceOver may announce the expanded state itself. Note if it speaks it twice. |
| 4 | Home and End. | First and last visible items. | If VoiceOver captures them, note the alternative. |
| 5 | Letters G, E, P, R, S, L. | Each acts as in the NVDA table. | Letters reach the app while the tree has focus. |
| 6 | Shift plus Slash. | The "Keyboard shortcuts" heading. | Works on this keyboard layout. |
| 7 | Tab out and back. | One tab stop. | Same as NVDA step 13 and 14. |

## Also check

- Run axe in the browser on every tree state: just opened, one node expanded, all expanded, focus on a leaf, error marker shown. Record serious and critical findings.
- Change the keyboard layout (for example German or French). The letters and Shift plus Slash should still act, because the app reads `event.code`.
- Turn speech on with T. The reader and the app voice should not both speak the same text. If they do, note it.

## Record

For each step write: reader and version, browser, pass or fail, and the exact words heard when they differ from the table.
