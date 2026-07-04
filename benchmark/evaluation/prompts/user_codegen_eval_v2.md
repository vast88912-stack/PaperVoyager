你将评估一个站点的"代码生成质量"，重点关注「视觉品质」和「真实可用性」。请基于提供的 **prompt_spec / site_probe / modules / screenshots** 做判定并打分。

评分提醒：
- 截图中未看到图表/动画/交互效果 = 视为不存在，不加分
- 控件存在但操作无可见变化 = interactivity 上限 0.3
- Coming Soon / placeholder 文字 = 该模块得 0
- 视觉或可用性任一严重不足 = 总分随短板拉低

### Site
site_id: {{SITE_ID}}

### Prompt Spec (authoritative expectation)
{{PROMPT_SPEC_TEXT}}

### Site Probe (auto-discovered modules)
{{SITE_PROBE_JSON}}

### Module Probe (one per module, may be truncated)
{{MODULE_PROBES_JSON}}

### Evidence (Screenshots)
- 提供的是每个模块的若干关键截图（按模块分组、按时间顺序）。
- 直接根据截图视觉判断 visual_quality（配色、排版、动画/图表丰富度）。
- 对比前后截图判断 interactivity（控件操作是否产生可见变化）。

请输出严格 JSON，字段必须符合 schema（site_id, passed, score_0_1, confidence_0_1, failure_reasons_topk, rubric, modules, explanation_short, recommended_fix）。
