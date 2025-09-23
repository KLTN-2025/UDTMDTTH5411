import torch
from torchvision import transforms
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from PIL import Image
from typing import List, Tuple, Optional


class DetectionBox:
    def __init__(self, box: Tuple[int, int, int, int], score: float, label: int):
        self.box = box  # (xmin, ymin, xmax, ymax)
        self.score = score
        self.label = label


class FashionObjectDetector:
    """
    Detector đơn giản dùng Faster R-CNN (COCO) để tìm các đối tượng liên quan
    và chọn bbox lớn nhất KHÔNG phải 'person' làm vùng sản phẩm.
    """

    COCO_PERSON_CLASS_ID = 1

    def __init__(self, device: Optional[str] = None, min_confidence: float = 0.5):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.min_confidence = float(min_confidence)
        self.model = fasterrcnn_resnet50_fpn(weights="DEFAULT").to(self.device)
        self.model.eval()
        self.to_tensor = transforms.ToTensor()

    @torch.no_grad()
    def detect(self, image: Image.Image) -> List[DetectionBox]:
        tensor = self.to_tensor(image).to(self.device)
        outputs = self.model([tensor])[0]

        boxes = outputs.get("boxes", [])
        scores = outputs.get("scores", [])
        labels = outputs.get("labels", [])

        result: List[DetectionBox] = []
        for i in range(len(boxes)):
            score = float(scores[i].item())
            if score < self.min_confidence:
                continue
            box_tensor = boxes[i].to("cpu").numpy()
            xmin, ymin, xmax, ymax = [int(v) for v in box_tensor.tolist()]
            label = int(labels[i].item())
            result.append(DetectionBox((xmin, ymin, xmax, ymax), score, label))
        return result

    @staticmethod
    def choose_product_box(
        image_size: Tuple[int, int], boxes: List[DetectionBox]
    ) -> Optional[Tuple[int, int, int, int]]:
        """
        Chọn bbox lớn nhất không phải person. Nếu không có, trả None.
        """
        width, height = image_size
        best_area = 0
        best_box: Optional[Tuple[int, int, int, int]] = None
        for b in boxes:
            if b.label == FashionObjectDetector.COCO_PERSON_CLASS_ID:
                continue
            x1, y1, x2, y2 = b.box
            x1 = max(0, min(x1, width - 1))
            y1 = max(0, min(y1, height - 1))
            x2 = max(0, min(x2, width - 1))
            y2 = max(0, min(y2, height - 1))
            area = max(0, x2 - x1) * max(0, y2 - y1)
            if area > best_area:
                best_area = area
                best_box = (x1, y1, x2, y2)
        return best_box

    @staticmethod
    def apply_padding(
        image_size: Tuple[int, int], box: Tuple[int, int, int, int], padding_ratio: float
    ) -> Tuple[int, int, int, int]:
        width, height = image_size
        x1, y1, x2, y2 = box
        w = x2 - x1
        h = y2 - y1
        pad_w = int(w * padding_ratio)
        pad_h = int(h * padding_ratio)
        nx1 = max(0, x1 - pad_w)
        ny1 = max(0, y1 - pad_h)
        nx2 = min(width - 1, x2 + pad_w)
        ny2 = min(height - 1, y2 + pad_h)
        return nx1, ny1, nx2, ny2