# Requirements Document

## Introduction

This feature enhances the visualization capabilities of the DMV (Data Management and Visualization) platform — a Next.js 14 / React application for higher-education intelligence in Zambia. The enhancement spans three surfaces: the Executive Dashboard, the Main (National Overview) Dashboard, and the Indicators Engine page. It also introduces Nivo as a second charting library alongside Recharts 3.8 to cover chart types that Recharts handles poorly (radial/gauge, radar/spider), and establishes a cross-page click-to-filter / drill-down interactivity pattern backed by Zustand.

## Glossary

- **Executive Dashboard**: The `/dashboard/executive` page, restricted to SUPER_ADMIN, HEA_ADMIN, ANALYST, and MINISTRY_USER roles, showing high-level national KPIs.
- **Main Dashboard**: The `/dashboard` page (National Overview), accessible to all authenticated users, showing enrollment trends, regional share, student status, and cohort breakdowns.
- **Indicators Page**: The `/indicators` page (Indicator Engine), showing KPI definitions, summary cards, and a list of all indicators.
- **ChartWrapper**: The shared `src/components/Dashboard/ChartWrapper.tsx` component that defers chart rendering until client hydration and provides a stable height container.
- **Nivo**: The `@nivo` suite of React charting components, to be introduced as a second charting library for chart types Recharts handles poorly.
- **Recharts**: The existing `recharts` charting library (v3.8) already installed in the project.
- **Drill-down**: A user interaction where clicking a chart element (bar, pie slice, radar vertex) filters or highlights related data on the same page.
- **Filter Store**: A Zustand store that holds the active chart filter state (e.g., selected province, selected status) and exposes actions to set and clear filters.
- **TrendLineChart**: A new Recharts `LineChart` or `ComposedChart` component showing enrollment values over multiple years with a reference trend line.
- **YoYBarChart**: A new Recharts `BarChart` component showing year-over-year enrollment comparison between two consecutive years.
- **GraduationGauge**: A new Nivo `ResponsiveRadialBar` or equivalent radial/gauge component showing the national average graduation rate against a target.
- **ProvinceBreakdownChart**: A new Recharts or Nivo chart showing student enrollment distributed across provinces for the selected year.
- **GenderBreakdownChart**: A new Recharts `BarChart` or `PieChart` component showing student enrollment split by gender.
- **MultiIndicatorPanel**: A new Nivo `ResponsiveRadar` or Recharts `RadarChart` / grouped `BarChart` panel on the Indicators page for side-by-side KPI comparison.
- **RichTooltip**: An enhanced Recharts `<Tooltip>` custom content component that displays additional contextual fields (e.g., percentage share, YoY delta, target vs. actual) beyond the default label/value pair.

---

## Requirements

### Requirement 1 — Nivo Library Integration

**User Story:** As a frontend developer, I want Nivo installed and wrapped consistently so that chart types unavailable in Recharts can be used without introducing inconsistent rendering patterns.

#### Acceptance Criteria

1. THE Dashboard SHALL include `@nivo/core`, `@nivo/radial-bar`, and `@nivo/radar` as production dependencies in `package.json`.
2. WHEN a Nivo chart component is rendered on the client, THE ChartWrapper SHALL wrap the Nivo component identically to how it wraps Recharts components, deferring render until after hydration.
3. THE ChartWrapper SHALL accept an optional `library` prop of type `"recharts" | "nivo"` with a default value of `"recharts"`, and THE ChartWrapper SHALL apply the same height and width constraints regardless of the `library` value.
4. IF a Nivo chart is rendered during server-side rendering, THEN THE ChartWrapper SHALL render a loading spinner placeholder of the same dimensions instead of the chart.

---

### Requirement 2 — Executive Dashboard: Enrollment Trend Line Chart

**User Story:** As a ministry executive, I want to see enrollment numbers plotted over multiple years as a trend line so that I can identify growth or decline patterns at a glance.

#### Acceptance Criteria

1. WHEN the Executive Dashboard page loads with a valid API response, THE TrendLineChart SHALL render below the national summary cards and above the YoY comparison section.
2. THE TrendLineChart SHALL display enrollment data points for each available year returned by the `/analytics/executive/` endpoint, with the year on the X-axis and the enrollment count on the Y-axis.
3. THE TrendLineChart SHALL include a smooth monotone line with a filled gradient area beneath it, using the existing `#003580` primary colour token.
4. THE TrendLineChart SHALL display a RichTooltip on hover that shows the year, enrollment count, and the percentage change from the previous data point.
5. WHEN the year selector on the Executive Dashboard changes, THE TrendLineChart SHALL re-render with data scoped to the years up to and including the selected year.

---

### Requirement 3 — Executive Dashboard: Year-over-Year Comparison Bar Chart

**User Story:** As a ministry executive, I want a side-by-side bar chart comparing enrollment between the selected year and the prior year so that I can quantify annual growth without reading raw numbers.

#### Acceptance Criteria

1. WHEN the Executive Dashboard page loads with a valid API response containing YoY data, THE YoYBarChart SHALL render as a grouped `BarChart` with two bars per category: one for the prior year and one for the selected year.
2. THE YoYBarChart SHALL use distinct colours for the two year bars, drawn from the existing `CHART_COLORS` palette already defined in the project.
3. THE YoYBarChart SHALL display a RichTooltip on hover that shows the category name, the prior-year value, the selected-year value, and the absolute and percentage difference.
4. IF the API response does not contain YoY data, THEN THE YoYBarChart SHALL render an empty-state message reading "No year-over-year data available" within the chart container.

---

### Requirement 4 — Executive Dashboard: Graduation Rate Gauge

**User Story:** As a ministry executive, I want a radial gauge showing the national average graduation rate against the target so that I can assess performance at a glance.

#### Acceptance Criteria

1. WHEN the Executive Dashboard page loads with a valid API response containing `avg_graduation_rate`, THE GraduationGauge SHALL render using a Nivo `ResponsiveRadialBar` component inside a ChartWrapper.
2. THE GraduationGauge SHALL display the actual graduation rate as the filled arc and the remaining gap to 100% as an unfilled arc, using the `#17a2b8` teal colour token for the filled arc.
3. THE GraduationGauge SHALL display the numeric graduation rate value as a centred label inside the arc.
4. IF `avg_graduation_rate` is null or undefined in the API response, THEN THE GraduationGauge SHALL render a placeholder reading "Rate unavailable".

---

### Requirement 5 — Executive Dashboard: Province Breakdown Chart

**User Story:** As a ministry executive, I want a chart showing student enrollment distributed across provinces so that I can identify regional disparities.

#### Acceptance Criteria

1. WHEN the Executive Dashboard page loads with a valid API response, THE ProvinceBreakdownChart SHALL render as a horizontal `BarChart` using Recharts, with province names on the Y-axis and enrollment counts on the X-axis.
2. THE ProvinceBreakdownChart SHALL colour each province bar using the existing `CHART_COLORS` array, cycling through colours if the number of provinces exceeds the array length.
3. THE ProvinceBreakdownChart SHALL display a RichTooltip on hover that shows the province name, enrollment count, and percentage share of total national enrollment.
4. WHEN a province bar is clicked, THE ProvinceBreakdownChart SHALL dispatch a province filter action to the Filter Store, setting the active province to the clicked province name.

---

### Requirement 6 — Main Dashboard: Click-to-Filter Interactivity

**User Story:** As a data analyst, I want to click on chart elements to filter related data on the same page so that I can explore breakdowns without navigating away.

#### Acceptance Criteria

1. THE Dashboard SHALL include a Filter Store implemented with Zustand that holds `activeProvince: string | null` and `activeStatus: string | null`, and exposes `setProvince`, `setStatus`, and `clearFilters` actions.
2. WHEN a province bar in the Regional Share `BarChart` is clicked, THE Filter Store SHALL set `activeProvince` to the name of the clicked province.
3. WHEN a pie slice in the Student Status `PieChart` is clicked, THE Filter Store SHALL set `activeStatus` to the status code of the clicked slice.
4. WHILE `activeProvince` or `activeStatus` is set in the Filter Store, THE Main Dashboard SHALL display a dismissible filter chip above the chart grid showing the active filter label.
5. WHEN the filter chip close button is clicked, THE Filter Store SHALL call `clearFilters`, resetting both `activeProvince` and `activeStatus` to null.
6. WHILE `activeProvince` is set, THE Main Dashboard SHALL visually highlight the matching bar in the Regional Share chart by rendering non-matching bars at 30% opacity.
7. WHILE `activeStatus` is set, THE Main Dashboard SHALL visually highlight the matching slice in the Student Status chart by rendering non-matching slices at 30% opacity.

---

### Requirement 7 — Main Dashboard: Gender Breakdown Chart

**User Story:** As a data analyst, I want to see enrollment split by gender so that I can monitor gender parity in higher education.

#### Acceptance Criteria

1. WHEN the Main Dashboard loads with a valid API response containing gender breakdown data, THE GenderBreakdownChart SHALL render as a `BarChart` or `PieChart` using Recharts, placed in the chart grid after the existing Student Status donut.
2. THE GenderBreakdownChart SHALL display at minimum two categories: Male and Female, using distinct colours (`#003580` for Male, `#F37336` for Female).
3. WHERE a non-binary or other gender category is present in the API response, THE GenderBreakdownChart SHALL render an additional bar or slice for that category using the next available colour from `CHART_COLORS`.
4. THE GenderBreakdownChart SHALL display a RichTooltip on hover that shows the gender label, count, and percentage share of total enrollment.
5. IF the API response does not contain gender breakdown data, THEN THE GenderBreakdownChart SHALL not render and SHALL not leave an empty grid cell.

---

### Requirement 8 — Main Dashboard: Rich Tooltip Enhancement

**User Story:** As a data analyst, I want chart tooltips to show contextual details beyond just the raw value so that I can interpret data without cross-referencing other panels.

#### Acceptance Criteria

1. THE Dashboard SHALL include a reusable `RichTooltip` React component in `src/components/Dashboard/RichTooltip.tsx` that accepts a `label`, `value`, `unit`, and an optional `extras` array of `{ key: string; value: string }` objects.
2. WHEN a chart element is hovered, THE RichTooltip SHALL render with the same visual style as the existing `TOOLTIP_STYLE` constant (white background, 12px border-radius, `#dde4ed` border, `0 8px 24px rgba(0,53,128,0.1)` box-shadow).
3. THE RichTooltip SHALL render each item in the `extras` array as a secondary row below the primary value, using `text-muted-foreground` colour and a smaller font size.
4. THE existing Enrollment Trend `AreaChart` on the Main Dashboard SHALL use the RichTooltip to display year, enrollment count, and YoY delta as extras.
5. THE existing Regional Share `BarChart` on the Main Dashboard SHALL use the RichTooltip to display province name, HEI count, and percentage share as extras.

---

### Requirement 9 — Indicators Page: Multi-Indicator Comparison Panel

**User Story:** As an analyst, I want to compare multiple KPIs side-by-side in a single chart so that I can identify which indicators are above or below target simultaneously.

#### Acceptance Criteria

1. WHEN the Indicators page loads with two or more indicators in the summary list, THE MultiIndicatorPanel SHALL render above the indicator list as a collapsible panel with a toggle button labelled "Compare Indicators".
2. THE MultiIndicatorPanel SHALL default to collapsed state on initial page load.
3. WHEN the MultiIndicatorPanel is expanded, THE MultiIndicatorPanel SHALL render a Nivo `ResponsiveRadar` chart if five or more indicators are available, or a Recharts grouped `BarChart` if fewer than five indicators are available.
4. THE MultiIndicatorPanel SHALL allow the user to select up to six indicators from a multi-select control populated from the full indicators list.
5. WHEN fewer than two indicators are selected in the multi-select control, THE MultiIndicatorPanel SHALL display an inline message reading "Select at least 2 indicators to compare".
6. THE MultiIndicatorPanel SHALL normalise each indicator's value as a percentage of its `target_value` before plotting, so that indicators with different units are comparable on the same scale.
7. IF an indicator has no `target_value`, THEN THE MultiIndicatorPanel SHALL normalise that indicator's value as a percentage of the maximum value across all selected indicators.
8. THE MultiIndicatorPanel SHALL display a RichTooltip on hover that shows the indicator name, raw value, unit, target value, and normalised percentage.

---

### Requirement 10 — Shared: Consistent Animation

**User Story:** As a user, I want chart transitions to feel smooth and consistent across all dashboards so that the interface feels polished.

#### Acceptance Criteria

1. THE Dashboard SHALL apply Framer Motion `initial={{ opacity: 0, y: 16 }}` and `animate={{ opacity: 1, y: 0 }}` entrance animations to every new chart panel added by this feature, matching the animation pattern already used in the Main Dashboard.
2. WHEN chart data changes due to a year-selector change or filter action, THE affected charts SHALL re-animate using the same entrance animation with a duration of 400ms.
3. THE ChartWrapper SHALL accept an optional `animationDuration` prop of type `number` (milliseconds) with a default of `1200`, and SHALL pass this value to Recharts `animationDuration` props where applicable.
