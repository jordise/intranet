DONE
# Lane A, informe-form-v5-v3b: N/A, hazard, cost band and photo reference in the form

Branch `jordi/informe-form-v5-v3b-lane-a` (from main 572addf). Commits: 05d56ff (tests first, red: 229 PASS, 47 FAIL), d5475c3 (code, green). Nothing pushed, nothing deployed, no Caspio calls, no network.

## Tests
- `node informe-temporada.test.js` before: **219 PASS, 0 FAIL**. After: **286 PASS, 0 FAIL** (67 new checks in part 12; no existing check removed or changed).
- Every `*.test.js` in the worktree (74 files) exits 0 after the change.
- Caspio columns used, exact names from CASPIO-COLUMNS.md: `na`, `na_motivo`, `peligro`, `peligro_texto`, `coste`, `clave_ref` (TaInformeTemporadaLineas). `na` and `peligro` are written as JSON true/false. The text columns are written as strings, and a blank stays "" (never "0"). The `coste` values are `desconocido`, `<500`, `500-2000`, `2000-10000`, `10000+`. `clave_ref` holds an element clave, a room clave or `otra`.

## Files and functions (informe-temporada.html, after d5475c3)
- Save column list 1: `lineaRequest` :310. POST and PUT bodies now carry all six new columns. `na` and `peligro` are booleans, and a missing value is false.
- `siNo(v)` :323. Reads a Yes/No value: true, 1, '1', 'true', 'sí', 'si' or 'yes' means yes; null or anything else means no.
- Save column list 2: `lineasDesdeFilas` :325. Reads the six new columns back. A null text becomes "", and a null `na` or `peligro` becomes false.
- `faltasEnvio(lineas)` :355 gives `{na:[keys], peligro:[keys]}` in sheet order. `mensajeFaltas(f)` :364 builds the text "Falta el motivo de N/A en: Piscina, Barbacoa. Falta describir el peligro en: Instalación eléctrica". `enfocarFalta(f)` :370 moves the focus to the first missing box.
- `filaVacia` :405. A row with only N/A, a hazard, a cost or a reference now counts as filled, so it gets its POST.
- Local draft: `borradorDe` :532 and `mezclarBorrador` :549 carry the six fields. A v4 draft that lacks them does not overwrite a stored N/A.
- `enviarInforme` :577. Three added lines run the v5 check after `validarEnvio` and before `confirm`. Only N/A without a reason or a hazard without text blocks sending. Everything else passes.
- `alPulsar` :608 and `cambiosMarca(L,campo,v)` :626 handle the exclusion. Tapping N/A gives {na:true, estado:''}. Tapping N/A again gives {na:false, na_motivo:''}. A mark on an N/A row gives {estado, na:false, na_motivo:''}.
- `pintarFilaV5(caja,L)` :634 repaints the marks and N/A and opens or closes the two boxes. `enfocar` :642 is a small helper.
- `alEscribir` :643. The ⚠ Peligro checkbox stores true or false, never "on". Input and change from the same tap count once. Unticking it also clears `peligro_texto`.
- Row renderers:
  - `casillaNA` :693 draws the fourth mark `td.c-st.c-na > button.st.na[data-campo=na][data-v="N/A"]`, showing "☐ N/A" or "X N/A".
  - `cajaLinea` :695 draws a one-line `<input class="in …">`.
  - `filaEstadoHtml` :696 puts `div.na-caja[hidden]` + `input.na-motivo` above the observation, with the placeholder "p. ej. sin piscina". After the observation it puts `label.peligro > input.pel-chk[type=checkbox][data-campo=peligro]` "⚠ Peligro", then `div.peligro-caja[hidden]` + `input.peligro-texto`.
  - `costesDef` :706 and `selCoste` :707 draw `label.coste` "Coste estimado: " + `select.sel[data-campo=coste]` with the options — / desconocido / menos de 500 € / 500 a 2.000 € / 2.000 a 10.000 € / más de 10.000 €.
  - `selClaveRef` :709 draws `label.f-ref` "Se refiere a: " + `select.sel[data-campo=clave_ref]` with the options —, then Interior, Exterior, Seguridad e instalaciones and Estancias as optgroups with 26 + 7 short labels, then Otra.
  - `filaAccionHtml` :720 puts the cost after the action text, in the "Actuación prioritaria" cell. `filaEstanciaHtml` :728 puts it after the "Acción recomendada" text. `fotoHtml` :746 puts the reference under the caption, on filled photos only.
  - `seccionHtml` :773 changes one line: the "Observaciones" header gets `colspan="2"`.
- `quitarFoto` :892 also clears `clave_ref`. The change listener :947 adds one line that sends a checkbox change to `alEscribir`.
- Tests: `informe-temporada.test.js` part 12, :541 to :705 (12.1 save lists and read-back, 12.2 N/A exclusion, 12.3 element row markup, 12.4 cost and photo reference, 12.5 hazard tick, typing and local draft, 12.6 Enviar check, 12.7 read-only).

## Contract deviations, with reasons
1. **There is no "N/A" `<th>`.** An existing test pins the header `Elemento | Bueno | Regular | Malo | Observaciones` as adjacent cells, and I may not change it. The N/A cell is a real fourth column right after Malo. The "Observaciones" header spans it with colspan 2, and the button carries its own "N/A" label. If you want a visible "N/A" header, the test pin must change. That is the integrator's call, not mine.
2. **The six fields are also in more places than the two save lists.** The lane says "row renderers + the two save column lists". These additions were also needed: `filaVacia`, the local draft, `alPulsar`, `alEscribir`, the change listener, `quitarFoto` and three lines in `enviarInforme`. All of them are added lines; no other line was rewritten. Without them, an N/A-only row would never save, the tick would store "on", and a removed photo would keep its reference.
3. **The reason and hazard text are `<input>`, not `<textarea>`.** An existing test pins one textarea per element row.

## For lane E and the integrator: CSS this lane did not write (the `<style>` block is lane E's)
The form works without these rules, but it is not grey or tidy. Suggested rules:
- `.st.na{color:#999;font-size:12px}` `.st.na.on{background:#eee;color:#000}`. Mobile: `.t-est tr{grid-template-columns:minmax(0,1fr) 44px 44px 44px 44px}`. This still matches the existing mobile test regex. Without it, the N/A cell wraps to a second grid row on a phone.
- `.peligro{display:inline-flex;gap:4px;align-items:center;font-size:11px;color:#999;margin-top:2px}` `.pel-chk{width:14px;height:14px}`
- `.coste,.f-ref{display:flex;gap:6px;align-items:center;font-size:12px;color:#777}` `.coste .sel,.f-ref .sel{width:auto;text-align:left;text-align-last:left}`
- Print: blank boxes stay hidden because the `[hidden]` divs print hidden. Lane E decides whether an empty `select.sel.vacio` (cost or reference) prints, and whether "☐ N/A" prints on every row.

## Calls to other lanes
None. Lane B's history wiring and the provisional score go into `enviarInforme` and `reabrirInforme` through the integrator; my three lines in `enviarInforme` sit before `confirm`. `InformeScore` is not called by this lane. The score file already reads `na`, and with this lane `na` and `estado` are never both set on one row.

## Left out, named
- `PAGE_VERSION = 5`, the title, the HISTORIAL line and the version pins belong to the integrator.
- No headless render at 390 or 1280 px was run in this lane. The packet's Proof list is the integrator's job.
- The hazard tick is on the 26 element rows only, as the packet says. Actions and rooms have none.
