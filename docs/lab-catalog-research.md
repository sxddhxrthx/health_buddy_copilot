# Laboratory catalogue and demo design research

Reviewed September 18, 2026. This is product/data-model research, not medical guidance, a screening
recommendation, an exhaustive laboratory directory or validation of the synthetic reference values.

## Findings

There is no universal full-body test package. Tata 1mg's reviewed package lists 74 components;
Dr Lal PathLabs advertises a 106-parameter package; Metropolis lists packages from basic panels to
over 100 parameters. Counts include panel components and calculated ratios, not necessarily that
many independently performed assays. Packages vary by laboratory, city, age, sex and intended use.
Routine packages do not include every vitamin, mineral, culture, hormone or specialist marker.

The application now includes 126 distinct numeric measurements and six qualitative findings per
synthetic checkup, repeated across three dates: 396 entries. This is an intentionally broad demo
catalogue, not an imitation of any provider's actual package. The two original review/import samples
remain unchanged. Every fixture value and interval is marked fictional, even where it resembles a
commonly encountered unit or interval. Medical thresholds are not derived from these fixtures.

## Coverage

| Family                       | Included numeric measurements                                                                                                                                                | Reporting considerations                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Blood count (24)             | Hemoglobin, RBC count, hematocrit, MCV, MCH, MCHC, RDW-CV/SD, WBC, platelets, MPV, PDW, plateletcrit, five differential percentages, five absolute counts, reticulocytes     | Hemoglobin is a protein measurement, not a mineral. Differential/absolute counts and specimen context must stay distinct.                                                                              |
| Lipids/circulation (16)      | Total/LDL/HDL/VLDL/non-HDL cholesterol, triglycerides, two ratios, apo A1/B, lipoprotein(a), heart rate, systolic/diastolic pressure, high-sensitivity troponin I, NT-proBNP | Lipids are not infection tests. Troponin/NT-proBNP are specialist markers, not routine wellness recommendations. BP and heart rate are clinical/device measurements, not blood assays.                 |
| Liver/proteins (12)          | ALT/SGPT, AST/SGOT, GGT, ALP, total/direct/indirect bilirubin, total protein, albumin, globulin, A/G ratio, LDH                                                              | These markers are not exclusive to one organ. Derived values must not count as independent evidence of disease.                                                                                        |
| Kidney/electrolytes (14)     | Creatinine, urea, BUN, BUN/creatinine ratio, eGFR, uric acid, sodium, potassium, chloride, bicarbonate, anion gap, osmolality, cystatin C, urine ACR                         | eGFR is a reported estimate, not calculated here. ACR and osmolality need their own units. Electrolytes have systemic relevance.                                                                       |
| Vitamins/minerals (24)       | A, B1/B2/B3/B5/B6/B7/B9/B12, C, D, E, K1; total/ionized calcium, phosphorus, magnesium, iron, ferritin, TIBC, transferrin saturation, zinc, copper, selenium                 | D and B12 appear in some routine packages; other vitamin/trace-element assays are often specialized. No single blood panel measures all nutrient stores. Assay/specimen and supplement effects matter. |
| Glucose/endocrine (12)       | Fasting/post-meal glucose, HbA1c, fasting insulin, C-peptide, TSH, free/total T3/T4, morning cortisol, PTH                                                                   | Preserve collection context. Hormone ranges may depend on time, age, sex, pregnancy and assay. No inferred diagnosis.                                                                                  |
| Inflammation/specialist (16) | CRP, hsCRP, ESR, procalcitonin, PT, INR, APTT, fibrinogen, D-dimer, CK, amylase, lipase, IgG/A/M, total IgE                                                                  | Inflammation does not locate or prove infection. Coagulation/enzyme/immunology tests require indication-specific interpretation.                                                                       |
| Urine numeric (8)            | pH, specific gravity, WBC/RBC/epithelial cells per HPF, protein, glucose, urobilinogen                                                                                       | Microscopy and chemistry are different observations; retain specimen and units.                                                                                                                        |
| Urine qualitative (6)        | Culture, nitrite, leukocyte esterase, appearance, ketones, microscopy comment                                                                                                | Keep source text. Culture organism identification and susceptibility are not a numeric reference-range score; no antibiotic recommendation is generated.                                               |

Not included in these fixtures: genetic panels, cancer screening/tumor markers, pregnancy/fertility
panels, all infectious serology/PCR assays, drug levels, heavy metals, stool diagnostics, imaging,
ECG waveforms, or every possible trace element. Those require further source-specific models. They
should not be added merely to inflate the count. The referenced medical-test index documents many
of these additional categories for future research.

## Patient scenarios and visualization

- Sam Taylor: predominantly above-range lipid/circulation values, with low HDL, across three visits.
- Jordan Lee: above-range liver/kidney measurements, falling reported eGFR, and a textual fictional
  urine-culture growth result. The UI does not infer infection or organ failure.
- Casey Patel: low vitamin/mineral readings (including B12, D, iron, zinc and calcium). The UI says
  below report range rather than diagnosing a deficiency or recommending supplements.

The Load sample checkups action is explicit, patient-owned, atomic and additive. It does not erase
manual records or doctor visits, change sharing, or run on every startup. Loading rejects duplicates
and insufficient capacity; deleting one fixture does not allow duplicate reimport. Reset restores
the original personal demo entries and clears loaded samples. Doctors access loaded data only via
the patient's existing active grant.

Hotspot size represents the number of distinct latest out-of-range series in a navigation group,
not the number of historical abnormal readings, disease severity or probability. Low and high values
both count. The illustrative 3D body is generated locally, not a patient scan or clinical anatomical
atlas. General/systemic findings use a separate hotspot rather than suggesting a single organ.
The 2D/list fallback, exact source values and historical per-report intervals remain available.

## Provider connections: deliberately inactive

The patient gallery lists Tata 1mg, Apollo 24/7, Manipal Hospitals, Cloudnine, Dr Lal PathLabs,
Metropolis, Thyrocare and Healthians; fitness options include Google Fit, Health Connect, Fitbit,
Apple Health/Apple Watch, Samsung Health and Garmin Connect. Every control displays Coming soon.
There is no provider login, OAuth, scraping, API call, credential storage, health permission or ETL.
The names are placeholders, not claims of partnerships or available public report APIs.

Official Apollo, Lal and Metropolis pages describe report access. Cloudnine links its app.
Manipal's site returned HTTP 403 in this research session; report API availability was not verified.
Thyrocare/Healthians/Samsung/Garmin are prospective options, not verified integrations.

Google's current Health Connect overview says Fit APIs are supported through the end of 2026 and
links migration guidance. Health Connect is an Android permission-based data store, not a generic
browser login. Apple's HealthKit is an iPhone/Apple Watch framework requiring native permissions,
not a web report-download API. Fitbit's current developer page announces legacy API deprecation in
September 2026 and migration to Google Health API. Any future integration must recheck current
availability, scopes, terms, regional support, data provenance and revocation behavior.

## Sources

Sources informed category coverage and platform constraints, not production medical cutoffs.
Descriptions above are original summaries, not copied provider content.

1. [Tata 1mg Good Health Platinum: package component list](https://www.1mg.com/labs/test/good-health-platinum-package-with-smart-report-34937)
2. [Tata 1mg urine culture and sensitivity](https://www.1mg.com/labs/test/urine-c-s-urine-culture-and-sensitivity-2232)
3. [Tata 1mg serum electrolytes](https://www.1mg.com/labs/test/serum-electrolytes-1761)
4. [MedlinePlus medical-test directory](https://medlineplus.gov/lab-tests/)
5. [MedlinePlus comprehensive metabolic panel](https://medlineplus.gov/lab-tests/comprehensive-metabolic-panel-cmp/)
6. [MedlinePlus vitamin B testing](https://medlineplus.gov/lab-tests/vitamin-b-test/)
7. [MedlinePlus reference ranges and lab results](https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/)
8. [NIH Office of Dietary Supplements vitamin/mineral index](https://ods.od.nih.gov/factsheets/list-VitaminsMinerals/)
9. [Apollo 24/7 services and reports](https://www.apollo247.com/)
10. [Dr Lal PathLabs packages and report access](https://www.lalpathlabs.com/)
11. [Metropolis packages and patient app](https://www.metropolisindia.com/)
12. [Cloudnine official app links](https://www.cloudninecare.com/)
13. [Android Health Connect overview and migration notice](https://developer.android.com/health-and-fitness/guides/health-connect)
14. [Apple HealthKit overview](https://developer.apple.com/documentation/healthkit)
15. [Fitbit Web API and migration notice](https://dev.fitbit.com/build/reference/web-api/)

Two initially attempted catalogue URLs did not provide the expected content (Apollo 404 and a
Tata 1mg slug redirecting to a different test); they were excluded from the evidence above.
