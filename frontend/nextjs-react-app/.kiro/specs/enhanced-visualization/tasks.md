# Implementation Plan: Enhanced Visualization

## Overview

Implement enhanced visualization capabilities across the Executive Dashboard, Main Dashboard, and Indicators page. This plan introduces Nivo as a second charting library, a Zustand filter store, a reusable RichTooltip, six new chart components, and click-to-filter interactivity — all wired into the existing Next.js 14 App Router structure.

## Tasks

- [ ] 1. Install Nivo dependencies and extend ChartWrapper
  - [ ] 1.1 Install `@nivo/core`, `@nivo/radial-bar`, and `@nivo/radar` as production dependencies
    - Run `npm install @nivo/core@^0.87.0 @nivo/radial-bar@^0.87.0 @nivo/radar@^0.87.0`
    - Verify the three packages appear in `package.json` dependencies
    - _Requirements: 1.1_

  - [ ] 1.2 Extend `ChartWrapper.tsx` with `library`, `animationDuration`, and `ChartAnimationContext`
    - Add `library?: "recharts" | "nivo"` prop (default `"recharts"`) and `animationDuration?: number` prop (default `1200`) to `ChartWrapperProps`
    - Export `ChartAnimationContext` and `useChartAnimation` hook
    - Wrap children in `<ChartAnimationContext.Provider value={animationDuration}>`
    - Ensure the existing `mounted` guard still renders a spinner placeholder before hydration for both library values
    - _Requirements: 1.2, 1.3, 1.4, 10.3_

  - [ ]* 1.3 Write property test for ChartWrapper consistent dimensions (Property 1)
    - **Property 1: ChartWrapper renders consistent dimensions regardless of library**
    - **Validates: Requirements 1.3**
    - Generate random `height` values and both `library` values; assert the container has the same height style and `w-full` class in all cases

- [ ] 2. Create the Filter Store
  - [ ] 2.1 Create `src/store/filterStore.ts` with Zustand
    - Implement `FilterState` interface with `activeProvince`, `activeStatus`, `setProvince`, `setStatus`, and `clearFilters`
    - Follow the same `create` pattern as `authStore.ts`; no persistence
    - _Requirements: 6.1_

  - [ ]* 2.2 Write unit tests for Filter Store actions
    - Test `setProvince` sets `activeProvince` correctly
    - Test `setStatus` sets `activeStatus` correctly
    - Test `clearFilters` resets both fields to null
    - _Requirements: 6.1_

- [ ] 3. Create the RichTooltip component
  - [ ] 3.1 Create `src/components/Dashboard/RichTooltip.tsx`
    - Implement `RichTooltipProps` interface with `label`, `value`, `unit`, `extras`, `active`, and `payload`
    - Apply container style matching `TOOLTIP_STYLE` (white background, 12px border-radius, `#dde4ed` border, box-shadow)
    - Render primary label/value row and map `extras` array to secondary rows with `text-muted-foreground` styling
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 3.2 Write property test for RichTooltip extras rendering (Property 10)
    - **Property 10: RichTooltip renders all extras rows**
    - **Validates: Requirements 8.3**
    - Generate `extras` arrays of arbitrary length N; assert exactly N secondary rows are rendered

  - [ ]* 3.3 Write unit tests for RichTooltip visual style
    - Assert container style matches `TOOLTIP_STYLE` constants (background, borderRadius, border, boxShadow)
    - _Requirements: 8.2_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement TrendLineChart
  - [ ] 5.1 Create `src/components/Dashboard/charts/TrendLineChart.tsx`
    - Implement `TrendDataPoint` and `TrendLineChartProps` interfaces
    - Use Recharts `ComposedChart` with an `Area` (gradient fill, `#003580`) and a `Line` (monotone)
    - Filter data client-side to `data.filter(d => d.year <= selectedYear)`
    - Wire `RichTooltip` as the `content` prop of `<Tooltip>`; implement `buildExtras` to compute YoY delta and percentage
    - Read `animationDuration` from `useChartAnimation()` context
    - Wrap in Framer Motion `motion.div` with `initial={{ opacity: 0, y: 16 }}` / `animate={{ opacity: 1, y: 0 }}` / `transition={{ duration: 0.4 }}`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2_

  - [ ]* 5.2 Write property test for TrendLineChart year filtering (Property 2)
    - **Property 2: TrendLineChart filters data to selected year**
    - **Validates: Requirements 2.5**
    - Generate arbitrary data arrays and selected years; assert filtered data contains exactly the entries where `year <= selectedYear`

  - [ ]* 5.3 Write property test for TrendLineChart YoY delta computation (Property 3)
    - **Property 3: TrendLineChart tooltip computes correct YoY delta**
    - **Validates: Requirements 2.4**
    - Generate pairs of consecutive enrollment values (P, C); assert extras show `C - P` and `((C-P)/P)*100` (or "N/A" when P is zero)

- [ ] 6. Implement YoYBarChart
  - [ ] 6.1 Create `src/components/Dashboard/charts/YoYBarChart.tsx`
    - Implement `YoYDataPoint` and `YoYBarChartProps` interfaces
    - Render a Recharts grouped `BarChart` with two `<Bar>` components using `CHART_COLORS[1]` and `CHART_COLORS[0]`
    - Wire `RichTooltip` with absolute and percentage difference extras
    - Render empty-state `"No year-over-year data available"` when `data` is null/undefined/empty
    - Wrap in Framer Motion entrance animation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 10.1_

  - [ ]* 6.2 Write property test for YoYBarChart tooltip difference (Property 4)
    - **Property 4: YoYBarChart tooltip computes correct difference**
    - **Validates: Requirements 3.3**
    - Generate prior-year P and selected-year S values; assert extras show `S - P` and `((S-P)/P)*100` (or "N/A" when P is zero)

  - [ ]* 6.3 Write unit test for YoYBarChart empty state
    - Assert "No year-over-year data available" message renders when `data` is null, undefined, or an empty array
    - _Requirements: 3.4_

- [ ] 7. Implement GraduationGauge
  - [ ] 7.1 Create `src/components/Dashboard/charts/GraduationGauge.tsx`
    - Implement `GraduationGaugeProps` interface with `rate: number | null | undefined`
    - Use `@nivo/radial-bar` `ResponsiveRadialBar` with `maxValue={100}` and teal fill (`#17a2b8`)
    - Build Nivo data with filled arc `rate` and unfilled arc `100 - rate`
    - Implement `CenterLabel` custom layer rendering the numeric rate value
    - Render `"Rate unavailable"` placeholder when `rate` is null/undefined
    - Wrap in `ChartWrapper` with `library="nivo"`; Framer Motion entrance animation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.1_

  - [ ]* 7.2 Write property test for GraduationGauge arc values (Property 5)
    - **Property 5: GraduationGauge arc values sum to 100**
    - **Validates: Requirements 4.2**
    - Generate rate values R in [0, 100]; assert filled arc = R and unfilled arc = 100 - R, summing to exactly 100

  - [ ]* 7.3 Write unit test for GraduationGauge null placeholder
    - Assert "Rate unavailable" renders when `rate` is null or undefined
    - _Requirements: 4.4_

- [ ] 8. Implement ProvinceBreakdownChart
  - [ ] 8.1 Create `src/components/Dashboard/charts/ProvinceBreakdownChart.tsx`
    - Implement `ProvinceDataPoint` and `ProvinceBreakdownChartProps` interfaces
    - Render a Recharts horizontal `BarChart` (`layout="vertical"`) with province names on Y-axis
    - Cycle bar colours using `CHART_COLORS[i % CHART_COLORS.length]`
    - Compute percentage share from total; wire `RichTooltip` with province name, enrollment, and percentage share extras
    - Implement `handleBarClick` that calls `useFilterStore().setProvince(entry.name)` on bar click
    - Wrap in Framer Motion entrance animation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.1_

  - [ ]* 8.2 Write property test for ProvinceBreakdownChart colour cycling (Property 6)
    - **Property 6: ProvinceBreakdownChart cycles CHART_COLORS correctly**
    - **Validates: Requirements 5.2**
    - Generate arrays of N province data points; assert bar at index i has fill `CHART_COLORS[i % CHART_COLORS.length]`

  - [ ]* 8.3 Write property test for percentage share calculation (Property 7)
    - **Property 7: Percentage share calculation is correct**
    - **Validates: Requirements 5.3, 7.4**
    - Generate collections of items with numeric counts; assert percentage share = `(C / total) * 100` rounded to one decimal place

  - [ ]* 8.4 Write unit test for ProvinceBreakdownChart click dispatch
    - Assert `setProvince` is called with the correct province name when a bar is clicked
    - _Requirements: 5.4_

- [ ] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement GenderBreakdownChart
  - [ ] 10.1 Create `src/components/Dashboard/charts/GenderBreakdownChart.tsx`
    - Implement `GenderDataPoint` and `GenderBreakdownChartProps` interfaces
    - Render a Recharts `BarChart` with `Male` (`#003580`) and `Female` (`#F37336`) colours
    - Implement `getColor` function for additional gender categories using `CHART_COLORS` by index
    - Wire `RichTooltip` with gender label, count, and percentage share extras
    - Return `null` when `data` is null/undefined/empty (no empty grid cell)
    - Wrap in Framer Motion entrance animation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1_

  - [ ]* 10.2 Write property test for GenderBreakdownChart additional categories (Property 14)
    - **Property 14: GenderBreakdownChart renders additional categories**
    - **Validates: Requirements 7.3**
    - Generate gender arrays containing non-Male/Female categories; assert each extra category renders a bar using the correct `CHART_COLORS` index

  - [ ]* 10.3 Write unit test for GenderBreakdownChart null return
    - Assert component returns null when `data` is null, undefined, or empty
    - _Requirements: 7.5_

- [ ] 11. Implement MultiIndicatorPanel
  - [ ] 11.1 Create `src/components/Dashboard/charts/MultiIndicatorPanel.tsx`
    - Implement `Indicator` and `MultiIndicatorPanelProps` interfaces
    - Add `isOpen` (default `false`) and `selected` (indicator ids array) state
    - Render a collapsible panel with toggle button labelled "Compare Indicators" using Framer Motion `AnimatePresence`
    - Implement multi-select control (checkbox list or `<select multiple>`) capped at 6 selections; ignore 7th selection attempt
    - Implement `normalise` function covering both branches (target_value present vs. null/zero)
    - Render `@nivo/radar` `ResponsiveRadar` when `selectedIndicators.length >= 5`, else Recharts grouped `BarChart`
    - Display `"Select at least 2 indicators to compare"` when fewer than 2 are selected
    - Wire `RichTooltip` with indicator name, raw value, unit, target value, and normalised percentage
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 10.1_

  - [ ]* 11.2 Write property test for MultiIndicatorPanel chart type selection (Property 11)
    - **Property 11: MultiIndicatorPanel selects correct chart type by count**
    - **Validates: Requirements 9.3**
    - Generate N selected indicators (2–10); assert `ResponsiveRadar` renders when N >= 5, grouped `BarChart` when N < 5

  - [ ]* 11.3 Write property test for MultiIndicatorPanel max selection cap (Property 12)
    - **Property 12: MultiIndicatorPanel rejects selections beyond 6**
    - **Validates: Requirements 9.4**
    - Simulate selecting 6 indicators then attempting a 7th; assert selected count remains at 6

  - [ ]* 11.4 Write property test for indicator normalisation (Property 13)
    - **Property 13: Indicator normalisation is correct for both branches**
    - **Validates: Requirements 9.6, 9.7**
    - Generate indicators with and without `target_value`; assert `(V/T)*100` when T > 0, and `(V/max)*100` otherwise

  - [ ]* 11.5 Write unit test for MultiIndicatorPanel default collapsed state
    - Assert panel defaults to collapsed on initial render
    - _Requirements: 9.2_

- [ ] 12. Wire filter interactivity into Main Dashboard (`app/dashboard/page.tsx`)
  - [ ] 12.1 Add click handlers and Filter Store integration to existing Regional Share BarChart and Student Status PieChart
    - Import `useFilterStore` and attach `onClick` handlers to existing bar/slice elements
    - Apply `fillOpacity` via `<Cell>` props: `0.3` for non-matching elements, `1` for matching
    - _Requirements: 6.2, 6.3, 6.6, 6.7_

  - [ ] 12.2 Add dismissible filter chip above the chart grid
    - Render filter chip conditionally when `activeProvince !== null || activeStatus !== null`
    - Implement close button calling `clearFilters()`
    - _Requirements: 6.4, 6.5_

  - [ ]* 12.3 Write property test for filter chip visibility (Property 8)
    - **Property 8: Filter chip is visible for any non-null filter value**
    - **Validates: Requirements 6.4**
    - Generate non-null province/status values; assert chip renders. When both null, assert no chip.

  - [ ]* 12.4 Write property test for opacity highlighting (Property 9)
    - **Property 9: Non-matching chart elements render at 30% opacity**
    - **Validates: Requirements 6.6, 6.7**
    - Generate active filter F and element identifiers; assert non-matching elements have `fillOpacity=0.3` and matching element has `fillOpacity=1`

- [ ] 13. Add GenderBreakdownChart and RichTooltip upgrades to Main Dashboard
  - [ ] 13.1 Mount `GenderBreakdownChart` in the chart grid after the Student Status donut
    - Import and render `GenderBreakdownChart` with `gender_breakdown` data from the dashboard API response
    - Wrap in Framer Motion entrance animation with appropriate delay
    - _Requirements: 7.1, 10.1_

  - [ ] 13.2 Upgrade existing Enrollment Trend AreaChart to use RichTooltip
    - Replace existing tooltip with `RichTooltip` passing year, enrollment count, and YoY delta as `extras`
    - _Requirements: 8.4_

  - [ ] 13.3 Upgrade existing Regional Share BarChart to use RichTooltip
    - Replace existing tooltip with `RichTooltip` passing province name, HEI count, and percentage share as `extras`
    - _Requirements: 8.5_

- [ ] 14. Wire new charts into Executive Dashboard (`app/dashboard/executive/page.tsx`)
  - [ ] 14.1 Mount `TrendLineChart` below national summary cards
    - Import and render `TrendLineChart` with `enrollment_trend` data and `selectedYear` prop
    - Wrap in Framer Motion entrance animation
    - _Requirements: 2.1, 10.1_

  - [ ] 14.2 Mount `YoYBarChart` below TrendLineChart
    - Import and render `YoYBarChart` with `yoy_comparison` data and year labels
    - Wrap in Framer Motion entrance animation
    - _Requirements: 3.1, 10.1_

  - [ ] 14.3 Mount `GraduationGauge` in the summary section
    - Import and render `GraduationGauge` with `avg_graduation_rate` from the executive API response
    - _Requirements: 4.1, 10.1_

  - [ ] 14.4 Mount `ProvinceBreakdownChart` in the Executive Dashboard layout
    - Import and render `ProvinceBreakdownChart` with `province_breakdown` data
    - Wrap in Framer Motion entrance animation
    - _Requirements: 5.1, 10.1_

- [ ] 15. Wire MultiIndicatorPanel into Indicators page (`app/indicators/page.tsx`)
  - [ ] 15.1 Mount `MultiIndicatorPanel` above the indicator list
    - Import and render `MultiIndicatorPanel` with the full `indicators` array from the page data
    - Ensure it only renders when two or more indicators are present
    - _Requirements: 9.1_

- [ ] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical milestones
- Property tests validate universal correctness properties across generated inputs (minimum 100 iterations each)
- Unit tests validate specific rendering scenarios and edge cases
- All new chart components require `"use client"` directive (existing project pattern)
- Nivo components are SSR-incompatible; the existing `ChartWrapper` mounted guard handles this for both libraries

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.1"] },
    { "id": 2, "tasks": ["1.3", "3.2", "3.3", "5.1", "6.1", "7.1", "8.1", "10.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.2", "6.3", "7.2", "7.3", "8.2", "8.3", "8.4", "10.2", "10.3", "11.1"] },
    { "id": 4, "tasks": ["11.2", "11.3", "11.4", "11.5", "12.1", "13.2", "13.3"] },
    { "id": 5, "tasks": ["12.2", "12.3", "12.4", "13.1", "14.1", "14.2", "14.3", "14.4"] },
    { "id": 6, "tasks": ["15.1"] }
  ]
}
```
