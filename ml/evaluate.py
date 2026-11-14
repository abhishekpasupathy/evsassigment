"""Evaluate the trained detector on the held-out test split."""
import argparse
from ultralytics import YOLO


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--weights", default="ml/runs/detect/forestguard/weights/best.pt")
    p.add_argument("--data", default="ml/data.yaml")
    p.add_argument("--imgsz", type=int, default=640)
    args = p.parse_args()
    model = YOLO(args.weights)
    metrics = model.val(data=args.data, split="test", imgsz=args.imgsz, plots=True, project="ml/runs/val", name="forestguard-test")
    print("mAP50:", float(metrics.box.map50))
    print("mAP50-95:", float(metrics.box.map))
    print("Precision:", float(metrics.box.mp))
    print("Recall:", float(metrics.box.mr))


if __name__ == "__main__":
    main()
