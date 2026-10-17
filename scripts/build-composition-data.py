"""Aggregate saved evaluations only; never starts inference or modifies traces."""
import argparse
import csv
import hashlib
import json
from pathlib import Path


def counts(rows):
    assert len(rows) == 2000 and all(len(r) == 8 for r in rows)
    assert all(v in (0, 1) for row in rows for v in row)
    return [int(sum(r)) for r in rows]


def metrics(values):
    return {"pass1": sum(values) / len(values) / 8 * 100,
            "pass8": sum(v > 0 for v in values) / len(values) * 100}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("analysis", type=Path)
    parser.add_argument("luna_run", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    path = args.analysis / "plot_data.json"
    data = json.loads(path.read_text())
    old = json.loads((root / "src/writing/improving-vlms/chart-data.json").read_text())
    intervals = {}
    with (args.analysis / "confidence_intervals.csv").open() as f:
        for row in csv.DictReader(f):
            intervals[row["series"], int(row["point"])] = row

    def ci(row, series, point, key):
        interval = intervals.get((series, point))
        if interval:
            assert abs(row[key] / 100 - float(interval["mean"])) < 1e-8
            row[key + "Error"] = [row[key] - float(interval["low"]) * 100,
                                   float(interval["high"]) * 100 - row[key]]
        return row

    overall = []
    for i, (model, rows) in enumerate(data["null"].items()):
        row = dict(model=model, **metrics(counts(rows)))
        for key in ("pass1", "pass8"):
            ci(row, "scaling_" + key, i, key)
        overall.append(row)
    for row, original in zip(overall, old["overall"]):
        assert row["model"] == original["model"]
        assert all(abs(row[k] - original[k]) < 1e-8 for k in ("pass1", "pass8"))

    qwen = []
    for model, rows in data["harness"].items():
        baseline, harness = counts(data["null"][model]), counts(rows)
        qwen.append({"model": model,
                     "metrics": [{"metric": k.replace("pass", "Pass@"),
                                  "null": metrics(baseline)[k], "codex": metrics(harness)[k]}
                                 for k in ("pass1", "pass8")],
                     "histogram": [{"successes": i, "null": baseline.count(i), "codex": harness.count(i)} for i in range(9)],
                     "gained": sum(n == 0 and h > 0 for n, h in zip(baseline, harness)),
                     "lost": sum(n > 0 and h == 0 for n, h in zip(baseline, harness))})

    # Pair by explicit task IDs, not by position in a concatenated report.
    arms, matched = {}, {}
    for arm in data["luna"]["arms"]:
        h, e = arm["harness"], arm["effort"]
        keyed = {}
        for summary in sorted((args.luna_run / "arms" / f"{h}_{e}" / "shards").glob("*/summary.json")):
            s = json.loads(summary.read_text())
            assert len(s["task_ids"]) == len(s["per_question_rewards"])
            for idx, rewards in zip(s["task_ids"], s["per_question_rewards"]):
                assert idx not in keyed
                keyed[idx] = rewards
        assert set(keyed) == set(range(2000))
        values = counts([keyed[i] for i in range(2000)])
        assert sorted(values) == sorted(counts(arm["per_question_rewards"]))
        measured = metrics(values)
        assert abs(measured["pass1"] - arm["pass_at_1"] * 100) < 1e-8
        assert abs(measured["pass8"] - arm["pass_at_8"] * 100) < 1e-8
        matched[h, e] = values
        arms[h, e] = arm

    efforts, rescued, behavior = [], [], []
    for i, effort in enumerate(data["luna"]["efforts"]):
        row = {"effort": effort}
        for h in ("null", "codex"):
            arm = arms[h, effort]
            for k in (1, 8):
                key = f"{h}Pass{k}"
                row[key] = arm[f"pass_at_{k}"] * 100
                ci(row, f"luna_{h}_pass{k}", i, key)
        row.update(delta1=row["codexPass1"] - row["nullPass1"], delta8=row["codexPass8"] - row["nullPass8"])
        efforts.append(row)
        n, h = matched["null", effort], matched["codex", effort]
        previously_zero = [b for a, b in zip(n, h) if a == 0]
        rescued.append({"effort": effort, "total": len(previously_zero),
                        "gained": sum(v > 0 for v in previously_zero),
                        "lost": sum(a > 0 and b == 0 for a, b in zip(n, h)),
                        "values": [{"successes": j, "count": previously_zero.count(j)} for j in range(9)]})
        arm = arms["codex", effort]
        behavior.append({"effort": effort, "output": arm["output_tokens"] / arm["rollouts"],
                         "toolRate": arm["tool_rate"] * 100, "modelCalls": arm["mean_calls"]})

    output = {"provenance": {"generated": data["generated_utc"], "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                              "questions": 2000, "rollouts_per_question": 8,
                              "harness": "execution-prompt Codex-based harness; not the historical full-prompt run",
                              "luna_pairing": "explicit task_ids from each saved shard summary",
                              "confidence": "95% question-bootstrap intervals from the saved analysis"},
              "overall": overall, "categories": old["categories"], "qwen": qwen,
              "efforts": efforts, "rescued": rescued, "behavior": behavior}
    destination = root / "src/writing/visual-composition/chart-data.json"
    destination.write_text(json.dumps(output, indent=2) + "\n")
    print(f"Validated 2000 x 8 outcomes per arm; wrote {destination}")
    print(json.dumps({"qwen": qwen, "efforts": efforts}, indent=2))


if __name__ == "__main__":
    main()
