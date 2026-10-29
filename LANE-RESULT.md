DONE
# Lane E, informe-form-v5-v3b: how the new fields print and show on a phone, plus the villa managers' note (29/10/2026)

Branch `jordi/informe-form-v5-v3b-lane-e`, commit cb68b3f on main 572addf. Nothing pushed or deployed. Caspio columns used, exact: `na`, `na_motivo`, `peligro`, `peligro_texto`, `coste`, `clave_ref` (TaInformeTemporadaLineas; CASPIO-COLUMNS.md).

## Files and functions
1. `informe-temporada.html`: only the `<style>` block and new `hoja*` functions. No row renderer, save list, PAGE_VERSION, title or HISTORIAL touched.
   - :838 `hojaSi(v)`: Caspio YES/NO to a boolean. true, 1, "1", "true", "sí", "si" and "yes" are true; null, false and "false" are false. Same rule as `InformeScore.esNa`.
   - :839 `hojaNa(L)`: `<div class="h-v5 h-na">N/A: <motivo></div>`. A draft with no reason prints "N/A: sin motivo".
   - :840 `hojaPeligro(L)`: `<div class="h-v5 h-peligro">⚠ <texto></div>`. Only the tick counts. Text with no tick prints nothing. A tick with no text prints "⚠ Peligro (sin descripción)".
   - :841 `hojaCosteTexto(v)`: `desconocido`, `<500`, `500-2000`, `2000-10000` and `10000+` become desconocido, menos de 500 €, 500 a 2.000 €, 2.000 a 10.000 € and más de 10.000 €. Blank gives "" (never 0). Any other value prints as it is.
   - :842 `hojaCoste(L)`: `<div class="h-v5 h-coste">Coste estimado: <banda></div>`, or "" when blank.
   - :844 `hojaRefTexto(clave)`: the label of one of the 26 elements or 7 rooms, read from `seccionesDef()`. `otra` becomes "Otra". An unknown key prints as it is.
   - :849 `hojaRef(L)`: `<div class="h-v5 h-ref">Se refiere a: <nombre></div>`, or "".
   - :851 `hojaV5(L)`: one call per row. The output order is N/A, hazard, cost, photo reference. A pre-v5 line gives "".
   - CSS on screen, :93-101: the N/A mark (`.st[data-v="N/A"]`) is grey, and grey on a grey background when chosen. The hazard tick (`[data-campo="peligro"]`, `.v5-peligro`) is small, grey and always visible. The cost and photo-reference selects are left-aligned, with no font-size change, so iOS keeps 16 px and does not zoom. `.h-v5{display:none}` hides the printed copies on screen.
   - CSS on mobile, :138 and :160-162: the element row grid has 5 columns, `minmax(0,1fr) 44px 44px 44px 44px`. At 390 px the label column keeps 194 px. The hazard label is 44 px tall for tapping; a bare checkbox is 20 px.
   - CSS in print, :207-211: `.h-v5{display:block}` shows the printed copies. These new controls are hidden: `.v5-ctl` and `[data-campo=` `na_motivo`, `peligro`, `peligro_texto`, `coste` and `clave_ref`, plus the `.ta-p` copies of `na_motivo` and `peligro_texto`, so no text prints twice. The N/A mark is NOT hidden. It prints X or ☐ like Bueno, Regular and Malo, in #222.
2. `informe-temporada-hoja.test.js` (new, 43 checks). It runs the real `hoja*` functions through vm on fixture lines in the Caspio shape. It checks the 33 labels, escaping, the output order, that the printed copies contain no input element, and the screen, mobile and print CSS.
3. `/Users/g0m/Desktop/Projects/3villas/reports/intranet-informe-temporada-dashboard-2026-10-28/NOTA-VILLA-MANAGERS.md`: Spanish first, 112 words (120 by `wc` with the bullets), then the full English. It passes `scripts/draft-carnegie-check.sh` (whatsapp). It is NOT sent and NOT committed. The ask date is Friday 6 Nov: move it if v5 goes live later.

## Tests
`node informe-temporada-hoja.test.js` gives 43 PASS, 0 FAIL; it was red first, 9 PASS and 34 FAIL. `node informe-temporada.test.js` still gives 219 PASS, 0 FAIL; no existing test was changed. `informe-temporada-score.test.js` gives 118 PASS. I ran every `*.test.js` except `police-url.integration.test.js` (network): all exit 0. `ficha-campos.test.js` failed once (7 PASS, 1 FAIL), then passed 18 of 18 on each of 18 more runs. That file does not read the form, so the failure is flaky and comes from the existing code.

## For the integrator and lane A: names I expect, no calls into other lanes
1. Each lane A row renderer appends `hojaV5(L)`, with L = `LINEAS[k]`, in one cell:
   - element row (`filaEstadoHtml`): the observation cell (`c-obs`), after the `ta('texto_1')` box;
   - action row (`filaAccionHtml`): the "Actuación prioritaria" cell, after the box;
   - room row (`filaEstanciaHtml`): the "Acción recomendada" cell;
   - photo (`fotoHtml`): after the caption (`.pie`).
2. Lane A's N/A mark must carry `data-v="N/A"` to get the grey style. The new controls must use `data-campo` = the column name. A wrapper around a control that holds visible text, such as `<label>⚠ Peligro</label>`, needs class `v5-ctl` or `data-campo="peligro"`; otherwise its text prints.
3. Lane A owns the N/A header: `CAB_ESTADO` gets a 4th column `['N/A','c-st']`. The desktop width stays `.c-st` 62 px; an existing test pins that value.

## Left out, named
1. Headless renders at 390 px and on paper are missing. Chrome for Testing hung again on this Mac (the known trap), and no browser tool was available to this lane. These renders are the integrator's Proof step; the fixture sheet in the test is ready for them.
2. Screen copies in read-only mode: the screen shows the disabled controls and the `.h-v5` lines are print-only. Showing `.h-v5` on screen in read-only mode is a one-line follow-up if a reviewer wants it.
3. PAGE_VERSION 5, the title, the HISTORIAL line and the test pins are the integrator's.
