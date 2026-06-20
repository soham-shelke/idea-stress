import os
import shutil

base_dir = r"c:\Users\Asus\Desktop\idea-stress\backend"
excavator_dir = os.path.join(base_dir, "excavator")
gate_status_dir = os.path.join(base_dir, "gate-status")
resume_gate_dir = os.path.join(base_dir, "resume-gate")
research_dir = os.path.join(base_dir, "research")

build_gate_status = os.path.join(base_dir, "build_gate_status")
build_resume_gate = os.path.join(base_dir, "build_resume_gate")
build_research = os.path.join(base_dir, "build_research")

def build_lambda(source_lambda_dir, build_dir, zip_name):
    print(f"Building {zip_name}...")
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
        
    # Copy all Linux dependencies from excavator
    shutil.copytree(excavator_dir, build_dir)
    
    # Overwrite the lambda_function.py with the correct one
    src_py = os.path.join(source_lambda_dir, "lambda_function.py")
    dst_py = os.path.join(build_dir, "lambda_function.py")
    shutil.copy2(src_py, dst_py)
    
    # Remove any old zip
    zip_path = os.path.join(base_dir, zip_name)
    if os.path.exists(zip_path + ".zip"):
        os.remove(zip_path + ".zip")
        
    # Zip it up!
    shutil.make_archive(zip_path, 'zip', build_dir)
    print(f"Successfully created {zip_name}.zip")

try:
    build_lambda(gate_status_dir, build_gate_status, "gate-status_payload")
    build_lambda(resume_gate_dir, build_resume_gate, "resume-gate_payload")
    build_lambda(research_dir, build_research, "research_payload")
    print("Done!")
except Exception as e:
    print(f"Error: {e}")
