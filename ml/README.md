# ForestGuard ML — Fire and Smoke Detection

This module trains an object detector, not the old browser colour heuristic. It uses Ultralytics YOLO and expects bounding-box annotations in YOLO format.

## Dataset

Recommended starting point: **D-Fire** (more than 21,000 images, fire/smoke bounding boxes and a no-fire category). Dataset page and download instructions: https://github.com/gaia-solutions-on-demand/DFireDataset

D-Fire publishes dataset splits and labels. Download the dataset yourself and read its current licence/attribution terms before use. Do not commit the dataset or model weights to this repository.

Expected layout:

```
datasets/DFire/
  train/images/  train/labels/
  valid/images/  valid/labels/
  test/images/   test/labels/
```

1. Create a Python virtual environment.
2. Install `pip install -r ml/requirements.txt`.
3. Copy `ml/data.yaml.example` to `ml/data.yaml`.
4. Set `path` and split directories to match your extracted dataset.
5. **Verify class IDs.** The example uses class 0=smoke and 1=fire. If your downloaded labels use another order, correct the names to match the actual numeric IDs. Do not guess.
6. Run training:

```bash
python ml/train.py --data ml/data.yaml --epochs 80 --imgsz 640 --batch 8
```

For a machine without a GPU, use `--device cpu --batch 2` (training will be much slower). The best checkpoint is written to `ml/runs/detect/forestguard/weights/best.pt`.

## Evaluate and predict

```bash
python ml/evaluate.py --weights ml/runs/detect/forestguard/weights/best.pt --data ml/data.yaml
python ml/predict.py --weights ml/runs/detect/forestguard/weights/best.pt --source path/to/test-image.jpg --save
```

Use the held-out test split for final reporting. Report precision, recall, mAP50 and mAP50-95; inspect false negatives and false positives. Split by video/camera/location where possible to reduce near-duplicate leakage. Do not report training metrics as test performance.

## Important

A model trained on public images is a research baseline, not a certified wildfire alarm. It may fail on local vegetation, haze, night scenes, distant smoke and unusual weather. Collect and label geographically diverse local validation data before making claims about performance in India. Never use a negative prediction as proof that a forest is safe.
