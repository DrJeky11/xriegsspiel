#!/usr/bin/env python3
"""Small supervised hint selector; synthetic teacher imitation, not validated pedagogy."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import sys
import time

# Avoid consuming all cores for a small matrix workload. Set before importing NumPy.
os.environ.setdefault('OPENBLAS_NUM_THREADS', '2')
import numpy as np


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_split(directory, split, manifest):
    path = directory / f'{split}.jsonl'
    assert digest(path) == manifest['dataFiles'][path.name], f'Hash mismatch: {path}'
    rows = [json.loads(line) for line in path.read_text().splitlines() if line]
    x = np.array([r['features'] for r in rows], dtype=np.float64)
    mask = np.array([r['mask'] for r in rows], dtype=bool)
    y = np.array([r['target'] for r in rows], dtype=np.int64)
    assert x.shape == (len(rows), len(manifest['features'])) and np.isfinite(x).all()
    assert ((x >= 0) & (x <= 1)).all() and mask.shape == (len(rows), len(manifest['lessons']))
    assert mask[np.arange(len(rows)), y].all()
    return rows, x, mask, y


def forward(x, mask, weights):
    w1, b1, w2, b2 = weights
    h = np.tanh(x @ w1 + b1)
    logits = h @ w2 + b2
    logits = np.where(mask, logits, -1e9)
    exp = np.exp(logits - logits.max(axis=1, keepdims=True))
    return h, exp / exp.sum(axis=1, keepdims=True), logits


def metrics(x, mask, y, weights, classes):
    _, p, _ = forward(x, mask, weights)
    pred = p.argmax(axis=1)
    return {'accuracy': float((pred == y).mean()),
            'loss': float(-np.log(np.maximum(p[np.arange(len(y)), y], 1e-12)).mean()),
            'perLessonRecall': {name: float((pred[y == i] == i).mean()) if (y == i).any() else None for i, name in enumerate(classes)}}


def gradients(x, mask, y, weights):
    h, p, _ = forward(x, mask, weights)
    p[np.arange(len(y)), y] -= 1
    p /= len(y)
    dh = (p @ weights[2].T) * (1 - h * h)
    return [x.T @ dh, dh.sum(axis=0), h.T @ p, p.sum(axis=0)]


def gradient_check():
    rng = np.random.default_rng(23)
    x = rng.random((5, 4)); mask = np.ones((5, 3), bool); mask[0, 1] = False
    y = np.array([0, 1, 2, 0, 2])
    weights = [rng.normal(0, .1, (4, 6)), np.zeros(6), rng.normal(0, .1, (6, 3)), np.zeros(3)]
    grads = gradients(x, mask, y, weights)
    worst = 0.
    for wi, index in [(0, (2, 4)), (1, (3,)), (2, (4, 1)), (3, (2,))]:
        old = weights[wi][index]
        weights[wi][index] = old + 1e-5; plus = metrics(x, mask, y, weights, ['a','b','c'])['loss']
        weights[wi][index] = old - 1e-5; minus = metrics(x, mask, y, weights, ['a','b','c'])['loss']
        weights[wi][index] = old
        worst = max(worst, abs((plus - minus) / 2e-5 - grads[wi][index]))
    assert worst < 1e-7, f'Gradient check failed: {worst}'
    return worst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='output/guided-policy-v1/data')
    ap.add_argument('--output', default='output/guided-policy-v1/training')
    ap.add_argument('--epochs', type=int, default=140)
    ap.add_argument('--hidden', type=int, default=48)
    args = ap.parse_args()
    if not 1 <= args.epochs <= 1000 or not 4 <= args.hidden <= 256:
        ap.error('epochs: 1–1000; hidden: 4–256')
    directory = Path(args.data); out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
    manifest_path = directory / 'manifest.json'; manifest = json.loads(manifest_path.read_text())
    assert manifest['schema'] == 'guided-exercise-dataset/1'
    classes = manifest['lessons']
    train_rows, x, mask, y = load_split(directory, 'train', manifest)
    val_rows, vx, vm, vy = load_split(directory, 'validation', manifest)
    assert not {r['group'] for r in train_rows} & {r['group'] for r in val_rows}
    grad_error = gradient_check()
    candidates = []; started = time.perf_counter()
    for seed in [42, 137, 2026]:
        rng = np.random.default_rng(seed)
        weights = [rng.normal(0, np.sqrt(2/(x.shape[1]+args.hidden)), (x.shape[1], args.hidden)), np.zeros(args.hidden),
                   rng.normal(0, np.sqrt(2/(args.hidden+len(classes))), (args.hidden, len(classes))), np.zeros(len(classes))]
        first = metrics(vx, vm, vy, weights, classes)
        momentum = [np.zeros_like(w) for w in weights]; variance = [np.zeros_like(w) for w in weights]
        best_loss = float('inf'); best = None; best_epoch = 0; steps = 0; trace = []
        for epoch in range(1, args.epochs + 1):
            order = rng.permutation(len(x))
            for start in range(0, len(x), 256):
                ix = order[start:start+256]
                grads = gradients(x[ix], mask[ix], y[ix], weights)
                steps += 1
                for i, grad in enumerate(grads):
                    momentum[i] = .9 * momentum[i] + .1 * grad
                    variance[i] = .999 * variance[i] + .001 * grad * grad
                    weights[i] -= .003 * (momentum[i] / (1-.9**steps)) / (np.sqrt(variance[i] / (1-.999**steps)) + 1e-8)
            current = metrics(vx, vm, vy, weights, classes)
            if current['loss'] < best_loss - 1e-6:
                best_loss = current['loss']; best_epoch = epoch; best = [w.copy() for w in weights]
            if epoch % 10 == 0:
                trace.append({'epoch': epoch, **current})
                print(f'seed={seed} epoch={epoch} validation agreement={current["accuracy"]:.4f} loss={current["loss"]:.4f}', flush=True)
            if epoch - best_epoch >= 20: break
        assert best is not None and all(np.isfinite(w).all() for w in best)
        candidate = {'seed': seed, 'bestEpoch': best_epoch, 'epochsRun': epoch, 'updates': steps,
                     'initialValidation': first, 'validation': metrics(vx, vm, vy, best, classes), 'trace': trace}
        np.savez(out / f'seed-{seed}.npz', w1=best[0], b1=best[1], w2=best[2], b2=best[3])
        candidates.append((candidate, best))
    selected, weights = min(candidates, key=lambda item: item[0]['validation']['loss'])
    # The test partition is first loaded AFTER seed/checkpoint selection is frozen.
    test_rows, tx, tm, ty = load_split(directory, 'test', manifest)
    for a, b in [(train_rows, test_rows), (val_rows, test_rows)]:
        assert not {r['group'] for r in a} & {r['group'] for r in b}
    # Require exact input disjointness across every partition.
    keys = lambda rows: {json.dumps([r['features'], r['mask']], separators=(',', ':')) for r in rows}
    a, b, c = keys(train_rows), keys(val_rows), keys(test_rows)
    assert not a & b and not a & c and not b & c
    test = metrics(tx, tm, ty, weights, classes)
    majority = np.bincount(y, minlength=len(classes)).argsort()[::-1]
    baseline = np.array([next(i for i in majority if m[i]) for m in tm])
    _, probs, logits = forward(tx, tm, weights); predictions = probs.argmax(axis=1)
    test['majorityApplicableBaseline'] = float((baseline == ty).mean())
    target_scores = np.array([r['teacherScores'] for r in test_rows])
    test['meanTeacherScoreRegret'] = float((target_scores.max(axis=1)-target_scores[np.arange(len(test_rows)), predictions]).mean())
    model = {'schema': 'guided-exercise-mlp/1', 'version': 'guided-spr-h01/0.1.0',
             'featureSchema': manifest['featureSchema'], 'features': manifest['features'], 'lessons': classes,
             'scenarioId': manifest['scenarioId'], 'scenarioVersion': manifest['scenarioVersion'], 'rulesVersion': manifest['rulesVersion'],
             'weights': dict(zip(['w1','b1','w2','b2'], [w.tolist() for w in weights])),
             'provenance': {'manifestSHA256': digest(manifest_path), 'teacherVersion': manifest['teacherVersion'],
                            'labelStatus': manifest['labelStatus'], 'trainingSeed': selected['seed'], 'epoch': selected['bestEpoch'],
                            'trainerSHA256': digest(__file__), 'selection': 'Lowest validation loss; final test not used for selection.'}}
    (out/'model.json').write_text(json.dumps(model, separators=(',', ':'), allow_nan=False)+'\n')
    # Reload the portable JSON model and demand identical decisions.
    reloaded = json.loads((out/'model.json').read_text())
    rw = [np.array(reloaded['weights'][k]) for k in ['w1','b1','w2','b2']]
    assert np.array_equal(forward(tx, tm, rw)[1].argmax(axis=1), predictions)
    (out/'test-predictions.jsonl').write_text('\n'.join(json.dumps({'id': row['id'], 'prediction': int(predictions[i]),
        'logits': logits[i].tolist()}) for i, row in enumerate(test_rows))+'\n')
    confusion = np.zeros((len(classes),len(classes)), dtype=int)
    for actual, pred in zip(ty,predictions): confusion[actual,pred] += 1
    report = {'schema': 'guided-policy-training-report/1', 'modelVersion': model['version'],
              'datasetSHA256': digest(manifest_path), 'modelSHA256': digest(out/'model.json'), 'trainerSHA256': digest(__file__),
              'architecture': {'input': x.shape[1], 'hidden': args.hidden, 'output': len(classes), 'activation': 'tanh',
                               'parameters': sum(w.size for w in weights), 'optimizer': 'Adam', 'learningRate': .003, 'batchSize': 256},
              'runtime': {'python': sys.version, 'numpy': np.__version__, 'platform': platform.platform(), 'machine': platform.machine(),
                          'device': 'CPU', 'openblasThreads': os.environ['OPENBLAS_NUM_THREADS']},
              'gradientCheckMaxError': grad_error, 'candidates': [item[0] for item in candidates], 'selectedSeed': selected['seed'],
              'selectedEpoch': selected['bestEpoch'], 'train': metrics(x, mask, y, weights, classes), 'test': test,
              'testConfusionRowsActualColumnsPredicted': confusion.tolist(), 'elapsedSeconds': time.perf_counter()-started,
              'interpretation': 'Agreement with an authored synthetic teaching proxy. No instructor labels or evidence of human learning benefit.',
              'humanEvaluators': ['owner', 'instructor'], 'humanEvaluationStatus': 'pending'}
    (out/'report.json').write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
    print(json.dumps({'selectedSeed': selected['seed'], 'test': test, 'elapsedSeconds': report['elapsedSeconds'], 'model': str(out/'model.json')}, indent=2))


if __name__ == '__main__':
    main()
