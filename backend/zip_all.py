import shutil
import os

base_dir = r"c:\Users\Asus\Desktop\idea-stress\backend"
lambdas = ["excavator", "research", "adversary", "planner", "critic"]

for l in lambdas:
    folder_path = os.path.join(base_dir, l)
    zip_path = os.path.join(base_dir, f"{l}_payload")
    print(f"Zipping {l}...")
    shutil.make_archive(zip_path, 'zip', folder_path)

print("All Lambdas zipped successfully!")
