# Campus WiFi Demo Skeleton

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## What is included

1. Interactive parameter panel
2. Topology animation view
3. Time-series metrics for `x(t)`, `Th(t)`, `J(t)`, and `mean(r_t)`
4. Baseline comparison board
5. Sensitivity heatmaps
6. Moran comparison panel
7. Config and result export

## Notes

1. The current simulation logic is a demo-grade placeholder engine with normalized metrics.
2. Replace `src/engine/simulation.ts` with your final model equations when ready.
3. Keep unspecified physical-layer values explicitly labeled as unspecified or normalized.
