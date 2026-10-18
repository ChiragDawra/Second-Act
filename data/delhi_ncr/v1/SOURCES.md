# Sources inspected

Inspected 2026-10-18 by reading each landing page. **No data was imported from any of them.** This file records what
the pages said about access, so the next person knows what has to be checked before importing.

| Source | URL | What the page showed | Licence / terms | Used here? |
|---|---|---|---|---|
| National Classification of Occupations 2015 (DGE) | https://dge.gov.in/nco-2015 | Three PDF volumes (Vol I, Vol II-A, Vol II-B), dated 17/05/2016, page last updated 10/05/2024. The `www.` host failed its certificate check; `dge.gov.in` worked. | Page states none. A "Terms & Conditions" link exists and was not read. | No. `occupation_code` is blank. |
| National Career Service | https://www.ncs.gov.in/ | Job search, AI resume builder, career tools, counsellor and training finders, a dashboard and a mobile app. No API mentioned. | Terms & Privacy links exist and were not read. No scraping or robots statement visible. States that NCS charges no fee for registration or applications. | No. No bulk collection was attempted. |
| ESCO | https://esco.ec.europa.eu/en/use-esco/download | Versions up to v1.2.1; CSV, RDF, ODS, XML, JSON-LD; local API ZIP. Free download after accepting a privacy statement and giving an email address. | Page states no licence or attribution rule. Check the privacy statement and ESCO terms before use. | No. Skill wording is project-written. |
| O\*NET database | https://www.onetcenter.org/database.html | Release 31.0; Excel, CSV, JSON, SQL and RDF; live web services. | CC BY 4.0: credit "O\*NET 31.0 Database" and the U.S. Department of Labor, Employment and Training Administration, link the licence, state changes. "O\*NET" is a trademark and must be used as an adjective. | No. |
| Recruitment platforms and employer listings | n/a | Not inspected. | Terms differ per site; scraping may be prohibited. | No. `job_evidence.csv` is simulated. |

## Before importing anything

1. Read the source's terms; for ESCO and NCS this has not been done.
2. Record source, URL, version and collection time on every row.
3. Keep original identifiers in `taxonomy_mappings.csv` with a mapping rationale and a reviewer.
4. Do not present a small sample as Delhi-NCR demand, and do not use India-wide figures as Delhi evidence.
5. For listings, store the collection method and permission note. Avoid personal data.
