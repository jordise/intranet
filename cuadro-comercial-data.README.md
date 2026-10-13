# cuadro-comercial-data.js: field map and data availability

The pure calculation module of the Cuadro de mando comercial (`cuadro-comercial.html`).
Spec: 3villas `context/cuadro-comercial-gaelle-build-2026-10-13.md` sections 3 and 4.
Tests: `node cuadro-comercial-data.test.js` (also runs under `node --test`).

Every figure below comes from a read-only pull on 2026-10-13 12:58 CEST: Caspio REST v3,
GET only (`tables/<name>/fields`, `tables/<name>/records` with `q.pageSize=1000` and
`q.pageNumber`). Counts only, with no guest or owner data.

## 1. Ta_raport_ventas (weekly sales report)

The table definition has 24 fields, and the records also return `PK_ID` (system autonumber).
Reports Ventas v24 and Prospección mensual v1 use the same names.
Reports Ventas writes the row with `action=save`. It writes `parseInt(value)||0` for every
input, so an empty input is saved as 0. The module cannot tell a stored 0 from "not filled".

| Column | Caspio type | Module use |
|---|---|---|
| registro_id | RANDOM ID (unique) | not used |
| Fecha | STRING | week (Monday to Sunday) and month of the row |
| Agente | STRING | UserID of TaUsers; the name comes from `users` |
| Captacion_Inmobiliaria | NUMBER | sale captations without exclusive (tile 3, weekly row) |
| Captacion_Inmobiliaria_Exclusiva | NUMBER | sale captations with exclusive (tile 3, weekly row) |
| Visitas_Ventas | NUMBER | visits (with the vacation-rental visits) |
| Firma_Arras | NUMBER | arras signed (tiles 2 and 7, weekly row, monthly sales) |
| Firma_Notario | NUMBER | deeds signed (tiles 2 and 7, monthly sales) |
| Carteles | NUMBER | monthly sales |
| Seguros | NUMBER | monthly sales, count only |
| Visita_Alquiler_Vacacional | NUMBER | visits (added to Visitas_Ventas) |
| Captacion_Alquiler_Vacacional | NUMBER | monthly captation (old line) |
| Captacion_Alquiler_LAU | NUMBER | monthly sales |
| Alquiler_LAU | NUMBER | monthly sales |
| Fincas_Actuales | NUMBER | stock per agent, the latest week, summed over agents (monthly sales) |
| Facturado_Ciu | NUMBER | running total per agent for the year (monthly money) |
| Facturado_Mao | NUMBER | running total per agent for the year (monthly money) |
| Prosp_Llamadas | NUMBER | calls; calls per visit |
| Prosp_No_Contestan | NUMBER | monthly prospecting |
| Prosp_No_Interesado | NUMBER | monthly prospecting |
| Prosp_Otra_Agencia | NUMBER | monthly prospecting |
| Prosp_Seguimiento | NUMBER | monthly prospecting |
| Prosp_Cartas_Intenciones | NUMBER | letters of intent; the base of lead to contract (tile 6) |
| Prosp_Contratos | NUMBER | management contracts signed (tile 6, weekly row, leaderboard) |

Measured on 2026-10-13:

1. 1,195 rows, all with a readable ISO `Fecha`. The first row is 2023-01-01 and the last is 2026-10-05.
   They cover 197 distinct Monday-to-Sunday weeks, from 2022-W52 to 2026-W41.
2. Week of the date. The 2023 rows are dated Sunday (312 of 318), and the rows from 2024 on
   are dated Monday. 4 rows have another weekday: 3 on Tue 2026-05-26 and 1 on Fri 2026-07-10.
3. There are 9 agent UserIDs. 6 are the active sales users: Gaelle 199 rows, Luciano 70, Mari 199,
   Soledad 72, Tino 200, Toni Moll 151. The other 3 are inactive users (roles cleaner, staff, sales).
4. The last 13 closed weeks, 2026-W29 to 2026-W41, have 6 rows per week, one per agent.
   They have no gap and no duplicate. The week of today, 2026-W42, has no row yet.
5. 11 agent-weeks hold two rows: 6 in 2023-W45, 4 in 2026-W02 and 1 in 2026-W28.
   In each case one of the two rows is all zeros.
6. `Captacion_Inmobiliaria_Exclusiva` is a separate count, not part of `Captacion_Inmobiliaria`.
   It is higher than `Captacion_Inmobiliaria` in 24 of the 41 rows that have an exclusive.
   The module therefore treats total = simple + exclusive (inference from the data; confirm with Gaëlle).
7. The Prosp_* columns are not null in only 7 rows: the 6 rows of 2026-W41, all 0, and 1 row of 2023-01-01.
   In practice there is no prospecting data yet.
8. `Fincas_Actuales` and `Facturado_*` are not null in 134 rows from 2026-05-04, plus 1 row in 2023.
   Facturado never goes down for an agent. The only drop is the all-zero duplicate in 2026-W28.
   This makes it a running total for the year, by office. Each agent fills either Ciu or Mao.

## 2. TaVillas fields used

The table has 382 rows and 330 fields. The module reads only the fields below.

| Field | Caspio type | Meaning (Caspio label / lookup table) | Module use |
|---|---|---|---|
| villaid | AUTONUMBER | key | not shown |
| Name | STRING | villa name | lists (vencen12m, bajas, altas) |
| Status | INTEGER | TaViXVillasStatus: 1 LA GESTIONAMOS NOSOTROS, 11 OUR PROPERTIES, 12–15 LOST - SOLD / COMPETENCY / THEY DO THEMSELVES / OTHER OR CANCELLED, 2, 3, 4, 8, 10, 20 = other | under management = 1 or 11; lost = 12–15 |
| Iniciocontrato | INTEGER | "Año Inicio Contrato", a YEAR; 1111 = pending placeholder | altas: 1 January of the year |
| Fincontrato | INTEGER | "Año Fin Contrato", a YEAR; 2999 = pending placeholder | bajas and vencen12m: 31 December of the year |
| ContractRenovationType | INTEGER | TaRenovationContradtType: 2 PENDIENTE, 10 Fecha fija en contrato, 20 Anualmente tácitamente | vencen12m label, renewal split |
| Unidades_multiunit | INTEGER | units of a multi-unit | single (empty or 1) / multi (>1), units total |
| Deal_Type | INTEGER | TaDealType: 2 = Warranty | % with warranty |

These fields were read but are not used:

1. `Activa` is a lookup by year (TaActiva; the newest value is "2023 SI"). It is not a current active flag.
2. `SIGNED` is a lookup (YES, IN PROCESS, NOT YET).
3. `Fist_year_we_managed` is empty for 272 of 382 villas, and its values mix lookup ids with one raw year.
4. `Warranty_payments` is free text, filled for 4 villas.
5. `Statusalquiler` is true for 82 LOST villas, so it is not a management flag.

Measured on 2026-10-13:

1. Under management (Status 1 or 11): 132 villas (130 + 2).
   - Records named "NO USAR": 2 of the 132 still have Status 1, with Fincontrato 2023 and 2024.
   - Contract signed (SIGNED): 126 YES, 3 IN PROCESS, 3 NOT YET.
2. Iniciocontrato for all 382 villas: 175 = 1111 (placeholder), 206 empty, 1 = 2026.
   For the 132 managed villas: 124 = 1111, 7 empty, 1 = 2026. **Only 1 of the 132 managed
   villas has a real start year.**
3. Fincontrato for all 382 villas: 181 filled, of which 171 are real years from 2021 to 2042, 9 are 2999 and 1 is 0. 201 are empty.
   For the 132 managed villas: 130 have a real year and 2 are empty. 49 end in 2026, and 2 have a year already past (the two "NO USAR" records).
4. Lost (Status 12–15): 156 villas. 39 have a real end year (38 LOST - OTHER OR CANCELLED, 1 LOST - SOLD).
   117 have no end year (108 empty, 8 = 2999, 1 = 0).
5. ContractRenovationType for the managed villas: 60 fixed date, 67 renewed every year by tacit renewal, 5 empty.
6. Deal_Type 2 (Warranty) for the managed villas: 76 of 132 (57.6 %).
7. Unidades_multiunit for the managed villas: 122 = 1, 8 > 1, 2 empty; 184 units in total.
8. Other counts do not match: the partners' workbook gives 177 "properties under contract" (snapshot of February 2026),
   and the spec says "219 homes". TaVillas gives 132 villas, or 184 units.

The counts above include every record. From checker fix 4 on, the module drops every villa whose
Name matches `/NO USAR/i` before it counts, and it adds a notice with the number dropped.
On 2026-10-13 that is 15 records: 2 with Status 1 and 13 with Status 15.
After the drop the module counts the following:

1. 130 villas under management, 182 units, and 74 of 130 with warranty (56.9 %).
2. 129 of 130 managed villas have no real start year.
3. 128 of 130 managed villas have a real end year, and none has a year already past.
4. 143 lost villas: 39 have an end year (8 of them 2025), and 104 have none.
5. 78 contracts with an end year of 2026 or 2027: 49 + 29.

## 3. Phase 1 data availability, per tile

| Tile | Verdict | Why (measured) |
|---|---|---|
| 1 Honorarios cobrados | not covered | No cash data in Caspio. The Holded read is phase 2. Facturado_* holds self-reported invoiced totals, not cash collected. |
| 2 Arras firmadas, 90 días (phase 2: Honorarios pendientes) | partly | Labelled "Arras firmadas, 90 días" in phase 1: arras counts for 30/60/90 days, with the deeds beside them (count only). The label "Honorarios pendientes" returns in phase 2, with amounts. A count cannot pair an arras with its deed. |
| 3 Captaciones de venta, % exclusiva | partly | The total (the sum of the two fields) is fully covered since 2023. The "% exclusiva" is 'sin confirmar' and shows no figure until Gaëlle confirms what Captacion_Inmobiliaria means. |
| 4 Viviendas en gestión: altas, bajas, total | partly | Only the total is solid: 130 after the "NO USAR" drop. Altas, bajas, netas and last year are 'sin dato' while any baja has no end year (104) or any managed villa has no start year (129). |
| 5 Tasa de bajas, 12 meses | not covered | 'sin dato', with no rate and no reference lines, for the same reason ("104 bajas sin año de fin; 129 altas sin año de inicio"). |
| 6 Contratos de gestión; % leads → contrato | not covered yet | The fields exist, but Prosp_Contratos and Prosp_Cartas_Intenciones hold only the zeros of 2026-W41. |
| 7 Pipeline: cartera, ofertas, arras, escrituras | partly | Arras and deeds are covered. Ofertas has no field (phase 2). Cartera activa is phase 2 per the spec, but `Fincas_Actuales` (203 in 2026-W41) may be the same figure (see the open questions). |
| 8 Riesgos y oportunidades | not covered | Text by Gaëlle in Ta_comercial_datos, phase 2. |

## 4. Phase 1 data availability, per weekly row (team view, 13 weeks)

| Row | Verdict | Source |
|---|---|---|
| Contratos de gestión firmados | not covered yet | Prosp_Contratos: only 2026-W41, all 0 |
| Captaciones en exclusiva / Captación Inmobiliaria (campo del informe) | fully | Captacion_Inmobiliaria_Exclusiva / Captacion_Inmobiliaria (meaning not confirmed) |
| Arras firmadas | fully | Firma_Arras |
| Ofertas | not covered (phase 2) | no field |
| Cartas de intención enviadas | not covered yet | Prosp_Cartas_Intenciones: only 2026-W41, all 0 |
| Visitas (ventas + vacacional) | fully | Visitas_Ventas + Visita_Alquiler_Vacacional |
| Valoraciones | not covered (phase 2) | no field |
| Leads nuevos por fuente | not covered (phase 2) | no field |
| Conversaciones | not covered (phase 2) | no field |
| Llamadas, llamadas por visita | not covered yet | Prosp_Llamadas: only 2026-W41, all 0 |

## 5. Monthly blocks

1. Dinero: cobrado, diferencia and pendiente are phase 2. Facturado comes from the
   self-reported running totals (Facturado_Ciu + Facturado_Mao). The year total for October 2026 is
   226,700 EUR over 6 agents, and the October month so far is 700 EUR.
2. Ventas: arras, escrituras, seguros (count only), LAU, carteles and Fincas_Actuales come from the
   weekly report. Inmuebles en venta, días en mercado and caídas tras arras are phase 2.
3. Captación: 130 under contract after the "NO USAR" drop, with the single/multi split and 56.9 % with
   warranty from TaVillas. Cartas and contratos come from the weekly report. Leads and the free-text
   reasons for a baja are phase 2. The altas and bajas lists are 'sin dato', with the reason, while tile 4 cannot date them.
   `vencen12m` holds the contracts with an end year of this year or next year. Its label is in
   `vencen12mLabel` ("con año de fin 2026 o 2027"), and it is ordered by year, then name: 78 on 2026-10-13.
4. Prospección: the eight monthly sums per agent and the 150 EUR bonus at 50 calls follow the
   rules of Prospección mensual v1. The difference: a sum with no data is null ("sin dato"), not "faltan 50".

## 6. Rules the module applies

1. Weeks run from Monday to Sunday, labelled with the ISO week (`isoWeekLabel('2024-12-30') = '2025-W01'`).
   The 13-week window ends with the week of `today`. That week is open and is never "sin informe".
2. A missing value is null and is never shown as 0. A week with no row is null.
3. Duplicates: the counters of two rows in the same week are added, and a notice names the agent and the week.
   Fincas_Actuales and Facturado_* take the higher value of that week.
4. A contract year Y ends on 31/12/Y and starts on 1/1/Y. The values 1111, 2999 and 0 mean "no year".
5. Churn = bajas with an end date in (today − 12 months, today] ÷ (managed today − altas + bajas).
   With 0 homes at the start, the rate is null.
   The rate is computed only when every lost villa has an end year and every managed villa has a start year.
   Otherwise it is 'sin dato', and the sentence gives the reason.
6. Lead to contract uses the 13-week contracts ÷ the 13-week letters of intent. The tile states the base.
   The tile 6 sentence also says "las columnas de prospección tienen dato desde la semana 41 (05/10/2026)" when the window starts earlier.
   The week number and the Monday date come from the data.
7. The leaderboard sorts by visits, then by contracts, then by name. Calls never rank an agent.
8. Villas whose Name matches `/NO USAR/i` count nowhere. A notice gives how many were dropped.
9. Every sentence and notice uses a decimal comma (66,7 %).
10. In the open month (the month of `today`), tiles 3, 6 and 7 show no last year, last month or variance.
    Their `comparison` field and their sentence say "mes en curso, sin comparación".
11. Sentences, notices, motives and bases are plain Spanish for a partner.
    They name no Caspio field (Fincontrato, Iniciocontrato, Ta_…, Deal_Type, Prosp_…), no status code (LOST) and no filler value (1111, 2999, "vacío").
    They say "año de inicio del contrato", "año de fin del contrato", "informe semanal" and "sin año".
    A week reads "semana 40 (28/09/2026)": the ISO week number and the Monday date (`weekTxt`).
    Technical names stay only in each `source` field. Data fields (`weeks`, `prospeccionDesde`, `fincasActuales.week`) keep the ISO label.
    A test checks 203 texts from 14 dashboards against this list.
12. Every count in a sentence, notice, motive or base agrees in number: "1 baja", "2 bajas", "1 vivienda en gestión no tiene ...", "1 firma de arras", "1 escritura".
    The helpers are `cnt(n, uno, varios)` and `pl(n, uno, varios)`. A missing value keeps the plural ("sin dato bajas").
    A test runs fixtures where every count is 1. It fails on any "1 bajas", "1 viviendas", "1 altas", "1 captaciones", "1 contratos", "1 cartas", "1 arras", "1 escrituras", "1 semanas", "1 filas" or "1 fichas".
    The "Motivo" values of the bajas list (LOST - …) stay as data.

## 7. Input added beyond the spec

The module also accepts `users` (TaUsers rows: UserID, Name, Role, User_Status), because
`Agente` holds a UserID. With `users`, an active sales user with no rows still shows, with
every closed week "sin informe". It also accepts `month` and `readAt`.

## 8. Open questions for the build

1. Confirm what `Fincas_Actuales` counts: the agent's sale listings (the "cartera activa"), or something else.
2. Confirm that `Captacion_Inmobiliaria` means "without exclusive", given point 1.6.
3. Closed by checker fix 4: the "NO USAR" villas leave every count (15 records on 2026-10-13).
4. The year-only contract fields cannot date altas or bajas within the year. A real
   date field, or the Ta_comercial_datos baja rows, would make tiles 4 and 5 reliable.
