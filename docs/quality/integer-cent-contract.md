# Integer-cent simulation contract / Contrato de centavos enteros

## English

The simulator and optional `POST /api/simulate` now return `totalCostCents`, `costCentsByTenant` and `costCentsByFeature`. The ambiguous dollar-valued `totalCost`, `costByTenant` and `costByFeature` fields were removed. Provider configuration uses integer `costCentsPer1k`; callers must migrate names and units. The database insertion stores availability, failovers and trips, so it needs no monetary schema migration.

Illustrative billing rounds each successful call and each hedge upward to a whole cent using exact integer arithmetic: `(tokens × costCentsPer1k + 999) div 1000`. Failed attempts remain unbilled, preserving the original simulation assumption. Real providers may bill failed requests or aggregate fractional cents differently. This is not a current vendor price quote.

The reference fixture changes from $164.832 to 16,543¢ ($165.43) because rounding occurs per billed call. Availability, random sequence, breaker events, failovers and hedges are unchanged. TypeScript and Python use identical configurations and monetary fixtures. Tests verify exact totals, both breakdowns, failed attempts, fallback, hedges, invalid inputs and overflow.

The API test invokes the handler with database writes mocked. It verifies the response contract; it is not an HTTP, database or deployed integration check. Python billing checks ran with the available Python 3.11 interpreter; this does not certify the project's declared Python >=3.12 environment or full backend suite.

## Español

El simulador y la API opcional `POST /api/simulate` devuelven `totalCostCents`, `costCentsByTenant` y `costCentsByFeature`. Se eliminaron los campos ambiguos anteriores. La configuración usa `costCentsPer1k` entero; los consumidores deben migrar nombres y unidades. La escritura en base de datos no almacena costos y no requiere migración monetaria.

La facturación ilustrativa redondea cada llamada exitosa y cada llamada de cobertura al centavo superior con aritmética entera exacta. Los intentos fallidos siguen sin cobrarse, como en el simulador original. Los proveedores reales pueden cobrar fallos o agregar fracciones de otra forma; estas cifras no son precios actuales.

La referencia cambia de $164.832 a 16,543¢ ($165.43) por el redondeo por llamada. Disponibilidad, secuencia aleatoria, eventos, respaldos y coberturas no cambian. Los dos motores comparten configuraciones y resultados monetarios exactos. La prueba de API sustituye la escritura a base de datos y no certifica HTTP ni integración desplegada. Las pruebas monetarias Python usan el intérprete 3.11 disponible y no certifican el entorno declarado >=3.12 ni la suite completa del backend.
