#!/usr/bin/env python3
"""
Image Optimization Script for Portfolio
Compresses images, converts to WebP, and creates responsive versions
"""

import os
import subprocess
import shutil
from pathlib import Path
import json

class ImageOptimizer:
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir)
        self.optimized_dir = self.base_dir / "public" / "optimized"
        self.stats = {
            "original_size": 0,
            "optimized_size": 0,
            "files_processed": 0,
            "webp_created": 0
        }
        
    def create_directories(self):
        """Create optimized image directories"""
        directories = [
            self.optimized_dir / "images",
            self.optimized_dir / "achievements" / "eneda",
            self.optimized_dir / "achievements" / "excalicode", 
            self.optimized_dir / "achievements" / "GP"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            
    def get_file_size(self, file_path):
        """Get file size in bytes"""
        return os.path.getsize(file_path)
        
    def optimize_image(self, input_path, output_path, quality=85, max_width=None):
        """Optimize image using ImageMagick"""
        cmd = [
            "magick", str(input_path),
            "-strip",  # Remove metadata
            "-interlace", "Plane",  # Progressive JPEG
            "-quality", str(quality),
        ]
        
        if max_width:
            cmd.extend(["-resize", f"{max_width}>"])  # Only resize if larger
            
        cmd.append(str(output_path))
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Error optimizing {input_path}: {e}")
            return False
            
    def create_webp(self, input_path, output_path, quality=85):
        """Convert image to WebP format"""
        cmd = [
            "cwebp",
            "-q", str(quality),
            "-m", "6",  # Maximum compression effort
            str(input_path),
            "-o", str(output_path)
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Error creating WebP {output_path}: {e}")
            return False
            
    def create_responsive_variants(self, input_path, output_dir, base_name):
        """Create multiple sizes for responsive images"""
        sizes = {
            "small": 400,
            "medium": 800,  
            "large": 1200,
            "original": None
        }
        
        variants = {}
        
        for size_name, width in sizes.items():
            # Create optimized JPEG/PNG
            ext = input_path.suffix
            output_path = output_dir / f"{base_name}-{size_name}{ext}"
            
            if self.optimize_image(input_path, output_path, quality=85, max_width=width):
                variants[f"{size_name}{ext}"] = self.get_file_size(output_path)
                
                # Create WebP version
                webp_path = output_dir / f"{base_name}-{size_name}.webp"
                if self.create_webp(output_path, webp_path, quality=85):
                    variants[f"{size_name}.webp"] = self.get_file_size(webp_path)
                    self.stats["webp_created"] += 1
                    
        return variants
        
    def optimize_avatar_images(self):
        """Optimize profile/avatar images with special handling"""
        print("🖼️  Optimizing avatar images...")
        
        avatar_path = self.base_dir / "public" / "images" / "my-avatar.png"
        if avatar_path.exists():
            print(f"   Processing avatar: {avatar_path.name} ({self.get_file_size(avatar_path) / 1024 / 1024:.1f}MB)")
            
            original_size = self.get_file_size(avatar_path)
            self.stats["original_size"] += original_size
            
            # Create avatar in multiple sizes
            output_dir = self.optimized_dir / "images"
            variants = self.create_responsive_variants(avatar_path, output_dir, "my-avatar")
            
            # Create a small optimized version for sidebar
            small_path = output_dir / "my-avatar-small.png" 
            if self.optimize_image(avatar_path, small_path, quality=90, max_width=150):
                print(f"   ✅ Created small avatar: {self.get_file_size(small_path) / 1024:.1f}KB")
                
            self.stats["files_processed"] += 1
            
    def optimize_organization_images(self):
        """Optimize organization logo images"""
        print("🏢 Optimizing organization images...")
        
        org_images = [
            "GDSC.png", "AWS.jpg", "MMSC.jpg", "TPG.jpg", "JBECP.jpg"
        ]
        
        for img_name in org_images:
            img_path = self.base_dir / "public" / "images" / img_name
            if img_path.exists():
                print(f"   Processing: {img_name} ({self.get_file_size(img_path) / 1024:.1f}KB)")
                
                original_size = self.get_file_size(img_path)
                self.stats["original_size"] += original_size
                
                # Optimize for web (smaller organizations logos)
                output_dir = self.optimized_dir / "images"
                base_name = img_path.stem
                
                # Create web-optimized version
                optimized_path = output_dir / f"{base_name}-optimized{img_path.suffix}"
                if self.optimize_image(img_path, optimized_path, quality=80, max_width=300):
                    self.stats["optimized_size"] += self.get_file_size(optimized_path)
                    
                    # Create WebP
                    webp_path = output_dir / f"{base_name}-optimized.webp"
                    if self.create_webp(optimized_path, webp_path, quality=80):
                        self.stats["webp_created"] += 1
                        
                self.stats["files_processed"] += 1
                
    def optimize_achievement_images(self):
        """Optimize achievement gallery images"""
        print("🏆 Optimizing achievement images...")
        
        achievement_dirs = [
            "public/achievements/eneda",
            "public/achievements/excalicode", 
            "public/achievements/GP"
        ]
        
        for dir_path in achievement_dirs:
            full_dir = self.base_dir / dir_path
            if full_dir.exists():
                for img_path in full_dir.glob("*.jpg"):
                    print(f"   Processing: {img_path.name} ({self.get_file_size(img_path) / 1024:.1f}KB)")
                    
                    original_size = self.get_file_size(img_path)
                    self.stats["original_size"] += original_size
                    
                    # Create output directory structure
                    rel_dir = Path(dir_path).relative_to("public")
                    output_dir = self.optimized_dir / rel_dir
                    
                    base_name = img_path.stem
                    variants = self.create_responsive_variants(img_path, output_dir, base_name)
                    
                    # Update stats
                    for size_file, file_size in variants.items():
                        if not size_file.endswith('.webp'):
                            self.stats["optimized_size"] += file_size
                            
                    self.stats["files_processed"] += 1
                    
    def optimize_project_images(self):
        """Optimize project screenshot images"""
        print("💼 Optimizing project images...")
        
        project_images = ["ODRS.png"]
        
        for img_name in project_images:
            img_path = self.base_dir / "public" / "images" / img_name
            if img_path.exists():
                print(f"   Processing: {img_name} ({self.get_file_size(img_path) / 1024:.1f}KB)")
                
                original_size = self.get_file_size(img_path)
                self.stats["original_size"] += original_size
                
                output_dir = self.optimized_dir / "images"
                base_name = img_path.stem
                variants = self.create_responsive_variants(img_path, output_dir, base_name)
                
                # Update stats
                for size_file, file_size in variants.items():
                    if not size_file.endswith('.webp'):
                        self.stats["optimized_size"] += file_size
                        
                self.stats["files_processed"] += 1
                
    def generate_stats_report(self):
        """Generate optimization statistics"""
        original_mb = self.stats["original_size"] / 1024 / 1024
        optimized_mb = self.stats["optimized_size"] / 1024 / 1024
        savings = ((self.stats["original_size"] - self.stats["optimized_size"]) / self.stats["original_size"]) * 100
        
        print("\n" + "="*50)
        print("📊 IMAGE OPTIMIZATION RESULTS")
        print("="*50)
        print(f"Files processed: {self.stats['files_processed']}")
        print(f"WebP files created: {self.stats['webp_created']}")
        print(f"Original total size: {original_mb:.1f}MB")
        print(f"Optimized total size: {optimized_mb:.1f}MB")
        print(f"Space saved: {savings:.1f}%")
        print("="*50)
        
        # Save stats to file
        stats_file = self.optimized_dir / "optimization-stats.json"
        with open(stats_file, 'w') as f:
            json.dump(self.stats, f, indent=2)
            
    def run_optimization(self):
        """Run full image optimization process"""
        print("🚀 Starting image optimization process...")
        
        self.create_directories()
        self.optimize_avatar_images()
        self.optimize_organization_images()
        self.optimize_achievement_images()
        self.optimize_project_images()
        self.generate_stats_report()
        
        print("\n✅ Image optimization complete!")
        print(f"📁 Optimized images saved to: {self.optimized_dir}")

if __name__ == "__main__":
    optimizer = ImageOptimizer()
    optimizer.run_optimization()


