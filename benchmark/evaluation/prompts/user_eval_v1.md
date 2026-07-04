你将评估一条任务是否完成。请基于提供的 **task / judge / trajectory / observations / screenshots** 做判定。\n
\n
### Task\n
{{TASK_JSON}}\n
\n
### Judge Rule (authoritative)\n
{{JUDGE_JSON}}\n
\n
### Trajectory (JSONL, may be truncated)\n
{{TRAJ_JSONL}}\n
\n
### Observations\n
{{OBS_JSON}}\n
\n
### Evidence (Screenshots)\n
- 提供的是最后 {{LAST_K}} 张截图（按时间顺序）。\n
\n
请输出严格 JSON，字段必须符合 schema。\n





