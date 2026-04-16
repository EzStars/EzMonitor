---
name: thesis-image-workflow
description: Use this skill for thesis figure understanding and generation. It provides a structured workflow to analyze existing images, create publication-ready diagrams/charts, and output figure captions suitable for academic writing.
---

# Thesis Image Workflow

## When to use

Use this skill when the user asks to:
- explain the meaning of existing thesis images
- generate figures for thesis chapters
- create architecture diagrams, flowcharts, or metric charts
- produce figure captions and interpretation text for academic writing

## Goal

Build a repeatable image pipeline for thesis writing:
1. Understand existing figures
2. Generate new figures
3. Produce caption + interpretation text
4. Link each figure to chapter claims

## Inputs

- Chapter title and section ID (example: 4.2.1)
- Figure objective (what claim it should support)
- Figure type: `architecture` | `flowchart` | `sequence` | `line-chart` | `bar-chart` | `pie-chart` | `ui-snapshot-note`
- Data source or facts

## Workflow A: Understand existing images

1. Open local image files and identify:
- figure type
- main entities
- key relationships
- visible labels and values

2. Output in this format:
- Figure ID
- Figure title (proposed)
- Core message (1 sentence)
- Evidence points (3-5 bullets)
- Potential ambiguity or low-confidence parts

3. If image text is unclear:
- mark as `low-confidence`
- request manual confirmation for unclear labels

## Workflow B: Generate thesis figures

### B1. Architecture / flow diagrams

Prefer Mermaid source-first approach:
- write Mermaid text
- render and export PNG/SVG
- keep source in repo for reproducibility

Recommended style:
- clear layered structure
- left-to-right or top-to-bottom only
- no decorative icons unless meaningful
- include stable IDs for nodes

### B2. Data charts

Use Python + Matplotlib:
- deterministic colors and labels
- axis labels with units
- no 3D effects
- save to PNG (300 dpi if possible)

### B3. UI screenshots

If using existing screenshots:
- annotate key areas only
- add concise interpretation paragraph
- avoid heavy visual noise

## Output standard for each figure

For every generated or analyzed figure, output:

1. `Figure title`
2. `Figure file path`
3. `Chapter mapping` (which section uses it)
4. `Caption` (formal academic style)
5. `Interpretation` (what claim it proves)
6. `Limitations` (what it does NOT prove)

## Figure quality checklist

- Is the figure directly tied to a chapter claim?
- Are labels complete and terminology consistent?
- Is there a caption and interpretation?
- Is source data traceable?
- Is visual complexity appropriate for thesis review?

## Suggested file layout

- `毕业论文/04-doc解析输出/images/` for extracted images
- `毕业论文/04-doc解析输出/generated-figures/` for new figures
- `毕业论文/04-doc解析输出/figure-notes.md` for caption/interpretation records

## Constraints

- Do not fabricate quantitative values
- Keep terminology consistent across chapters
- If data is missing, produce a placeholder chart only with explicit `draft` label
- Prefer editable source (Mermaid or Python script) over binary-only outputs
