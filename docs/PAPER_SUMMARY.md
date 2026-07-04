# Paper-Aligned Summary

This document keeps the repository language aligned with the paper:

**PaperVoyager: Building Interactive Web with Visual Language Models**  
arXiv:2603.22999v3, 30 May 2026

## Core Claim

PaperVoyager is a **Paper-to-Interactive-System Agent**. Given a research paper in PDF format, it transforms the static document into an executable interactive web system, called a WebPaper in this repository, that supports active exploration of the paper's mechanisms.

The repository should avoid describing PaperVoyager as only a summarizer, slide generator, static webpage generator, or generic paper-to-HTML tool. The intended contrast in the paper is:

- static artifacts: summaries, webpages, slides
- PaperVoyager output: executable interactive web systems with controls, state changes, simulations, or visualized mechanisms

## Method Pipeline

The paper describes the system as a multi-stage process:

1. **Mechanism Extraction**  
   Parse the input PDF into a mechanism-aware representation that preserves relevant text, figures, equations, pseudocode, and diagrams. Emphasize methodology, algorithms, system design, and experiments over peripheral related work.

2. **Structured Specification Generation**  
   Decide which mechanisms should be exposed through interaction. Produce a structured specification with interactive modules, user controls, and expected visual outputs.

3. **Block-Level Generation**  
   Decompose the app into self-contained modules and generate React/TypeScript candidates for each block.

4. **Candidate Filtering**  
   Build and render candidates, then use a vision-language model to score whether each candidate is visually complete and functionally aligned with the block specification.

5. **Block Merging**  
   Merge the selected best blocks into a single interactive web application with a consistent layout.

## Benchmark

The benchmark contains 19 topic-conditioned web tasks across:

- Algorithms
- Data Structures
- Distributed Systems
- Mathematics
- Machine Learning
- Physics
- Systems

Each task is paired with an expert-authored interactive system used as a ground-truth functional reference.

## Evaluation

The paper uses two complementary evaluation branches:

- **Checklist Matching Evaluation:** measures whether expected modules and interactions are present.
- **Interactive Exploration Evaluation:** uses browser interaction and screenshot comparison to test whether controls produce meaningful visible changes.

The paper reports final scores using a 60% checklist and 40% interaction weighting.

## Reported Main Result

The paper reports that PaperVoyager achieves the best average task success rate on the benchmark, with an overall score of **80.7%** under the combined evaluation protocol.

