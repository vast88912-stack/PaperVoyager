import os
import json
import shutil
import subprocess

def get_scores(file_path):
    if not os.path.exists(file_path):
        return {}
    
    with open(file_path, 'r') as f:
        lines = f.readlines()
        
    headers = [h.strip() for h in lines[0].split('|')[1:-1]]
    scores = {}
    for line in lines:
        if 'codegen_final' in line:
            values = [v.strip() for v in line.split('|')[1:-1]]
            for i, header in enumerate(headers):
                if header != 'Metric' and header != 'Overall':
                    try:
                        scores[header] = float(values[i].replace('%', ''))
                    except ValueError:
                        scores[header] = 0.0
            break
    return scores

baseline_scores = get_scores('benchmark/generated/codegen_score_table.md')
papervoyager_scores = get_scores('benchmark/generated/codegen_score_table_papervoyager.md')
gemini3pro_scores = get_scores('benchmark/generated/codegen_score_table_gemini3pro.md')

topics = list(baseline_scores.keys())

gemini_rerun_topics = []

for topic in topics:
    b_score = baseline_scores.get(topic, 0.0)
    p_score = papervoyager_scores.get(topic, 0.0)
    g_score = gemini3pro_scores.get(topic, 0.0)
    
    max_score = max(b_score, p_score, g_score)
    
    slug = topic.lower().replace('_', '-')
    
    # Delete baseline if not max
    if b_score < max_score:
        for name in [topic, slug]:
            path = os.path.join('outputs/tsx', name)
            if os.path.exists(path):
                print(f"Deleting {path} (score {b_score} < {max_score})")
                shutil.rmtree(path)
                
    # Delete papervoyager if not max
    if p_score < max_score:
        for name in [topic, slug]:
            path = os.path.join('outputs/models/PaperVoyager/tsx', name)
            if os.path.exists(path):
                print(f"Deleting {path} (score {p_score} < {max_score})")
                shutil.rmtree(path)
                
    # Delete gemini3pro if not max
    if g_score < max_score:
        gemini_rerun_topics.append(topic)
        for name in [topic, slug]:
            path = os.path.join('outputs/models/gemini-3-pro/tsx', name)
            if os.path.exists(path):
                print(f"Deleting {path} (score {g_score} < {max_score})")
                shutil.rmtree(path)

print(f"Topics to re-run for Gemini 3 pro: {gemini_rerun_topics}")

if gemini_rerun_topics:
    only_arg = ','.join(gemini_rerun_topics)
    cmd = [
        'python', 'generate_apps.py',
        '--provider', 'gemini',
        '--model', 'gemini-3-pro-preview',
        '--workers', '10',
        '--only', only_arg,
        '--out-base', 'outputs/models/gemini-3-pro/tsx'
    ]
    print(f"Running: {' '.join(cmd)}")
    subprocess.Popen(cmd)
else:
    print("No topics to re-run for Gemini 3 pro.")

