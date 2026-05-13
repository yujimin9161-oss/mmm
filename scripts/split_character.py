import os
from PIL import Image

def split_and_remove_bg(image_path, output_dir):
    # 1. 이미지 열기
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    
    # 10개로 분할 (가로 기준)
    cell_width = width // 10
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for i in range(10):
        left = i * cell_width
        right = (i + 1) * cell_width
        # 각 캐릭터 영역 크롭
        char_img = img.crop((left, 0, right, height))
        
        # 2. 배경 투명화 처리 (흰색 계열을 투명하게)
        datas = char_img.getdata()
        newData = []
        for item in datas:
            # RGB 값이 모두 240 이상이면 흰색 배경으로 간주하고 투명화
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
        char_img.putdata(newData)
        
        # 3. 저장 (stage1.png ~ stage10.png)
        char_img.save(f"{output_dir}/stage{i+1}.png", "PNG")
        print(f"✅ stage{i+1}.png 생성 완료")

# 실행 (이미지 파일 경로를 확인하세요)
split_and_remove_bg('../assets/images/Gemini_Generated_Image_dmag05dmag05dmag (1).png', '../assets/images')