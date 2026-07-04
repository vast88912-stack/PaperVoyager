你将评估一个站点的“代码生成质量”。请基于提供的 **prompt_spec / site_probe / modules / screenshots** 做判定并打分。

### Site
site_id: {{SITE_ID}}

### Prompt Spec (authoritative expectation)
{{PROMPT_SPEC_TEXT}}

### Site Probe (auto-discovered modules)
{{SITE_PROBE_JSON}}

### Module Probe (one per module, may be truncated)
{{MODULE_PROBES_JSON}}

### Evidence (Screenshots)
- 提供的是每个模块的若干关键截图（按模块分组、按时间顺序）。你会在图片序列中看到模块分组分隔符文本。

请输出严格 JSON，字段必须符合 schema。






