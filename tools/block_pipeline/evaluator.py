"""
evaluator.py — Evaluate TSX variant screenshots with Qwen2.5-VL.

Uses logit extraction (Yes vs No first token) to score how well each
variant implements its block specification.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Optional


# Lazy-loaded globals to avoid import cost when not needed
_model = None
_processor = None
_yes_id: Optional[int] = None
_no_id: Optional[int] = None
_model_id: str = ""


def _load_model(model_id: str = "Qwen/Qwen2.5-VL-3B-Instruct") -> None:
    global _model, _processor, _yes_id, _no_id, _model_id

    if _model is not None and _model_id == model_id:
        return  # already loaded

    print(f"  📦 Loading Qwen VL model: {model_id} (fp16, CUDA)...")
    import torch
    from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor

    _model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
        model_id,
        torch_dtype=torch.float16,
        device_map="cuda",
    )
    _model.eval()
    _processor = AutoProcessor.from_pretrained(model_id)

    # Find token IDs for "Yes" and "No"
    tokenizer = _processor.tokenizer
    yes_tokens = tokenizer.encode("Yes", add_special_tokens=False)
    no_tokens = tokenizer.encode("No", add_special_tokens=False)
    _yes_id = yes_tokens[0]
    _no_id = no_tokens[0]
    _model_id = model_id

    print(f"  ✅ Model loaded. Yes token id={_yes_id}, No token id={_no_id}")


def evaluate_screenshot(
    screenshot_path: Path,
    block_title: str,
    block_description: str,
    model_id: str = "Qwen/Qwen2.5-VL-3B-Instruct",
) -> dict:
    """
    Evaluate a screenshot against a block spec using Qwen2.5-VL.
    Returns dict with yes_logit, no_logit, yes_prob, no_prob.
    """
    import torch

    _load_model(model_id)

    if not screenshot_path.exists():
        return {
            "yes_logit": -999.0,
            "no_logit": 0.0,
            "yes_prob": 0.0,
            "no_prob": 1.0,
            "error": "screenshot_not_found",
        }

    from qwen_vl_utils import process_vision_info

    question = (
        f"Does this screenshot show a functional, visually complete implementation of "
        f"the '{block_title}' module? "
        f"The module should: {block_description}. "
        f"Answer with only 'Yes' or 'No'."
    )

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "image": str(screenshot_path.resolve()),
                },
                {
                    "type": "text",
                    "text": question,
                },
            ],
        }
    ]

    try:
        text_prompt = _processor.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = _processor(
            text=[text_prompt],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        )
        inputs = inputs.to("cuda")

        with torch.no_grad():
            outputs = _model.generate(
                **inputs,
                max_new_tokens=1,
                return_dict_in_generate=True,
                output_scores=True,
            )

        # scores[0] shape: [batch, vocab_size]
        scores = outputs.scores[0][0]  # [vocab_size]
        yes_logit = scores[_yes_id].item()
        no_logit = scores[_no_id].item()

        # Guard against NaN/inf logits (e.g. from corrupted screenshots)
        import math
        if not math.isfinite(yes_logit) or not math.isfinite(no_logit):
            return {
                "yes_logit": yes_logit,
                "no_logit": no_logit,
                "yes_prob": 0.0,
                "no_prob": 1.0,
                "error": f"non-finite logits: yes={yes_logit} no={no_logit}",
            }

        probs = torch.softmax(torch.tensor([yes_logit, no_logit]), dim=0)
        return {
            "yes_logit": yes_logit,
            "no_logit": no_logit,
            "yes_prob": probs[0].item(),
            "no_prob": probs[1].item(),
        }

    except Exception as e:
        return {
            "yes_logit": -999.0,
            "no_logit": 0.0,
            "yes_prob": 0.0,
            "no_prob": 1.0,
            "error": str(e),
        }
    finally:
        # Clear CUDA cache — tolerate errors from prior CUDA assertion failures
        try:
            torch.cuda.empty_cache()
        except Exception:
            pass


def evaluate_block_variants(
    block_index: int,
    block_title: str,
    block_description: str,
    variant_dirs: list[Path],
    model_id: str = "Qwen/Qwen2.5-VL-3B-Instruct",
    skip_if_exists: bool = True,
) -> tuple[int, list[dict]]:
    """
    Evaluate all variants for a block.
    Returns (best_variant_index, list_of_eval_results).
    """
    eval_results = []

    for j, variant_dir in enumerate(variant_dirs):
        eval_json_path = variant_dir / "eval.json"

        # Load cached result if available
        if skip_if_exists and eval_json_path.exists():
            result = json.loads(eval_json_path.read_text())
            print(f"    [block {block_index} variant {j}] Cached eval: yes_prob={result.get('yes_prob', 0):.3f}")
            eval_results.append(result)
            continue

        # Check if screenshot exists
        screenshot_path = variant_dir / "screenshot.png"
        render_json_path = variant_dir / "render.json"

        # If build failed, use zero score
        if render_json_path.exists():
            render_data = json.loads(render_json_path.read_text())
            if not render_data.get("build_success", False):
                result = {
                    "yes_logit": -999.0,
                    "no_logit": 0.0,
                    "yes_prob": 0.0,
                    "no_prob": 1.0,
                    "error": "build_failed",
                }
                eval_json_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
                eval_results.append(result)
                print(f"    [block {block_index} variant {j}] Build failed → yes_prob=0.0")
                continue

        print(f"    [block {block_index} variant {j}] Evaluating screenshot...")
        result = evaluate_screenshot(screenshot_path, block_title, block_description, model_id)
        eval_json_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        eval_results.append(result)
        print(f"    [block {block_index} variant {j}] yes_prob={result.get('yes_prob', 0):.3f}")

    if not eval_results:
        return 0, []

    # Find best variant by yes_prob
    best_idx = max(range(len(eval_results)), key=lambda i: eval_results[i].get("yes_prob", 0.0))
    return best_idx, eval_results


def unload_model() -> None:
    """Free GPU memory after all evaluations are done."""
    global _model, _processor
    import torch

    if _model is not None:
        del _model
        _model = None
    if _processor is not None:
        del _processor
        _processor = None
    torch.cuda.empty_cache()
    print("  🗑️  Qwen VL model unloaded from GPU.")
