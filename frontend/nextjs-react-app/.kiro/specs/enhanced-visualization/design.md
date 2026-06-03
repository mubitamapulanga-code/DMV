# Design Document — Enhanced Visualization

## Overview

This document describes the technical architecture for the Enhanced Visualization feature of the DMV platform. The feature spans three surfaces (Executive Dashboard, Main Dashboard, Indicators page), introduces Nivo as a second charting library, establishes a Zustand-backed cross-chart filter store, and adds a reusable `RichTooltip` component. All new chart panels follow the existing Framer Motion animation pattern already present in the Main Dashboard.

---

## Architecture

The feature is purely frontend — no new API endpoints are required. It layers on top of the existing `/analytics/executive/`, `/analytics/dashboard/`, `/analytics/enrollment-breakdown/`, and `/indicators/` endpoints. The architecture follows the existing Next.js 14 App Router + React client-component pattern.

```
src/
├── store/
│   ├── authStore.ts          (existing)
│   └── filterStore.ts        (NEW — Zustand filter store)
├── components/
│   └── Dashboard/
│       ├── ChartWrapper.tsx  (EXTENDED — library + animationDuration props)
│       ├── RichTooltip.tsx   (NEW — shared tooltip component)
│       ├── StatCard.tsx      (existing)
│       ├── DashboardLayout.tsx (existing)
│       └── charts/           (NEW directory)
│           ├── TrendLineChart.tsx
│           ├── YoYBarChart.tsx
│           ├── GraduationGauge.tsx
│           ├── ProvinceBreakdownChart.tsx
│           ├── GenderBreakdownChart.tsx
│           └── MultiIndicatorPanel.tsx
└── app/
    ├── dashboard/
    │   ├── page.tsx          (MODIFIED — filter interactivity, GenderBreakdownChart, RichTooltip)
    │   └── executive/
    │       └── page.tsx      (MODIFIED — TrendLineChart, YoYBarChart, GraduationGauge, ProvinceBreakdownChart)
    └── indicators/
        └── page.tsx          (MODIFIED — MultiIndicatorPanel)
```

---

## Components and Interfaces

### 1. ChartWrapper (Extended)

**File:** `src/components/Dashboard/ChartWrapper.tsx`

Extended with two new optional props:

```typescript
interface ChartWrapperProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
  library?: "recharts" | "nivo";       // default: "recharts"
  animationDuration?: number;           // default: 1200 (ms)
}
```

The `library` prop does not change rendering behaviour — the same hydration guard and height container apply to both libraries. It is available for consumers that need to conditionally pass `animationDuration` only to Recharts children (Nivo manages its own animation internally).

The `animationDuration` value is exposed via a React context (`ChartAnimationContext`) so that deeply nested Recharts components can read it without prop-drilling:

```typescript
export const ChartAnimationContext = React.createContext<number>(1200);

export default function ChartWrapper({ ..., animationDuration = 1200 }: ChartWrapperProps) {
  // ...existing mounted guard...
  return (
    <ChartAnimationContext.Provider value={animationDuration}>
      <div style={{ height, minHeight: height }} className={`w-full ${className}`}>
        {children}
      </div>
    </ChartAnimationContext.Provider>
  );
}
```

---

### 2. RichTooltip

**File:** `src/components/Dashboard/RichTooltip.tsx`

A reusable custom tooltip component compatible with Recharts' `<Tooltip content={...} />` prop pattern.

```typescript
interface RichTooltipExtra {
  key: string;
  value: string;
}

interface RichTooltipProps {
  label?: string;
  value?: string | number;
  unit?: string;
  extras?: RichTooltipExtra[];
  // Recharts passes these automatically when used as content prop:
  active?: boolean;
  payload?: any[];
}
```

Visual style matches the existing `TOOLTIP_STYLE` constant:

```typescript
const containerStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  border: '1px solid #dde4ed',
  boxShadow: '0 8px 24px rgba(0,53,128,0.1)',
  padding: '10px 14px',
  fontSize: '12px',
  fontWeight: 700,
};
```

Rendering structure:

```tsx
<div style={containerStyle}>
  <p className="text-primary font-black">{label}</p>
  <p className="text-primary text-base">
    {value} <span className="text-muted-foreground font-medium text-xs">{unit}</span>
  </p>
  {extras?.map(({ key, value }) => (
    <p key={key} className="text-muted-foreground text-[11px] font-medium mt-0.5">
      {key}: {value}
    </p>
  ))}
</div>
```

---

### 3. Filter Store

**File:** `src/store/filterStore.ts`

Follows the same `create` pattern as `authStore.ts`. No persistence — filter state is session-only.

```typescript
import { create } from 'zustand';

interface FilterState {
  activeProvince: string | null;
  activeStatus: string | null;
  setProvince: (province: string) => void;
  setStatus: (status: string) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>()((set) => ({
  activeProvince: null,
  activeStatus: null,
  setProvince: (province) => set({ activeProvince: province }),
  setStatus: (status) => set({ activeStatus: status }),
  clearFilters: () => set({ activeProvince: null, activeStatus: null }),
}));
```

---

### 4. TrendLineChart

**File:** `src/components/Dashboard/charts/TrendLineChart.tsx`

A Recharts `ComposedChart` with an `Area` for the gradient fill and a `Line` for the monotone trend line.

```typescript
interface TrendDataPoint {
  year: number;
  enrollment: number;
}

interface TrendLineChartProps {
  data: TrendDataPoint[];
  selectedYear: number;
}
```

Data is filtered client-side: `data.filter(d => d.year <= selectedYear)`.

The `RichTooltip` is wired as the `content` prop of `<Tooltip>`. The tooltip formatter computes YoY delta:

```typescript
function buildExtras(payload: TrendDataPoint[], index: number): RichTooltipExtra[] {
  if (index === 0) return [];
  const prev = payload[index - 1].enrollment;
  const curr = payload[index].enrollment;
  const delta = curr - prev;
  const pct = prev > 0 ? ((delta / prev) * 100).toFixed(1) : 'N/A';
  return [{ key: 'YoY Change', value: `${delta >= 0 ? '+' : ''}${delta.toLocaleString()} (${pct}%)` }];
}
```

Gradient definition reuses the existing `gradBlue` pattern from `dashboard/page.tsx`.

---

### 5. YoYBarChart

**File:** `src/components/Dashboard/charts/YoYBarChart.tsx`

A Recharts grouped `BarChart` (`barCategoryGap` and `barGap` set for visual separation).

```typescript
interface YoYDataPoint {
  category: string;
  priorYear: number;
  selectedYear: number;
}

interface YoYBarChartProps {
  data: YoYDataPoint[] | null | undefined;
  priorYearLabel: string;   // e.g. "2023"
  selectedYearLabel: string; // e.g. "2024"
}
```

Two `<Bar>` components: one for `priorYear` (fill `CHART_COLORS[1]`) and one for `selectedYear` (fill `CHART_COLORS[0]`).

Empty state: when `data` is null/undefined/empty, renders:

```tsx
<div className="flex items-center justify-center h-full text-muted-foreground font-bold text-sm">
  No year-over-year data available
</div>
```

RichTooltip extras include absolute difference and percentage difference.

---

### 6. GraduationGauge

**File:** `src/components/Dashboard/charts/GraduationGauge.tsx`

Uses `@nivo/radial-bar` `ResponsiveRadialBar`. Nivo is SSR-incompatible, so the component is wrapped in `ChartWrapper` (which already handles the `mounted` guard).

```typescript
interface GraduationGaugeProps {
  rate: number | null | undefined;
}
```

Data shape for Nivo:

```typescript
const nivoData = rate != null
  ? [{ id: 'Graduation Rate', data: [{ x: 'Rate', y: rate }] }]
  : null;
```

The gauge arc spans 0–100. The `maxValue` prop is set to `100`. A custom `centerLabel` layer renders the numeric value using Nivo's `layers` prop:

```typescript
const CenterLabel = ({ centerX, centerY }: { centerX: number; centerY: number }) => (
  <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="central"
    style={{ fontSize: 22, fontWeight: 900, fill: '#003580' }}>
    {rate?.toFixed(1)}%
  </text>
);
```

Placeholder when `rate` is null:

```tsx
<div className="flex items-center justify-center h-full text-muted-foreground font-bold text-sm">
  Rate unavailable
</div>
```

---

### 7. ProvinceBreakdownChart

**File:** `src/components/Dashboard/charts/ProvinceBreakdownChart.tsx`

A Recharts horizontal `BarChart` (`layout="vertical"`). Clicking a bar dispatches to the Filter Store.

```typescript
interface ProvinceDataPoint {
  name: string;
  enrollment: number;
}

interface ProvinceBreakdownChartProps {
  data: ProvinceDataPoint[];
}
```

Click handler:

```typescript
const { setProvince } = useFilterStore();

const handleBarClick = (entry: ProvinceDataPoint) => {
  setProvince(entry.name);
};
```

Percentage share is computed from total:

```typescript
const total = data.reduce((sum, d) => sum + d.enrollment, 0);
// passed to RichTooltip extras as: `${((d.enrollment / total) * 100).toFixed(1)}%`
```

---

### 8. GenderBreakdownChart

**File:** `src/components/Dashboard/charts/GenderBreakdownChart.tsx`

A Recharts `BarChart` (vertical, single-axis). Returns `null` when data is absent.

```typescript
interface GenderDataPoint {
  gender: string;
  count: number;
}

interface GenderBreakdownChartProps {
  data: GenderDataPoint[] | null | undefined;
}
```

Colour mapping:

```typescript
const GENDER_COLORS: Record<string, string> = {
  Male: '#003580',
  Female: '#F37336',
};

function getColor(gender: string, index: number): string {
  return GENDER_COLORS[gender] ?? CHART_COLORS[index % CHART_COLORS.length];
}
```

---

### 9. MultiIndicatorPanel

**File:** `src/components/Dashboard/charts/MultiIndicatorPanel.tsx`

A collapsible panel using Framer Motion `AnimatePresence` for the expand/collapse animation.

```typescript
interface Indicator {
  id: number;
  name: string;
  code: string;
  unit: string;
  value: number;
  target_value: number | null;
}

interface MultiIndicatorPanelProps {
  indicators: Indicator[];
}
```

State:

```typescript
const [isOpen, setIsOpen] = React.useState(false);
const [selected, setSelected] = React.useState<number[]>([]); // indicator ids
```

Normalisation logic:

```typescript
function normalise(indicator: Indicator, allSelected: Indicator[]): number {
  if (indicator.target_value != null && indicator.target_value > 0) {
    return (indicator.value / indicator.target_value) * 100;
  }
  const maxVal = Math.max(...allSelected.map(i => i.value));
  return maxVal > 0 ? (indicator.value / maxVal) * 100 : 0;
}
```

Chart selection logic:

```typescript
const selectedIndicators = indicators.filter(i => selected.includes(i.id));
const useRadar = selectedIndicators.length >= 5;
```

- `useRadar === true` → `@nivo/radar` `ResponsiveRadar`
- `useRadar === false` → Recharts grouped `BarChart`

Multi-select control: a `<select multiple>` or a custom checkbox list capped at 6 selections. When the user attempts to select a 7th, the selection is ignored.

Nivo Radar data shape:

```typescript
// One object per "subject" (indicator), with a single key for the normalised value
const radarData = selectedIndicators.map(ind => ({
  indicator: ind.name,
  value: normalise(ind, selectedIndicators),
}));
```

---

## Data Models

### Filter Store State

```typescript
interface FilterState {
  activeProvince: string | null;
  activeStatus: string | null;
}
```

### Executive API Response (relevant fields)

```typescript
interface ExecutiveData {
  national_summary: {
    total_students: number;
    avg_graduation_rate: number | null;
    total_institutions: number;
    active_institutions: number;
    yoy_enrollment_growth: number | null;
  };
  enrollment_trend: Array<{ year: number; enrollment: number }>;
  yoy_comparison: Array<{ category: string; prior_year: number; selected_year: number }> | null;
  province_breakdown: Array<{ name: string; enrollment: number }>;
  top_institutions_by_enrollment: Array<{ name: string; type: string; students: number }>;
}
```

> Note: `enrollment_trend`, `yoy_comparison`, and `province_breakdown` are new fields expected from the existing `/analytics/executive/` endpoint. If the backend does not yet return them, the chart components handle null/undefined gracefully with empty states.

### Gender Breakdown (Main Dashboard API)

The `/analytics/dashboard/` endpoint is expected to include:

```typescript
gender_breakdown: Array<{ gender: string; count: number }> | null;
```

---

### ChartAnimationContext

```typescript
export const ChartAnimationContext = React.createContext<number>(1200);
export const useChartAnimation = () => React.useContext(ChartAnimationContext);
```

Recharts chart components inside a `ChartWrapper` call `useChartAnimation()` to read the `animationDuration` value.

### Filter Chip (Main Dashboard)

Rendered conditionally when `activeProvince !== null || activeStatus !== null`:

```tsx
{(activeProvince || activeStatus) && (
  <div className="flex items-center gap-2 mb-4">
    {activeProvince && (
      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
        Province: {activeProvince}
        <button onClick={clearFilters}><X className="w-3 h-3" /></button>
      </span>
    )}
    {activeStatus && (
      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
        Status: {activeStatus}
        <button onClick={clearFilters}><X className="w-3 h-3" /></button>
      </span>
    )}
  </div>
)}
```

### Opacity Highlighting

Applied via `Cell` `fillOpacity` prop in Recharts:

```tsx
// Regional Share BarChart
<Cell
  key={i}
  fill={CHART_COLORS[i % CHART_COLORS.length]}
  fillOpacity={activeProvince && item.name !== activeProvince ? 0.3 : 1}
/>

// Student Status PieChart
<Cell
  key={s.code}
  fill={STATUS_COLORS[s.code] ?? '#9ca3af'}
  fillOpacity={activeStatus && s.code !== activeStatus ? 0.3 : 1}
/>
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `avg_graduation_rate` is null | GraduationGauge renders "Rate unavailable" placeholder |
| `yoy_comparison` is null/empty | YoYBarChart renders "No year-over-year data available" |
| `gender_breakdown` is null/empty | GenderBreakdownChart returns null (no empty grid cell) |
| `enrollment_trend` is empty | TrendLineChart renders an empty ResponsiveContainer (Recharts handles gracefully) |
| `province_breakdown` is empty | ProvinceBreakdownChart renders an empty BarChart |
| Nivo renders before hydration | ChartWrapper `mounted` guard shows spinner placeholder |
| MultiIndicatorPanel < 2 selected | Inline message "Select at least 2 indicators to compare" |
| Indicator has no `target_value` | Normalised against max value across selected indicators |

---

## Dependency Installation

Add to `package.json` dependencies:

```json
"@nivo/core": "^0.87.0",
"@nivo/radial-bar": "^0.87.0",
"@nivo/radar": "^0.87.0"
```

Install command:

```bash
npm install @nivo/core@^0.87.0 @nivo/radial-bar@^0.87.0 @nivo/radar@^0.87.0
```

Nivo packages require `"use client"` on any component that imports them, which is already the pattern for all chart components in this project.

---

## Animation Pattern

All new chart panels use the existing Framer Motion pattern from `dashboard/page.tsx`:

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: 0.N }}
  className="..."
>
  <ChartWrapper height={...} animationDuration={400}>
    {/* chart */}
  </ChartWrapper>
</motion.div>
```

When chart data changes (year selector, filter action), the parent `motion.div` re-mounts via a React `key` prop tied to the data dependency, triggering the entrance animation again with `duration: 0.4` (400ms).

---

## Testing Strategy

**Dual approach:** unit/example tests for specific rendering scenarios and edge cases; property-based tests for universal invariants across generated inputs.

**Unit tests** cover:
- ChartWrapper renders spinner before hydration (example)
- YoYBarChart empty-state message when data is null (edge case)
- GraduationGauge "Rate unavailable" placeholder when rate is null (edge case)
- GenderBreakdownChart returns null when data is absent (edge case)
- MultiIndicatorPanel defaults to collapsed state (example)
- Filter Store `setProvince`, `setStatus`, `clearFilters` actions (example)
- RichTooltip visual style matches TOOLTIP_STYLE constants (example)
- Framer Motion `initial`/`animate` props on new chart panels (example)

**Property-based tests** cover the 14 correctness properties listed below. Each property test runs a minimum of 100 iterations with randomly generated inputs. Tests are tagged with the format: `Feature: enhanced-visualization, Property N: <title>`.

**Integration tests** cover:
- Nivo packages present in `package.json` (smoke)
- Filter Store shape (smoke)
- RichTooltip component exists with required props (smoke)
- Executive Dashboard renders TrendLineChart after summary cards (example)
- ProvinceBreakdownChart dispatches `setProvince` on bar click (example)
- Enrollment Trend AreaChart uses RichTooltip with correct extras (example)

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property Reflection:** After reviewing all prework items, the following consolidations were made:
- Properties 5.3 and 7.4 (percentage share calculation) are identical in structure and are merged into a single "percentage share" property.
- Properties 6.6 and 6.7 (opacity highlighting) share the same invariant and are merged.
- Properties 9.6 and 9.7 (normalisation) are complementary cases of the same normalisation function and are merged into one property covering both branches.

---

### Property 1: ChartWrapper renders consistent dimensions regardless of library

*For any* `height`, `className`, and `library` value (`"recharts"` or `"nivo"`), the outer container rendered by `ChartWrapper` after hydration SHALL have the same `height` style and `w-full` class, regardless of which library is specified.

**Validates: Requirements 1.3**

---

### Property 2: TrendLineChart filters data to selected year

*For any* array of year/enrollment data points and any selected year Y, the data passed to the Recharts chart SHALL contain only entries where `year <= Y`, and SHALL contain all entries where `year <= Y`.

**Validates: Requirements 2.5**

---

### Property 3: TrendLineChart tooltip computes correct YoY delta

*For any* two consecutive data points with enrollment values P (prior) and C (current), the RichTooltip extras SHALL show a YoY change of `C - P` and a percentage of `((C - P) / P) * 100` (rounded to one decimal place), or "N/A" when P is zero.

**Validates: Requirements 2.4**

---

### Property 4: YoYBarChart tooltip computes correct difference

*For any* prior-year value P and selected-year value S, the RichTooltip extras SHALL show an absolute difference of `S - P` and a percentage difference of `((S - P) / P) * 100` (rounded to one decimal place), or "N/A" when P is zero.

**Validates: Requirements 3.3**

---

### Property 5: GraduationGauge arc values sum to 100

*For any* graduation rate R where `0 <= R <= 100`, the Nivo `ResponsiveRadialBar` data SHALL contain a filled arc value of R and an unfilled arc value of `100 - R`, such that the two values sum to exactly 100.

**Validates: Requirements 4.2**

---

### Property 6: ProvinceBreakdownChart cycles CHART_COLORS correctly

*For any* array of N province data points, the bar at index i SHALL have a fill colour equal to `CHART_COLORS[i % CHART_COLORS.length]`.

**Validates: Requirements 5.2**

---

### Property 7: Percentage share calculation is correct

*For any* collection of items with numeric counts, and any single item with count C, the percentage share displayed in the RichTooltip SHALL equal `(C / total) * 100` where `total` is the sum of all counts in the collection, rounded to one decimal place.

**Validates: Requirements 5.3, 7.4**

---

### Property 8: Filter chip is visible for any non-null filter value

*For any* non-null value of `activeProvince` or `activeStatus` in the Filter Store, the Main Dashboard SHALL render a filter chip element containing the active filter label. When both are null, no filter chip SHALL be rendered.

**Validates: Requirements 6.4**

---

### Property 9: Non-matching chart elements render at 30% opacity

*For any* active filter value F (province or status) and any chart element E whose identifier does not equal F, the `fillOpacity` of E SHALL be `0.3`. For the matching element, `fillOpacity` SHALL be `1`.

**Validates: Requirements 6.6, 6.7**

---

### Property 10: RichTooltip renders all extras rows

*For any* `extras` array of length N passed to `RichTooltip`, the rendered output SHALL contain exactly N secondary rows, each displaying the corresponding `key` and `value` from the extras array.

**Validates: Requirements 8.3**

---

### Property 11: MultiIndicatorPanel selects correct chart type by count

*For any* number N of selected indicators, the MultiIndicatorPanel SHALL render a Nivo `ResponsiveRadar` when `N >= 5`, and a Recharts grouped `BarChart` when `N < 5` (and `N >= 2`).

**Validates: Requirements 9.3**

---

### Property 12: MultiIndicatorPanel rejects selections beyond 6

*For any* attempt to select a 7th indicator when 6 are already selected, the selection SHALL be ignored and the selected count SHALL remain at 6.

**Validates: Requirements 9.4**

---

### Property 13: Indicator normalisation is correct for both branches

*For any* selected indicator with value V:
- If `target_value` T is a positive number, the normalised value SHALL equal `(V / T) * 100`.
- If `target_value` is null or zero, the normalised value SHALL equal `(V / max) * 100` where `max` is the maximum `value` across all currently selected indicators (or 0 if max is 0).

**Validates: Requirements 9.6, 9.7**

---

### Property 14: GenderBreakdownChart renders additional categories

*For any* gender category G in the API response that is not "Male" or "Female", the GenderBreakdownChart SHALL render a corresponding bar or slice for G using the next available colour from `CHART_COLORS` (by index position after the known gender entries).

**Validates: Requirements 7.3**
