"""Run local inference on one image or a folder."""
import argparse
from ultralytics import YOLO


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--weights", default="ml/runs/detect/forestguard/weights/best.pt")
    p.add_argument("--source", required=True, help="Image path, video path or folder")
    p.add_argument("--conf", type=float, default=0.25)
    p.add_argument("--save", action="store_true")
    args = p.parse_args()
    model = YOLO(args.weights)
    model.predict(source=args.source, conf=args.conf, imgsz=640, save=args.save, show=False)


if __name__ == "__main__":
    main()
