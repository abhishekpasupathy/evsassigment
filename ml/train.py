"""Train a YOLO detector on a YOLO-format fire/smoke dataset.

Expected layout:
datasets/DFire/
  train/images, train/labels
  valid/images, valid/labels
  test/images, test/labels

Check the source dataset's class IDs and update data.yaml accordingly.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import yaml
from ultralytics import YOLO


def main():
    parser = argparse.ArgumentParser(description="Train ForestGuard fire/smoke detector")
    parser.add_argument("--data", default="ml/data.yaml", help="Dataset YAML")
    parser.add_argument("--model", default="yolo11n.pt", help="Pretrained YOLO checkpoint")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--device", default="", help="e.g. 0, cpu, or leave blank for auto")
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    data_path = Path(args.data).resolve()
    if not data_path.exists():
        raise SystemExit(f"Dataset config not found: {data_path}. Copy ml/data.yaml.example to ml/data.yaml.")
    config = yaml.safe_load(data_path.read_text())
    root = Path(config.get("path", "."))
    if not root.is_absolute():
        root = (data_path.parent / root).resolve()
    for split in ("train", "val"):
        split_path = Path(config[split])
        split_path = split_path if split_path.is_absolute() else root / split_path
        if not split_path.exists():
            raise SystemExit(f"Missing {split} images directory: {split_path}")
    model = YOLO(args.model)
    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device or None,
        workers=args.workers,
        project="ml/runs/detect",
        name="forestguard",
        patience=18,
        pretrained=True,
        cos_lr=True,
        close_mosaic=10,
        seed=42,
        deterministic=True,
        plots=True,
        save=True,
    )
    best = Path("ml/runs/detect/forestguard/weights/best.pt")
    if not best.exists():
        raise SystemExit("Training finished but best.pt was not found. Check the Ultralytics run directory.")
    print(f"Training complete. Best checkpoint: {best.resolve()}")
    print("Next: python ml/evaluate.py --weights ml/runs/detect/forestguard/weights/best.pt --data ml/data.yaml")


if __name__ == "__main__":
    main()
